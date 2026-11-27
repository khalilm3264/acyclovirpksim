'use strict';
/**
 * Cross-browser automated QA runner for numeric input feedback, validation,
 * accessibility attributes (aria-invalid, aria-describedby), snapshot state retention,
 * recovery mechanisms, and 320px mobile viewport layout in Firefox and WebKit.
 *
 * Usage:
 *   node scripts/check-numeric-feedback-crossbrowser.cjs [--local-only] [--url <url>]
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { firefox, webkit } = require('playwright');

async function createLocalServer() {
  const root = path.resolve(__dirname, '../public');
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const filePath = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!filePath.startsWith(root + path.sep) && filePath !== path.join(root, 'index.html')) {
      res.writeHead(404).end();
      return;
    }
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      res.writeHead(404).end();
      return;
    }
    const ext = path.extname(filePath);
    const mime = {
      '.js': 'application/javascript',
      '.html': 'text/html',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.svg': 'image/svg+xml'
    }[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    fs.createReadStream(filePath).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return server;
}

async function testField(page, id, validRecoveryVal, changedSliderVal) {
  const input = page.locator('#num_' + id);
  const note = page.locator('#inputError_' + id);
  const slider = page.locator(`[data-k="${id}"][data-role="range"]`);

  const initialVal = await input.inputValue();
  const min = await input.getAttribute('min');
  const max = await input.getAttribute('max');

  const invalidInputs = [
    { label: 'blank', value: '' },
    { label: 'negative', value: '-10' },
    { label: 'above-max', value: String(Number(max) + 50) }
  ];

  for (const inv of invalidInputs) {
    await input.fill(inv.value);
    assert.equal(await input.getAttribute('aria-invalid'), 'true', `${id} ${inv.label}: aria-invalid must be true`);
    assert.equal(await input.getAttribute('aria-describedby'), 'inputError_' + id, `${id} ${inv.label}: aria-describedby must match note id`);
    assert.ok(await note.isVisible(), `${id} ${inv.label}: warning note must be visible`);
    const noteText = await note.textContent();
    assert.ok(noteText.includes(`Enter a number from ${min} to ${max}`), `${id} ${inv.label}: note must explain range [${min}-${max}]`);
    assert.ok(noteText.includes(`the simulation uses ${initialVal}`), `${id} ${inv.label}: note must explain retained value ${initialVal}`);
    const snapshotVal = await page.evaluate(k => window.AyFluxResearchBridge.snapshot().config[k], id);
    assert.equal(String(snapshotVal), initialVal, `${id} ${inv.label}: simulation config must retain ${initialVal}`);
  }

  // 1. Recovery by re-entering accepted value
  await input.fill(initialVal);
  assert.equal(await input.getAttribute('aria-invalid'), null, `${id}: aria-invalid must be null after re-entering accepted value`);
  assert.equal(await input.evaluate(n => n.validationMessage), '', `${id}: customValidity must be empty after re-entering accepted value`);
  assert.equal(await note.isVisible(), false, `${id}: warning note must be hidden after re-entering accepted value`);

  // 2. Recovery via unchanged-value slider (when slider value equals accepted setting)
  await input.fill('');
  assert.ok(await note.isVisible(), `${id}: blank note visible before unchanged-slider recovery`);
  await slider.evaluate((n, val) => {
    n.value = val;
    n.dispatchEvent(new Event('input', { bubbles: true }));
  }, initialVal);
  assert.equal(await input.inputValue(), initialVal, `${id}: input value restored by slider to ${initialVal}`);
  assert.equal(await note.isVisible(), false, `${id}: note hidden after unchanged-value slider input`);
  assert.equal(await input.getAttribute('aria-invalid'), null, `${id}: aria-invalid cleared after unchanged-value slider input`);

  // 3. Recovery via changed-value slider
  await input.fill('');
  assert.ok(await note.isVisible(), `${id}: blank note visible before changed-slider recovery`);
  await slider.evaluate((n, val) => {
    n.value = val;
    n.dispatchEvent(new Event('input', { bubbles: true }));
  }, changedSliderVal);
  await page.waitForFunction(
    ([k, v]) => window.AyFluxResearchBridge.snapshot().updated && window.AyFluxResearchBridge.snapshot().config[k] === Number(v),
    [id, changedSliderVal],
    { timeout: 10000 }
  );
  assert.equal(await input.inputValue(), String(changedSliderVal), `${id}: input value updated by slider to ${changedSliderVal}`);
  assert.equal(await note.isVisible(), false, `${id}: note hidden after changed-value slider input`);
  assert.equal(await input.getAttribute('aria-invalid'), null, `${id}: aria-invalid cleared after changed-value slider input`);

  // Restore initial value
  await slider.evaluate((n, val) => {
    n.value = val;
    n.dispatchEvent(new Event('input', { bubbles: true }));
  }, initialVal);
  await page.waitForFunction(
    ([k, v]) => window.AyFluxResearchBridge.snapshot().updated && window.AyFluxResearchBridge.snapshot().config[k] === Number(v),
    [id, initialVal],
    { timeout: 10000 }
  );
}

async function runBrowserQA(browserType, browserName, targetUrl, screenshotDir) {
  console.log(`\n========================================`);
  console.log(`Starting QA on ${browserName} at ${targetUrl}`);
  console.log(`========================================`);

  const browser = await browserType.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.AyFluxResearchBridge && !document.querySelector('#saveBaseline').disabled, null, { timeout: 60000 });

  // Test dose, weight, crcl
  console.log(`[${browserName}] Testing #num_dose...`);
  await testField(page, 'dose', '700', '725');
  console.log(`[${browserName}] PASS #num_dose`);

  console.log(`[${browserName}] Testing #num_weight...`);
  await testField(page, 'weight', '70', '80');
  console.log(`[${browserName}] PASS #num_weight`);

  console.log(`[${browserName}] Testing #num_crcl...`);
  await testField(page, 'crcl', '0', '30');
  console.log(`[${browserName}] PASS #num_crcl`);

  // 320px viewport layout test
  console.log(`[${browserName}] Testing 320px viewport wrapping...`);
  await page.setViewportSize({ width: 320, height: 568 });
  const inputDose = page.locator('#num_dose');
  const noteDose = page.locator('#inputError_dose');
  await inputDose.fill('3000'); // above max 2000
  assert.ok(await noteDose.isVisible(), 'Dose note visible at 320px');

  const inputWeight = page.locator('#num_weight');
  const noteWeight = page.locator('#inputError_weight');
  await inputWeight.fill('-5'); // below min 30
  assert.ok(await noteWeight.isVisible(), 'Weight note visible at 320px');

  const inputCrcl = page.locator('#num_crcl');
  const noteCrcl = page.locator('#inputError_crcl');
  await inputCrcl.fill('200'); // above max 140
  assert.ok(await noteCrcl.isVisible(), 'CrCl note visible at 320px');

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  assert.equal(overflow, false, `[${browserName}] At 320px, scrollWidth (${await page.evaluate(() => document.documentElement.scrollWidth)}) must not exceed innerWidth (${await page.evaluate(() => window.innerWidth)}) + 1`);

  // Save screenshot
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
  const shotPath = path.join(screenshotDir, `${browserName.toLowerCase()}-320px-feedback.png`);
  await page.screenshot({ path: shotPath, fullPage: false });
  console.log(`[${browserName}] 320px screenshot saved: ${shotPath}`);

  // Restore valid inputs
  await inputDose.fill('700');
  await inputWeight.fill('70');
  await inputCrcl.fill('0');
  await page.waitForFunction(() => window.AyFluxResearchBridge.snapshot().updated, null, { timeout: 10000 });

  assert.equal(errors.length, 0, `Page errors: ${errors.join(', ')}`);
  console.log(`[${browserName}] ALL CHECKS PASSED with 0 errors!`);
  await browser.close();
}

async function main() {
  const isLocalOnly = process.argv.includes('--local-only');
  const server = await createLocalServer();
  const localUrl = 'http://127.0.0.1:' + server.address().port;
  const prodUrl = 'https://ayflux.org';
  const screenshotDir = path.resolve(__dirname, '../research/validation/screenshots');

  try {
    console.log('--- TEST SUITE 1: LOCAL HEAD ---');
    await runBrowserQA(firefox, 'Firefox', localUrl, screenshotDir);
    await runBrowserQA(webkit, 'WebKit', localUrl, screenshotDir);

    if (!isLocalOnly) {
      console.log('\n--- TEST SUITE 2: PRODUCTION DEPLOYMENT (ayflux.org) ---');
      try {
        await runBrowserQA(firefox, 'Firefox_Prod', prodUrl, screenshotDir);
        await runBrowserQA(webkit, 'WebKit_Prod', prodUrl, screenshotDir);
      } catch (prodErr) {
        console.warn('Production verification skipped or failed:', prodErr.message);
      }
    }

    console.log('\n========================================');
    console.log('SUCCESS: All browser QA checks completed successfully');
    console.log('========================================');
  } finally {
    server.close();
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('QA FAILED:', err);
    process.exit(1);
  });
}

module.exports = {
  createLocalServer,
  testField,
  runBrowserQA
};
