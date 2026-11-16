'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { execFileSync } = require('node:child_process');
const { webkit, devices } = require('playwright');

const PROFILES = {
  phone: {
    label: 'iPhone 14 (iOS 16.0 WebKit emulation)',
    ...devices['iPhone 14'],
    portrait: { width: 390, height: 664 },
    landscape: { width: 664, height: 390 }
  },
  tablet: {
    label: 'iPad Pro 11 (iPadOS 12.2 WebKit emulation)',
    ...devices['iPad Pro 11'],
    portrait: { width: 834, height: 1194 },
    landscape: { width: 1194, height: 834 }
  }
};

const SCREENSHOT_DIR = path.resolve(__dirname, '../research/validation/results/screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function assertStatus(page, expected, busy) {
  const state = await page.locator('#plasmaChart .chart-status').evaluate(el => {
    const box = el.getBoundingClientRect(), range = document.createRange();
    range.selectNodeContents(el);
    const rects = Array.from(range.getClientRects());
    const style = getComputedStyle(el);
    return {
      text: el.textContent, color: style.color, background: style.backgroundColor,
      busy: el.parentElement.getAttribute('aria-busy'),
      unclipped: rects.length > 0 && rects.every(r => r.left >= box.left - 1 && r.right <= box.right + 1 && r.top >= box.top - 1 && r.bottom <= box.bottom + 1),
      centered: Math.abs((range.getBoundingClientRect().left + range.getBoundingClientRect().right - box.left - box.right) / 2) <= 2,
      overflow: document.documentElement.scrollWidth > innerWidth + 2
    };
  });
  assert.equal(state.text, expected);
  assert.equal(state.color, 'rgb(40, 79, 107)');
  assert.equal(state.background, 'rgba(244, 248, 251, 0.96)');
  assert.equal(state.busy, String(busy));
  assert.ok(state.unclipped && state.centered, 'Status text must fit and be centered');
  assert.equal(state.overflow, false, 'Page must not overflow horizontally');
}

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

async function runLoadingStatesAudit() {
  const server = await createServer();
  const baseUrl = 'http://127.0.0.1:' + server.address().port;
  console.log(`\n========================================================================`);
  console.log(`MOBILE LOADING STATES AUDIT ON WEBKIT (${baseUrl})`);
  console.log(`========================================================================\n`);

  let revision = 'unavailable (source archive)';
  try { revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: path.resolve(__dirname, '..'), encoding: 'utf8' }).trim(); } catch {}
  console.log('Checkout SHA:', revision, '| WebKit executable:', webkit.executablePath());
  let browser;
  const report = [];

  try {
    browser = await webkit.launch({ headless: true });
    for (const [key, profile] of Object.entries(PROFILES)) {
      console.log(`>>> Testing Device: ${profile.label} [${key.toUpperCase()}] <<<`);

      const context = await browser.newContext({
        userAgent: profile.userAgent,
        viewport: profile.portrait,
        deviceScaleFactor: profile.deviceScaleFactor,
        isMobile: profile.isMobile,
        hasTouch: profile.hasTouch,
        serviceWorkers: 'block'
      });
      const errors = [];
      context.on('page', page => page.on('pageerror', error => errors.push(error.message)));

      // 1. Slow Calculation & Slow Chart Download & Clean Render
      console.log(`--- [1] Slow Calculation, Slow Chart Download & Clean Render ---`);
      const page = await context.newPage();
      let releaseWorker, releaseRenderer;
      const workerGate = new Promise(res => { releaseWorker = res; });
      const rendererGate = new Promise(res => { releaseRenderer = res; });

      await page.route('**/assets/simulator-worker.js', async route => {
        await workerGate;
        await route.continue();
      });
      await page.route('**/assets/vendor/echarts-6.1.0.min.js', async route => {
        await rendererGate;
        await route.continue();
      });

      const rendererRequested = page.waitForRequest('**/assets/vendor/echarts-6.1.0.min.js');
      await page.goto(baseUrl + '/', { waitUntil: 'domcontentloaded' });
      await page.locator('#plasmaChart').scrollIntoViewIfNeeded();
      await rendererRequested;

      // Check Calculating State in Portrait
      await page.waitForFunction(() => document.querySelector('#plasmaChart .chart-status') !== null, undefined, { timeout: 15000 });
      const calcMsgPortrait = await page.locator('#plasmaChart .chart-status').textContent();
      const calcColorPortrait = await page.locator('#plasmaChart .chart-status').evaluate(el => getComputedStyle(el).color);
      const calcBgPortrait = await page.locator('#plasmaChart .chart-status').evaluate(el => getComputedStyle(el).backgroundColor);
      const calcRectPortrait = await page.locator('#plasmaChart .chart-status').boundingBox();
      console.log(`  1. Calculating (Portrait): Text="${calcMsgPortrait}", Color="${calcColorPortrait}", Bg="${calcBgPortrait}"`);
      assert.equal(calcMsgPortrait, 'Calculating simulation…');
      assert.equal(calcColorPortrait, 'rgb(40, 79, 107)');
      assert.ok(calcRectPortrait.width > 0 && calcRectPortrait.height > 0);
      await assertStatus(page, 'Calculating simulation…', true);

      await page.locator('#plasmaChart').screenshot({ path: path.join(SCREENSHOT_DIR, `${key}-calc-portrait.png`) });

      // Check Calculating State in Landscape
      console.log(`  2. Rotating to Landscape (${profile.landscape.width}x${profile.landscape.height}) during calculation...`);
      await page.setViewportSize(profile.landscape);
      await page.waitForTimeout(200);

      const calcMsgLandscape = await page.locator('#plasmaChart .chart-status').textContent();
      const calcRectLandscape = await page.locator('#plasmaChart .chart-status').boundingBox();
      console.log(`     Calculating (Landscape): Text="${calcMsgLandscape}", Width=${calcRectLandscape.width}px, Height=${calcRectLandscape.height}px`);
      assert.equal(calcMsgLandscape, 'Calculating simulation…');
      assert.ok(calcRectLandscape.width > 0);
      await assertStatus(page, 'Calculating simulation…', true);

      await page.locator('#plasmaChart').screenshot({ path: path.join(SCREENSHOT_DIR, `${key}-calc-landscape.png`) });

      // Rotate back to portrait
      await page.setViewportSize(profile.portrait);
      await page.waitForTimeout(200);

      // Release worker -> enters Loading Chart state
      console.log(`  3. Releasing Worker gate -> entering Loading Chart state...`);
      releaseWorker();
      await page.waitForFunction(() => document.querySelector('#plasmaChart .chart-status')?.textContent === 'Loading chart…', undefined, { timeout: 15000 });

      const loadMsgPortrait = await page.locator('#plasmaChart .chart-status').textContent();
      const loadColorPortrait = await page.locator('#plasmaChart .chart-status').evaluate(el => getComputedStyle(el).color);
      console.log(`     Loading (Portrait): Text="${loadMsgPortrait}", Color="${loadColorPortrait}"`);
      assert.equal(loadMsgPortrait, 'Loading chart…');
      assert.equal(loadColorPortrait, 'rgb(40, 79, 107)');
      await assertStatus(page, 'Loading chart…', true);

      await page.locator('#plasmaChart').screenshot({ path: path.join(SCREENSHOT_DIR, `${key}-loading-portrait.png`) });

      // Rotate to landscape during chart loading
      console.log(`  4. Rotating to Landscape during chart loading...`);
      await page.setViewportSize(profile.landscape);
      await page.waitForTimeout(200);

      const loadMsgLandscape = await page.locator('#plasmaChart .chart-status').textContent();
      console.log(`     Loading (Landscape): Text="${loadMsgLandscape}"`);
      assert.equal(loadMsgLandscape, 'Loading chart…');
      await assertStatus(page, 'Loading chart…', true);

      await page.locator('#plasmaChart').screenshot({ path: path.join(SCREENSHOT_DIR, `${key}-loading-landscape.png`) });

      // Rotate back to portrait and release renderer gate
      await page.setViewportSize(profile.portrait);
      await page.waitForTimeout(200);

      console.log(`  5. Releasing Renderer gate -> rendering interactive chart...`);
      releaseRenderer();

      // Wait for chart canvas to render and .chart-status to disappear
      await page.waitForFunction(() => document.querySelector('#plasmaChart canvas') && !document.querySelector('#plasmaChart .chart-status'), undefined, { timeout: 15000 });
      const statusCountRendered = await page.locator('#plasmaChart .chart-status').count();
      const canvasVisible = await page.locator('#plasmaChart canvas').isVisible();
      console.log(`     ✓ Chart rendered: .chart-status count=${statusCountRendered}, canvas visible=${canvasVisible}`);
      assert.equal(statusCountRendered, 0, 'Chart status message must be removed after draw');
      assert.ok(canvasVisible, 'Canvas must be visible');
      assert.equal(await page.locator('#plasmaChart').getAttribute('aria-busy'), 'false');

      await page.locator('#plasmaChart').screenshot({ path: path.join(SCREENSHOT_DIR, `${key}-rendered-clean.png`) });
      await page.close();

      // 2. Failed Chart Download, Cleared-Threshold & Recovery
      console.log(`\n--- [2] Failed Download, Cleared-Threshold & Recovery ---`);
      const failedPage = await context.newPage();
      let heldRenderer;
      const heldRequest = new Promise(resolve => { heldRenderer = resolve; });
      await failedPage.route('**/assets/vendor/echarts-6.1.0.min.js', route => heldRenderer(route));
      const failedRendererRequested = failedPage.waitForRequest('**/assets/vendor/echarts-6.1.0.min.js');

      await failedPage.goto(baseUrl + '/', { waitUntil: 'domcontentloaded' });
      await failedPage.locator('#plasmaChart').scrollIntoViewIfNeeded();

      await failedRendererRequested;
      const route = await heldRequest;
      await failedPage.waitForFunction(() => !document.querySelector('#csv').disabled, undefined, { timeout: 15000 });
      await failedPage.waitForFunction(() => document.querySelector('#plasmaChart .chart-status')?.textContent === 'Loading chart…', undefined, { timeout: 15000 });
      await failedPage.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

      // 1. Enter a threshold while download is pending
      console.log('  1. Entering threshold (10 mg/L) while chart download is pending...');
      await failedPage.locator('#summaryMore summary').click();
      const thresholdField = failedPage.getByLabel('Plasma acyclovir threshold', { exact: true });
      await thresholdField.fill('10');

      // 2. Abort ECharts download to simulate network failure after threshold entered (gated order)
      console.log('  2. Aborting ECharts download to simulate network failure after entering threshold...');
      await route.abort();

      await failedPage.waitForFunction(() => document.querySelector('#plasmaChart .chart-status')?.textContent === 'Chart unavailable. Check your connection.', undefined, { timeout: 15000 });
      const failMsg = await failedPage.locator('#plasmaChart .chart-status').textContent();
      const ariaBusy = await failedPage.locator('#plasmaChart').getAttribute('aria-busy');
      const alertsHtml = await failedPage.locator('#alerts').innerHTML();
      console.log(`     Failure state: Text="${failMsg}", aria-busy=${ariaBusy}`);
      console.log(`     Alert banner: ${alertsHtml}`);
      assert.equal(failMsg, 'Chart unavailable. Check your connection.');
      assert.equal(ariaBusy, 'false');
      assert.ok(alertsHtml.includes('open AyFlux Lite'));
      await assertStatus(failedPage, 'Chart unavailable. Check your connection.', false);

      await failedPage.locator('#plasmaChart').screenshot({ path: path.join(SCREENSHOT_DIR, `${key}-failed-portrait.png`) });

      await failedPage.setViewportSize(profile.landscape);
      await failedPage.waitForTimeout(200);
      assert.equal(await failedPage.locator('#plasmaChart .chart-status').textContent(), 'Chart unavailable. Check your connection.');
      await assertStatus(failedPage, 'Chart unavailable. Check your connection.', false);

      await failedPage.locator('#plasmaChart').screenshot({ path: path.join(SCREENSHOT_DIR, `${key}-failed-landscape.png`) });

      // Rotate back
      await failedPage.setViewportSize(profile.portrait);
      await failedPage.waitForTimeout(200);

      // 3. Clear threshold while download is in failed state
      console.log('  3. Clearing threshold field while in failed state...');
      await thresholdField.fill('');

      // 4. Retry the renderer without changing or recalculating the simulation.
      console.log('  4. Restoring the connection and retrying charts without changing inputs...');
      const resultsBeforeRetry = await failedPage.evaluate(() => JSON.stringify(window.AyFluxResearchBridge.snapshot().results));
      await failedPage.unroute('**/assets/vendor/echarts-6.1.0.min.js');
      await failedPage.getByRole('button', { name: 'Retry charts', exact: true }).click();
      await failedPage.locator('#plasmaChart').scrollIntoViewIfNeeded();
      await failedPage.waitForFunction(() => document.querySelector('#plasmaChart canvas') && !document.querySelector('#plasmaChart .chart-status'));
      assert.equal(await failedPage.evaluate(() => JSON.stringify(window.AyFluxResearchBridge.snapshot().results)), resultsBeforeRetry, 'Retry must preserve computed results');
      assert.equal(await failedPage.getByRole('button', { name: 'Retry charts', exact: true }).count(), 0);
      // Input changes must still redraw correctly after recovery.
      await failedPage.fill('#num_dose', '725');
      await failedPage.waitForFunction(() => window.AyFluxResearchBridge.snapshot().updated && window.AyFluxResearchBridge.snapshot().config.dose === 725);
      await failedPage.locator('#plasmaChart').scrollIntoViewIfNeeded();

      await failedPage.waitForFunction(() => document.querySelector('#plasmaChart canvas') && !document.querySelector('#plasmaChart .chart-status'), undefined, { timeout: 15000 });
      const statusCountRecovered = await failedPage.locator('#plasmaChart .chart-status').count();
      const canvasRecoveredVisible = await failedPage.locator('#plasmaChart canvas').isVisible();
      console.log(`     ✓ Recovered: .chart-status count=${statusCountRecovered}, canvas visible=${canvasRecoveredVisible}`);
      assert.equal(statusCountRecovered, 0, 'Status overlay must be removed after successful retry');
      assert.ok(canvasRecoveredVisible, 'Canvas must be visible');
      assert.equal(await failedPage.locator('#plasmaChart').getAttribute('aria-busy'), 'false');

      const recovered = await failedPage.evaluate(() => window.AyFluxResearchBridge.snapshot());
      assert.equal(recovered.updated, true);
      assert.equal(recovered.config.dose, 725, 'New dose must reach the simulator');

      const chartVerification = await failedPage.evaluate(() => {
        const snapshot = window.AyFluxResearchBridge.snapshot();
        const run = snapshot.results[snapshot.primary];
        const chart = window.echarts.getInstanceByDom(document.querySelector('#plasmaChart'));
        const opt = chart.getOption();
        const series = opt.series.find(s => s.name === snapshot.primary + ' (selected)');
        const thresholdLine = opt.series.find(s => s.id === 'entered-plasma-threshold');
        const legendHasThreshold = opt.legend?.[0]?.data?.some(n => typeof n === 'string' && n.includes('Entered plasma ACV threshold'));
        const matchesCurve = series?.data.length === run.time.length && series.data.every(([t, value], i) => t === run.time[i] && value === run.plasma.median[i]);
        return {
          matchesCurve,
          hasThresholdLine: !!thresholdLine,
          legendHasThreshold: !!legendHasThreshold
        };
      });

      assert.equal(chartVerification.matchesCurve, true, 'Recovered curve must match current model points');
      assert.equal(chartVerification.hasThresholdLine, false, 'Cleared threshold line must not be present on chart');
      assert.equal(chartVerification.legendHasThreshold, false, 'Cleared threshold legend entry must not be present');

      await failedPage.locator('#plasmaChart').screenshot({ path: path.join(SCREENSHOT_DIR, `${key}-recovered.png`) });

      await failedPage.close();
      await context.close();
      assert.deepEqual(errors, [], 'No uncaught page errors');

      report.push({
        device: profile.label,
        slowCalc: 'PASSED ("Calculating simulation…", rgb(40, 79, 107) on pale blue, readable in portrait & landscape)',
        slowDownload: 'PASSED ("Loading chart…", rgb(40, 79, 107), readable in portrait & landscape)',
        cleanRender: 'PASSED (.chart-status overlay completely removed on render)',
        failedDownload: 'PASSED ("Chart unavailable. Check your connection.", aria-busy="false", Lite fallback link present)',
        recovery: 'PASSED (cleared threshold, new dose committed, ECharts downloaded, curve rendered, line/legend/overlay gone)'
      });
    }

    console.log(`\n========================================================================`);
    console.log(`MOBILE LOADING STATES AUDIT RESULTS`);
    console.log(`========================================================================\n`);
    for (const r of report) {
      console.log(`[PASSED] ${r.device}:`);
      console.log(`         Slow Calculation: ${r.slowCalc}`);
      console.log(`         Slow Download:    ${r.slowDownload}`);
      console.log(`         Clean Render:     ${r.cleanRender}`);
      console.log(`         Failed Download:  ${r.failedDownload}`);
      console.log(`         Recovery:         ${r.recovery}\n`);
    }

    return report;
  } finally {
    try {
      await browser?.close();
    } finally {
      server.close();
    }
  }
}

if (require.main === module) {
  runLoadingStatesAudit().catch(err => {
    console.error('Fatal audit error:', err);
    process.exit(1);
  });
}

module.exports = { runLoadingStatesAudit };
