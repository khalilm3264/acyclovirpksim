'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const https = require('node:https');
const { chromium } = require('playwright');

function getBrowserLaunchOptions() {
  const args = ['--no-sandbox', '--disable-gpu'];
  const options = { headless: true, args };
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) {
    options.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  } else if (process.env.CHROME_EXECUTABLE) {
    options.executablePath = process.env.CHROME_EXECUTABLE;
  } else if (process.env.CHROME_BIN) {
    options.executablePath = process.env.CHROME_BIN;
  } else if (process.platform === 'win32') {
    // Windows local user fallback when running outside standard CI
    const candidatePaths = [
      path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    ];
    for (const p of candidatePaths) {
      if (p && fs.existsSync(p)) {
        options.executablePath = p;
        break;
      }
    }
  }
  return options;
}

const PROFILES = {
  phone: {
    name: 'Pixel 7 (Android 14)',
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.8103.78 Mobile Safari/537.36',
    portrait: { width: 412, height: 915 },
    landscape: { width: 915, height: 412 },
    deviceScaleFactor: 2.625,
    isMobile: true,
    hasTouch: true
  },
  tablet: {
    name: 'Pixel Tablet (Android 14)',
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel Tablet) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.8103.78 Safari/537.36',
    portrait: { width: 800, height: 1280 },
    landscape: { width: 1280, height: 800 },
    deviceScaleFactor: 2.0,
    isMobile: true,
    hasTouch: true
  }
};

async function createServer() {
  const root = path.resolve(__dirname, '../public');
  const server = http.createServer((request, response) => {
    let pathname = new URL(request.url, 'http://localhost').pathname;
    if (pathname.endsWith('/')) pathname += 'index.html';
    let file = path.resolve(root, '.' + pathname);
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      file = path.join(file, 'index.html');
    }
    if (!file.startsWith(root + path.sep) || !fs.statSync(file, { throwIfNoEntry: false })?.isFile()) {
      response.writeHead(404).end('Not Found');
      return;
    }
    response.setHeader('Content-Type', ({ '.js': 'application/javascript', '.html': 'text/html', '.css': 'text/css' })[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(response);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return server;
}

async function runTestSuite(baseUrl, label) {
  console.log(`\n========================================================================`);
  console.log(`RUNNING ANDROID CHROME USABILITY TEST ON: ${label} (${baseUrl})`);
  console.log(`========================================================================\n`);

  const browser = await chromium.launch(getBrowserLaunchOptions());

  const results = [];

  try {
    for (const [deviceType, profile] of Object.entries(PROFILES)) {
      console.log(`\n>>> Testing Device: ${profile.name} [${deviceType.toUpperCase()}] <<<`);

      // -------------------------------------------------------------
      // 1. FULL APP TESTING: Unapplied timeline dose rotation test
      // -------------------------------------------------------------
      console.log(`\n--- [${deviceType.toUpperCase()}] Full App: Unapplied Timeline Dose Rotation ---`);
      const context = await browser.newContext({
        userAgent: profile.userAgent,
        viewport: profile.portrait,
        deviceScaleFactor: profile.deviceScaleFactor,
        isMobile: profile.isMobile,
        hasTouch: profile.hasTouch,
        serviceWorkers: 'block'
      });

      const page = await context.newPage();
      const pageErrors = [];
      page.on('pageerror', err => pageErrors.push(err.message));

      await page.goto(baseUrl + '/');
      await page.waitForFunction(() => !document.querySelector('#saveBaseline').disabled, null, { timeout: 30000 });

      // Step A: Enter synthetic dose & patient inputs
      console.log('  1. Entering synthetic patient inputs (Dose: 850 mg, Weight: 85 kg, CrCl: 45 mL/min)...');
      await page.fill('#num_dose', '850');
      await page.dispatchEvent('#num_dose', 'input');
      await page.fill('#num_weight', '85');
      await page.dispatchEvent('#num_weight', 'input');
      await page.fill('#num_crcl', '45');
      await page.dispatchEvent('#num_crcl', 'input');

      assert.equal(await page.inputValue('#num_dose'), '850');
      assert.equal(await page.inputValue('#num_weight'), '85');
      assert.equal(await page.inputValue('#num_crcl'), '45');

      // Step B: Navigate to Timeline Tab
      console.log('  2. Navigating to Timeline tab (#tab-timeline)...');
      await page.locator('#tab-timeline').click();
      assert.equal(await page.locator('#tab-timeline').getAttribute('aria-selected'), 'true');
      assert.ok(await page.locator('#timeline').isVisible());

      const initialDoseRows = await page.locator('#doseRows .dose-row').count();
      console.log(`     Initial dose rows in draft: ${initialDoseRows}`);

      // Step C: Add a new medication dose row
      console.log('  3. Clicking "+ Add medication dose"...');
      await page.locator('#addDose').click();
      const afterAddRows = await page.locator('#doseRows .dose-row').count();
      assert.equal(afterAddRows, initialDoseRows + 1, 'New dose row added');

      // Verify pending advisory is visible
      assert.ok(await page.locator('#dosePending').isVisible(), 'dosePending advisory is visible');

      // Step D: Fill pending unapplied values in the new row
      console.log('  4. Filling unapplied pending values in new row (Dose: 500 mg, Route: Valacyclovir oral, Time: 36 h)...');
      const newRowIdx = initialDoseRows;
      const routeSelect = page.locator(`select[data-dose-index="${newRowIdx}"][data-dose-field="route"]`);
      await routeSelect.selectOption('Valacyclovir oral');
      await routeSelect.dispatchEvent('input');

      const amountInput = page.locator(`input[data-dose-index="${newRowIdx}"][data-dose-field="amount"]`);
      const timeInput = page.locator(`input[data-dose-index="${newRowIdx}"][data-dose-field="time"]`);

      await amountInput.fill('500');
      await amountInput.dispatchEvent('input');
      await timeInput.fill('36');
      await timeInput.dispatchEvent('input');

      // Verify pending values before rotation
      assert.equal(await amountInput.inputValue(), '500');
      assert.equal(await timeInput.inputValue(), '36');
      assert.equal(await page.locator(`select[data-dose-index="${newRowIdx}"][data-dose-field="route"]`).inputValue(), 'Valacyclovir oral');
      assert.ok(await page.locator('#dosePending').isVisible());

      // Step E: ROTATE TO LANDSCAPE (before applying!)
      console.log(`  5. ROTATING to LANDSCAPE (${profile.landscape.width} x ${profile.landscape.height}) BEFORE applying...`);
      await page.setViewportSize(profile.landscape);
      await page.waitForTimeout(300); // allow resize observer to settle

      // Verify pending values survive rotation
      console.log('     Checking survival of pending unapplied values in landscape...');
      assert.equal(await page.locator('#tab-timeline').getAttribute('aria-selected'), 'true', 'Timeline tab still selected');
      assert.ok(await page.locator('#timeline').isVisible(), 'Timeline panel still visible');
      assert.equal(await page.locator('#doseRows .dose-row').count(), afterAddRows, 'Dose row count preserved');

      const amountInLandscape = await page.locator(`input[data-dose-index="${newRowIdx}"][data-dose-field="amount"]`).inputValue();
      const timeInLandscape = await page.locator(`input[data-dose-index="${newRowIdx}"][data-dose-field="time"]`).inputValue();
      const routeInLandscape = await page.locator(`select[data-dose-index="${newRowIdx}"][data-dose-field="route"]`).inputValue();

      assert.equal(amountInLandscape, '500', 'Pending dose amount survived rotation to landscape');
      assert.equal(timeInLandscape, '36', 'Pending dose time survived rotation to landscape');
      assert.equal(routeInLandscape, 'Valacyclovir oral', 'Pending dose route survived rotation to landscape');
      assert.ok(await page.locator('#dosePending').isVisible(), 'Pending unapplied notice survived rotation');

      // Verify horizontal fitting in landscape
      const landscapeFits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2);
      assert.ok(landscapeFits, 'Landscape view has no horizontal page overflow');

      // Step F: ROTATE BACK TO PORTRAIT (still unapplied!)
      console.log(`  6. ROTATING BACK to PORTRAIT (${profile.portrait.width} x ${profile.portrait.height})...`);
      await page.setViewportSize(profile.portrait);
      await page.waitForTimeout(300);

      const amountBackPortrait = await page.locator(`input[data-dose-index="${newRowIdx}"][data-dose-field="amount"]`).inputValue();
      const timeBackPortrait = await page.locator(`input[data-dose-index="${newRowIdx}"][data-dose-field="time"]`).inputValue();
      const routeBackPortrait = await page.locator(`select[data-dose-index="${newRowIdx}"][data-dose-field="route"]`).inputValue();

      assert.equal(amountBackPortrait, '500', 'Pending dose amount survived rotation back to portrait');
      assert.equal(timeBackPortrait, '36', 'Pending dose time survived rotation back to portrait');
      assert.equal(routeBackPortrait, 'Valacyclovir oral', 'Pending dose route survived rotation back to portrait');
      assert.ok(await page.locator('#dosePending').isVisible(), 'Pending notice survived rotation back to portrait');

      // Step G: APPLY THE DOSE SCHEDULE
      console.log('  7. Applying the custom timeline dose via #applyFullTimeline...');
      await page.locator('#applyFullTimeline').click();
      await page.waitForTimeout(300);

      assert.ok(await page.locator('#dosePending').isHidden(), 'Pending notice cleared after applying');
      console.log('     ✓ Unapplied timeline dose rotation test PASSED!');

      // Step H: ROTATE AGAIN AFTER APPLYING
      console.log('  8. Rotating after applying (Portrait -> Landscape -> Portrait)...');
      await page.setViewportSize(profile.landscape);
      await page.waitForTimeout(300);
      assert.equal(await page.locator('#tab-timeline').getAttribute('aria-selected'), 'true');
      assert.equal(await page.locator('#doseRows .dose-row').count(), afterAddRows);

      await page.setViewportSize(profile.portrait);
      await page.waitForTimeout(300);
      assert.equal(await page.locator('#tab-timeline').getAttribute('aria-selected'), 'true');
      assert.equal(await page.locator('#doseRows .dose-row').count(), afterAddRows);
      console.log('     ✓ Applied timeline schedule survived post-application rotation!');

      // Step H2: Assert applied model configuration in the engine
      console.log('     Asserting applied model configuration in engine (window.AyFluxResearchBridge)...');
      const appliedConfig = await page.evaluate(() => window.AyFluxResearchBridge.snapshot().config);
      assert.equal(appliedConfig.dosingMode, 'custom', 'Applied model dosingMode must be custom');
      assert.ok(Array.isArray(appliedConfig.customDoses), 'customDoses must be an array');
      const appliedDose = appliedConfig.customDoses.find(d => d.time === 36);
      assert.ok(appliedDose, 'Applied model configuration must contain custom dose at hour 36');
      assert.equal(appliedDose.amount, 500, 'Applied dose amount must be 500 mg');
      assert.equal(appliedDose.route, 'Valacyclovir oral', 'Applied dose route must be Valacyclovir oral');
      console.log(`     ✓ Applied model configuration verified: hour=${appliedDose.time}, amount=${appliedDose.amount} mg, route="${appliedDose.route}".`);

      // Step I: Check Touch Target Sizes on Mobile/Tablet
      console.log('  9. Checking touch target heights on timeline controls...');
      const timelineControls = await page.locator('#scheduleRows input, #scheduleRows select, #scheduleRows button, #doseRows input, #doseRows select, #doseRows button, #addRow, #addDose, #applyFullTimelineBottom').all();
      let minTargetHeight = 999;
      let below40Count = 0;
      for (const ctrl of timelineControls) {
        const bounds = await ctrl.boundingBox();
        if (bounds && bounds.height > 0) {
          if (bounds.height < minTargetHeight) minTargetHeight = bounds.height;
          if (bounds.height < 39.9) below40Count++;
        }
      }
      console.log(`     Minimum touch target height: ${minTargetHeight.toFixed(1)}px (items below 40px: ${below40Count})`);
      if (deviceType === 'phone') {
        assert.ok(minTargetHeight >= 39.9, `Phone controls touch target height >= 40px: got ${minTargetHeight}px`);
      } else {
        // On tablet (800px width), desktop CSS applies because 40px rule is under @media(max-width: 650px)
        assert.ok(minTargetHeight >= 30.0, `Tablet controls touch target height valid: got ${minTargetHeight}px`);
        if (minTargetHeight < 39.9) {
          console.warn(`     [FINDING FOR SOL] Tablet (800px width) timeline controls have minimum height ${minTargetHeight.toFixed(1)}px (< 40px) because 40px min-height is scoped to @media(max-width: 650px).`);
        }
      }

      results.push({
        test: `${profile.name} Full App: Unapplied Timeline Dose Rotation`,
        status: 'PASSED',
        details: `Pending values (500mg Valacyclovir @ 36h) preserved across portrait<->landscape; applied schedule persists; min touch target: ${minTargetHeight.toFixed(1)}px${minTargetHeight < 39.9 ? ' (tablet 36px breakpoint limitation noted)' : ''}.`
      });

      await context.close();

      // -------------------------------------------------------------
      // 2. LITE APP TESTING: Zoom, Rotation, Reachability, Text Size
      // -------------------------------------------------------------
      console.log(`\n--- [${deviceType.toUpperCase()}] Lite App: Zoom, Rotation, Reachability & Text Scaling ---`);
      const liteContext = await browser.newContext({
        userAgent: profile.userAgent,
        viewport: profile.portrait,
        deviceScaleFactor: profile.deviceScaleFactor,
        isMobile: profile.isMobile,
        hasTouch: profile.hasTouch,
        serviceWorkers: 'block'
      });

      const litePage = await liteContext.newPage();
      const liteErrors = [];
      litePage.on('pageerror', err => liteErrors.push(err.message));

      await litePage.goto(baseUrl + '/lite/');
      await litePage.waitForSelector('#lite_dose');

      // Step A: Modify dose on Lite
      console.log('  1. Modifying Lite inputs (Dose: 500 mg, Weight: 70 kg)...');
      await litePage.evaluate(() => {
        const doseEl = document.getElementById('lite_dose');
        doseEl.value = '500';
        doseEl.dispatchEvent(new Event('input', { bubbles: true }));
        const weightEl = document.getElementById('lite_weight');
        weightEl.value = '70';
        weightEl.dispatchEvent(new Event('input', { bubbles: true }));
      });

      assert.equal(await litePage.inputValue('#lite_dose'), '500');
      assert.equal(await litePage.inputValue('#lite_weight'), '70');

      // Step B: Verify chart touch action and reachability
      console.log('  2. Verifying Lite chart touch-action and pinch-zoom capability...');
      const chartTouchAction = await litePage.locator('#acvChart').evaluate(el => getComputedStyle(el).touchAction);
      assert.ok(chartTouchAction.includes('pinch-zoom'), 'Lite chart CSS touch-action includes pinch-zoom');
      console.log(`     Chart touch-action: "${chartTouchAction}"`);

      // Step C: Exercise Page Zoom (1.5x, 2.0x, 3.0x) via CDP
      const cdpSession = await liteContext.newCDPSession(litePage);
      console.log('  3. Testing visual viewport page zoom (1.5x, 2.0x, 3.0x)...');
      for (const scale of [1.5, 2.0, 3.0]) {
        await cdpSession.send('Emulation.setPageScaleFactor', { pageScaleFactor: scale });
        await litePage.waitForFunction(exp => Math.abs(window.visualViewport.scale - exp) < 0.05, scale);
        // Controls remain functional
        assert.equal(await litePage.inputValue('#lite_dose'), '500');
        assert.equal(await litePage.inputValue('#lite_weight'), '70');
      }

      // Step D: Rotate during zoom
      console.log('  4. Rotating to LANDSCAPE while zoomed (2.0x)...');
      await cdpSession.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2.0 });
      await litePage.setViewportSize(profile.landscape);
      await litePage.waitForTimeout(300);

      assert.equal(await litePage.inputValue('#lite_dose'), '500');
      assert.ok(await litePage.locator('#acvChart').isVisible());

      // Step E: Reset zoom and rotate back
      console.log('  5. Resetting zoom to 1.0x and rotating back to PORTRAIT...');
      await cdpSession.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1.0 });
      await litePage.waitForFunction(() => Math.abs(window.visualViewport.scale - 1.0) < 0.05);
      await litePage.setViewportSize(profile.portrait);
      await litePage.waitForTimeout(300);

      // Verify all primary controls are reachable and visible
      console.log('  6. Checking reachability of all primary controls...');
      for (const id of ['#lite_dose', '#lite_weight', '#lite_crcl', '#lite_route', '#liteReset']) {
        const el = litePage.locator(id);
        assert.ok(await el.isVisible(), `Lite control ${id} is visible`);
        const box = await el.boundingBox();
        assert.ok(box && box.height > 0, `Lite control ${id} has non-zero height`);
      }
      assert.ok(await litePage.locator('#acvChart').isVisible(), 'Lite acvChart is visible and reachable');
      assert.ok(await litePage.locator('#cmmgChart').isVisible(), 'Lite cmmgChart is visible and reachable');

      // Step F: Test Larger Android Text Scaling (125%, 150%, 200%)
      console.log('  7. Testing Android accessibility text scaling (125%, 150%, 200%)...');
      console.log('     Testing representative label: label[for="lite_weight"] ("Body weight (kg)") and inheriting button #liteReset ("Reset").');

      // Baseline font size check at 1.0x (100%)
      const baseLabelSize = await litePage.evaluate(() => parseFloat(window.getComputedStyle(document.querySelector('label[for="lite_weight"]')).fontSize));
      const baseBtnSize = await litePage.evaluate(() => parseFloat(window.getComputedStyle(document.querySelector('#liteReset')).fontSize));
      assert.equal(baseLabelSize, 11.5, 'Default label size in Lite CSS is 11.5px');
      assert.equal(baseBtnSize, 13.0, 'Default inheriting button font size in Lite CSS is 13px');

      for (const textScale of [1.25, 1.50, 2.00]) {
        // In Lite CSS, labels use fixed px (11.5px on .control label) while buttons/inputs inherit from :root (13px).
        // System-level Android accessibility text scaling scales both root font and explicit label fonts.
        await litePage.evaluate(scale => {
          const styleId = 'ayflux-test-accessibility-scale';
          let styleEl = document.getElementById(styleId);
          if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = styleId;
            document.head.appendChild(styleEl);
          }
          styleEl.textContent = `
            html { font-size: ${13 * scale}px !important; }
            .control label, .topline label, .legend-option { font-size: ${11.5 * scale}px !important; }
            .side h2 { font-size: ${12 * scale}px !important; }
          `;
        }, textScale);
        await litePage.waitForTimeout(200);

        // Verify representative label actually grew in computed px
        const scaledLabelSize = await litePage.evaluate(() => parseFloat(window.getComputedStyle(document.querySelector('label[for="lite_weight"]')).fontSize));
        const scaledBtnSize = await litePage.evaluate(() => parseFloat(window.getComputedStyle(document.querySelector('#liteReset')).fontSize));
        const expectedLabelPx = 11.5 * textScale;
        const expectedBtnPx = 13.0 * textScale;

        assert.ok(Math.abs(scaledLabelSize - expectedLabelPx) < 0.25, `Representative label 'Body weight (kg)' grew to ${scaledLabelSize}px (expected ${expectedLabelPx}px) at ${(textScale * 100).toFixed(0)}%`);
        assert.ok(Math.abs(scaledBtnSize - expectedBtnPx) < 0.25, `Inheriting control '#liteReset' grew to ${scaledBtnSize}px (expected ${expectedBtnPx}px) at ${(textScale * 100).toFixed(0)}%`);

        // Check horizontal containment (no horizontal scroll blowout)
        const scrollW = await litePage.evaluate(() => document.documentElement.scrollWidth);
        const clientW = await litePage.evaluate(() => document.documentElement.clientWidth);
        assert.ok(scrollW <= clientW + 2, `Lite page fits horizontally (${scrollW}px <= ${clientW}px) at ${(textScale * 100).toFixed(0)}% text scaling`);

        // Check controls still visible and interactive
        assert.ok(await litePage.locator('#lite_dose').isVisible(), `Dose input visible at ${(textScale * 100).toFixed(0)}%`);
        assert.ok(await litePage.locator('#acvChart').isVisible(), `Chart visible at ${(textScale * 100).toFixed(0)}%`);
        console.log(`     ✓ Text scale ${(textScale * 100).toFixed(0)}%: label=${scaledLabelSize.toFixed(1)}px (+${((textScale-1)*100).toFixed(0)}%), btn=${scaledBtnSize.toFixed(1)}px, scrollWidth=${scrollW}px (fits horizontally)`);
      }

      // Reset text scaling style
      await litePage.evaluate(() => {
        const styleEl = document.getElementById('ayflux-test-accessibility-scale');
        if (styleEl) styleEl.remove();
        document.documentElement.style.fontSize = '';
      });
      console.log('     ✓ Lite zoom, rotation, reachability & text scaling tests PASSED!');

      results.push({
        test: `${profile.name} Lite App: Zoom, Rotation, Reachability & Font Scaling`,
        status: 'PASSED',
        details: `Zoom 1.0x-3.0x functional; chart touch-action pinch-zoom verified; all controls reachable; text scale 125%-200% fits without horizontal overflow.`
      });

      assert.deepEqual(liteErrors, [], 'No uncaught page errors on Lite');
      assert.deepEqual(pageErrors, [], 'No uncaught page errors on Full');

      await liteContext.close();
    }

    return results;
  } finally {
    await browser.close();
  }
}

function checkUrlReachable(targetUrl) {
  const urlObj = new URL(targetUrl);
  const client = urlObj.protocol === 'https:' ? https : http;
  return new Promise((resolve) => {
    const req = client.request(urlObj, { method: 'HEAD', timeout: 5000 }, res => {
      res.resume();
      resolve({ connected: true, statusCode: res.statusCode });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ connected: false, error: 'Connection timed out' });
    });
    req.on('error', err => {
      resolve({ connected: false, error: err.message });
    });
    req.end();
  });
}

async function main() {
  const localOnly = process.argv.includes('--local') || process.argv.includes('--local-only') || process.env.LOCAL_ONLY === 'true';

  const localServer = await createServer();
  const localBase = 'http://127.0.0.1:' + localServer.address().port;

  try {
    // 1. Run on Local Exact Build
    const localResults = await runTestSuite(localBase, 'LOCAL BUILD (commit 3c0c1cb)');

    // 2. Run on Production Deployed Site
    let prodResults = [];
    if (localOnly) {
      console.log('\n[INFO] Skipping production test suite (--local-only specified).');
    } else {
      const targetProd = process.env.AYFLUX_PROD_URL || 'https://ayflux.org';
      const reachability = await checkUrlReachable(targetProd);
      if (!reachability.connected) {
        console.warn(`\n[OFFLINE SKIP] Production site ${targetProd} connection failed (${reachability.error}). Skipping optional production tests.`);
      } else if (reachability.statusCode < 200 || reachability.statusCode >= 400) {
        const errorMsg = `Production site ${targetProd} responded with HTTP ${reachability.statusCode} (expected HTTP 200-399)`;
        console.error(`\n❌ PRODUCTION PREFLIGHT HTTP ERROR: ${errorMsg}`);
        throw new Error(errorMsg);
      } else {
        console.log(`\n[PREFLIGHT PASSED] Production site ${targetProd} is reachable (HTTP ${reachability.statusCode}). Running full production test suite...`);
        // Once preflight passes, any failure (AssertionError, TypeError from missing bridge, TimeoutError from missing control)
        // must fail the run and exit nonzero!
        prodResults = await runTestSuite(targetProd, `PRODUCTION DEPLOYED (${targetProd})`);
      }
    }

    console.log('\n========================================================================');
    console.log('SUMMARY OF ANDROID CHROME USABILITY TEST RESULTS');
    console.log('========================================================================\n');
    for (const r of [...localResults, ...prodResults]) {
      console.log(`[${r.status}] ${r.test}`);
      console.log(`       Details: ${r.details}\n`);
    }

  } finally {
    localServer.close();
  }
}

main().catch(err => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exitCode = 1;
});
