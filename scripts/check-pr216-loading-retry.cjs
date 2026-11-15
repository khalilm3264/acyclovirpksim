'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { webkit, devices } = require('playwright');

const PROFILES = [
  {
    key: 'iphone',
    name: 'iPhone 14 (Mobile Safari iOS 16.0)',
    viewport: { width: 390, height: 664 },
    landscape: { width: 664, height: 390 },
    scale: 3,
    userAgent: devices['iPhone 14']?.userAgent || 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
  },
  {
    key: 'ipad',
    name: 'iPad Pro 11 (Tablet Safari iPadOS 12.2)',
    viewport: { width: 834, height: 1194 },
    landscape: { width: 1194, height: 834 },
    scale: 2,
    userAgent: devices['iPad Pro 11']?.userAgent || 'Mozilla/5.0 (iPad; CPU OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari/604.1'
  }
];

const SCREENSHOT_DIR = path.resolve(__dirname, '../research/validation/results/screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function createServer() {
  const root = path.resolve(__dirname, '../public');
  const server = http.createServer((req, res) => {
    let pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname.endsWith('/')) pathname += 'index.html';
    let file = path.resolve(root, '.' + pathname);
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!file.startsWith(root + path.sep) || !fs.statSync(file, { throwIfNoEntry: false })?.isFile()) {
      res.writeHead(404).end('Not Found');
      return;
    }
    res.setHeader('Content-Type', ({ '.js': 'application/javascript', '.html': 'text/html', '.css': 'text/css' })[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  return server;
}

async function runCase1(browser, profile, baseUrl) {
  console.log(`\n--- [Case 1] Hold download, enter 5, change to 10, rotate, release on ${profile.name} ---`);
  const context = await browser.newContext({
    viewport: profile.viewport,
    deviceScaleFactor: profile.scale,
    isMobile: true,
    hasTouch: true,
    userAgent: profile.userAgent,
    serviceWorkers: 'block'
  });
  const page = await context.newPage();

  let releaseECharts;
  const echartsGate = new Promise(r => { releaseECharts = r; });

  await page.route('**/assets/vendor/echarts*.js', async route => {
    await echartsGate;
    await route.continue();
  });

  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
  await page.locator('#plasmaChart').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => !document.getElementById('saveBaseline').disabled);

  // Open summaryMore to access #timeAboveLevel and comparisonPanel for scenario multiples
  await page.locator('#summaryMore summary').click();
  await page.locator('#comparisonPanel summary').click();

  const thresholdField = page.getByLabel('Plasma acyclovir threshold', { exact: true });
  console.log('  1. Entering 5 mg/L while loading...');
  await thresholdField.fill('5');

  console.log('  2. Changing to 10 mg/L while loading...');
  await thresholdField.fill('10');

  console.log(`  3. Rotating to landscape (${profile.landscape.width}x${profile.landscape.height})...`);
  await page.setViewportSize(profile.landscape);

  console.log('  4. Releasing chart download gate...');
  releaseECharts();

  // Scroll to plasmaChart to trigger IntersectionObserver render
  await page.locator('#plasmaChart').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => {
    const chart = window.echarts?.getInstanceByDom(document.getElementById('plasmaChart'));
    const status = document.getElementById('plasmaChart')?.querySelector('.chart-status');
    return chart && !status;
  }, { timeout: 15000 });

  const plasmaState = await page.evaluate(() => {
    const chart = echarts.getInstanceByDom(document.getElementById('plasmaChart'));
    const opt = chart.getOption();
    const line = opt.series.find(s => s.id === 'entered-plasma-threshold');
    const lineCount = opt.series.filter(s => s.id === 'entered-plasma-threshold').length;
    const status = document.getElementById('plasmaChart')?.querySelector('.chart-status');
    return {
      lineCount,
      value: line?.data[0][1],
      label: line?.markLine?.label?.formatter,
      legendHasThreshold: opt.legend[0]?.data.includes('Entered plasma ACV threshold, 10 mg/L'),
      hasStatus: !!status
    };
  });

  // Check scenario comparisons in #multipleCharts
  await page.locator('#multipleCharts').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => {
    const area = document.getElementById('multipleCharts');
    return area && area.children.length && [...area.children].every(el => window.echarts?.getInstanceByDom(el));
  }, { timeout: 15000 });

  const multiplesState = await page.evaluate(() => {
    const area = document.getElementById('multipleCharts');
    return [...area.children].map(el => {
      const c = echarts.getInstanceByDom(el);
      const opt = c.getOption();
      const line = opt.series.find(s => s.id === 'entered-plasma-threshold');
      return {
        mode: el.dataset.mode,
        lineCount: opt.series.filter(s => s.id === 'entered-plasma-threshold').length,
        value: line?.data[0][1],
        label: line?.markLine?.label?.formatter,
        unit: opt.yAxis[0]?.name
      };
    });
  });

  console.log(`     Main plasma chart: lineCount=${plasmaState.lineCount}, value=${plasmaState.value}, label="${plasmaState.label}"`);
  multiplesState.forEach(m => {
    console.log(`     Comparison [${m.mode}]: lineCount=${m.lineCount}, value=${m.value}, label="${m.label}", unit="${m.unit}"`);
  });

  assert.equal(plasmaState.lineCount, 1, 'Exactly one threshold line on main plasma chart');
  assert.equal(plasmaState.value, 10, 'Main chart threshold value must be 10 mg/L');
  assert.equal(plasmaState.label, 'Threshold 10 mg/L');
  assert.equal(plasmaState.legendHasThreshold, true);
  assert.equal(plasmaState.hasStatus, false);

  assert.ok(multiplesState.length > 0, 'Scenario comparison charts must exist');
  for (const m of multiplesState) {
    assert.equal(m.lineCount, 1, `Comparison chart [${m.mode}] must have exactly one threshold line`);
    assert.equal(m.value, 10, `Comparison chart [${m.mode}] threshold value must be 10 mg/L`);
    assert.equal(m.label, 'Threshold 10 mg/L');
  }

  const shotPath = path.join(SCREENSHOT_DIR, `pr216-case1-${profile.key}.png`);
  await page.locator('#plasmaChart').screenshot({ path: shotPath });
  console.log(`     ✓ Case 1 PASSED on ${profile.name}`);

  await context.close();
  return {
    passed: true,
    mainChart: { lineCount: plasmaState.lineCount, value: plasmaState.value, label: plasmaState.label },
    multiplesCount: multiplesState.length,
    multiples: multiplesState
  };
}

async function runCase2(browser, profile, baseUrl) {
  console.log(`\n--- [Case 2] Enter threshold, fail download, clear field, restore & retry on ${profile.name} ---`);
  const context = await browser.newContext({
    viewport: profile.viewport,
    deviceScaleFactor: profile.scale,
    isMobile: true,
    hasTouch: true,
    userAgent: profile.userAgent,
    serviceWorkers: 'block'
  });
  const page = await context.newPage();

  let failECharts = true;
  await page.route('**/assets/vendor/echarts*.js', async route => {
    if (failECharts) {
      await route.abort();
    } else {
      await route.continue();
    }
  });

  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
  await page.locator('#plasmaChart').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => !document.getElementById('saveBaseline').disabled);

  // 1. Enter a threshold
  await page.locator('#summaryMore summary').click();
  const thresholdField = page.getByLabel('Plasma acyclovir threshold', { exact: true });
  console.log('  1. Entering threshold (10 mg/L)...');
  await thresholdField.fill('10');

  // 2. Fail download (verify error status)
  await page.waitForFunction(() => {
    const status = document.getElementById('plasmaChart')?.querySelector('.chart-status');
    return status && status.textContent.includes('Chart unavailable');
  });
  console.log('  2. Failure state confirmed on #plasmaChart');

  // 3. Clear the field
  console.log('  3. Clearing the threshold field...');
  await thresholdField.fill('');

  // 4. Restore the download
  console.log('  4. Restoring ECharts download...');
  failECharts = false;

  // 5. Retry (modify dose to trigger recalculation and retry)
  console.log('  5. Retrying with updated dose (750 mg)...');
  await page.locator('#num_dose').fill('750');
  await page.locator('#plasmaChart').scrollIntoViewIfNeeded();

  await page.waitForFunction(() => {
    const chart = window.echarts?.getInstanceByDom(document.getElementById('plasmaChart'));
    const status = document.getElementById('plasmaChart')?.querySelector('.chart-status');
    return chart && !status;
  }, { timeout: 15000 });

  const state = await page.evaluate(() => {
    const chart = echarts.getInstanceByDom(document.getElementById('plasmaChart'));
    const opt = chart.getOption();
    const thresholdLine = opt.series.find(s => s.id === 'entered-plasma-threshold');
    const status = document.getElementById('plasmaChart')?.querySelector('.chart-status');
    return {
      hasThresholdLine: !!thresholdLine,
      legendHasThreshold: opt.legend[0]?.data.some(n => n && n.includes('Entered plasma ACV threshold')),
      hasStatus: !!status,
      seriesNames: opt.series.map(s => s.name).filter(Boolean)
    };
  });

  console.log(`     Updated curve rendered: series=[${state.seriesNames.join(', ')}]`);
  console.log(`     Cleared line present: ${state.hasThresholdLine}, Legend has threshold: ${state.legendHasThreshold}, Status present: ${state.hasStatus}`);

  assert.equal(state.hasThresholdLine, false, 'Cleared line must be gone');
  assert.equal(state.legendHasThreshold, false, 'Legend entry must be gone');
  assert.equal(state.hasStatus, false, 'Loading message must be gone');

  const shotPath = path.join(SCREENSHOT_DIR, `pr216-case2-${profile.key}.png`);
  await page.locator('#plasmaChart').screenshot({ path: shotPath });
  console.log(`     ✓ Case 2 PASSED on ${profile.name}`);

  await context.close();
  return {
    passed: true,
    hasThresholdLine: state.hasThresholdLine,
    legendHasThreshold: state.legendHasThreshold,
    hasStatus: state.hasStatus,
    seriesNames: state.seriesNames
  };
}

async function runCase3(browser, profile, baseUrl) {
  console.log(`\n--- [Case 3] Enter 5 mg/L, switch to µmol/L while loading, release on ${profile.name} ---`);
  const context = await browser.newContext({
    viewport: profile.viewport,
    deviceScaleFactor: profile.scale,
    isMobile: true,
    hasTouch: true,
    userAgent: profile.userAgent,
    serviceWorkers: 'block'
  });
  const page = await context.newPage();

  let releaseECharts;
  const echartsGate = new Promise(r => { releaseECharts = r; });

  await page.route('**/assets/vendor/echarts*.js', async route => {
    await echartsGate;
    await route.continue();
  });

  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
  await page.locator('#plasmaChart').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => !document.getElementById('saveBaseline').disabled);

  // Open panels
  await page.locator('#summaryMore summary').click();
  await page.locator('#comparisonPanel summary').click();

  const thresholdField = page.getByLabel('Plasma acyclovir threshold', { exact: true });
  console.log('  1. Entering 5 mg/L while loading...');
  await thresholdField.fill('5');

  console.log('  2. Switching to µmol/L while loading...');
  await page.selectOption('#concUnit', 'umol');

  console.log('  3. Releasing chart download gate...');
  releaseECharts();

  await page.locator('#plasmaChart').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => {
    const chart = window.echarts?.getInstanceByDom(document.getElementById('plasmaChart'));
    const status = document.getElementById('plasmaChart')?.querySelector('.chart-status');
    return chart && !status;
  }, { timeout: 15000 });

  const plasmaState = await page.evaluate(() => {
    const chart = echarts.getInstanceByDom(document.getElementById('plasmaChart'));
    const opt = chart.getOption();
    const line = opt.series.find(s => s.id === 'entered-plasma-threshold');
    const inputVal = document.getElementById('timeAboveLevel').value;
    const unitText = document.getElementById('timeAboveUnit').textContent;
    return {
      lineCount: opt.series.filter(s => s.id === 'entered-plasma-threshold').length,
      value: line?.data[0][1],
      label: line?.markLine?.label?.formatter,
      legendHasThreshold: opt.legend[0]?.data.some(n => n && n.includes('Entered plasma ACV threshold')),
      yAxisName: opt.yAxis[0]?.name,
      inputVal,
      unitText
    };
  });

  await page.locator('#multipleCharts').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => {
    const area = document.getElementById('multipleCharts');
    return area && area.children.length && [...area.children].every(el => window.echarts?.getInstanceByDom(el));
  }, { timeout: 15000 });

  const multiplesState = await page.evaluate(() => {
    const area = document.getElementById('multipleCharts');
    return [...area.children].map(el => {
      const c = echarts.getInstanceByDom(el);
      const opt = c.getOption();
      const line = opt.series.find(s => s.id === 'entered-plasma-threshold');
      return {
        mode: el.dataset.mode,
        lineCount: opt.series.filter(s => s.id === 'entered-plasma-threshold').length,
        value: line?.data[0][1],
        label: line?.markLine?.label?.formatter,
        unit: opt.yAxis[0]?.name
      };
    });
  });

  const expectedUmol = 5 * 1000 / 225.21; // ~22.2015
  console.log(`     Main plasma chart: value=${plasmaState.value?.toFixed(4)} µmol/L (expected ~${expectedUmol.toFixed(4)}), label="${plasmaState.label}", yAxis="${plasmaState.yAxisName}"`);
  multiplesState.forEach(m => {
    console.log(`     Comparison [${m.mode}]: value=${m.value} mg/L, label="${m.label}", yAxis="${m.unit}"`);
  });

  assert.equal(plasmaState.lineCount, 1, 'Main chart must have 1 threshold line');
  assert.ok(Math.abs(plasmaState.value - expectedUmol) < 0.05, `Main chart reads ~22.2 µmol/L (got ${plasmaState.value})`);
  assert.match(plasmaState.label, /22\.2/);
  assert.match(plasmaState.yAxisName, /µmol\/L/);

  assert.ok(multiplesState.length > 0, 'Comparison charts must exist');
  for (const m of multiplesState) {
    assert.equal(m.lineCount, 1, `Comparison chart [${m.mode}] must have 1 threshold line`);
    assert.equal(m.value, 5, `Comparison chart [${m.mode}] must still read 5 mg/L`);
    assert.equal(m.label, 'Threshold 5 mg/L');
    assert.match(m.unit, /mg\/L/);
  }

  const shotPath = path.join(SCREENSHOT_DIR, `pr216-case3-${profile.key}.png`);
  await page.locator('#plasmaChart').screenshot({ path: shotPath });
  console.log(`     ✓ Case 3 PASSED on ${profile.name}`);

  await context.close();
  return {
    passed: true,
    mainChart: { value: plasmaState.value, label: plasmaState.label, yAxis: plasmaState.yAxisName },
    multiplesCount: multiplesState.length,
    multiples: multiplesState
  };
}

async function main() {
  const server = await createServer();
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  console.log(`========================================================================`);
  console.log(`PR #216 PLASMA THRESHOLD LOADING & RETRY QA (${baseUrl})`);
  console.log(`========================================================================`);

  const browser = await webkit.launch({ headless: true });
  const allResults = {};

  try {
    for (const profile of PROFILES) {
      console.log(`\n>>> EXECUTING AUDIT ON ${profile.name} <<<`);
      allResults[profile.key] = {
        name: profile.name,
        case1: await runCase1(browser, profile, baseUrl),
        case2: await runCase2(browser, profile, baseUrl),
        case3: await runCase3(browser, profile, baseUrl)
      };
    }

    console.log(`\n========================================================================`);
    console.log(`ALL 6 CASE/DEVICE AUDITS COMPLETED SUCCESSFULLY!`);
    console.log(`========================================================================\n`);

    for (const [key, res] of Object.entries(allResults)) {
      console.log(`[PASS] ${res.name}:`);
      console.log(`       Case 1 (Hold, 5->10 mg/L, rotate, release): Exactly 1 line at 10 mg/L on main and all comparison charts.`);
      console.log(`       Case 2 (Threshold, fail, clear, retry):     Updated curve renders, cleared line/legend/loading all gone.`);
      console.log(`       Case 3 (5 mg/L, switch to µmol/L, release): Main chart reads ~22.2 µmol/L; comparison charts retain 5 mg/L.\n`);
    }

    return allResults;
  } finally {
    await browser.close();
    server.close();
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('\n❌ AUDIT EXECUTION FAILED:');
    console.error(err);
    process.exit(1);
  });
}

module.exports = { main };
