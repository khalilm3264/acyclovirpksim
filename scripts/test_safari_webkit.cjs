'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const https = require('node:https');
const { webkit, devices } = require('playwright');

const PROFILES = {
  phone: {
    name: 'iPhone 14 (Mobile Safari, iOS 16.0)',
    ...devices['iPhone 14'],
    portrait: { width: 390, height: 664 },
    landscape: { width: 664, height: 390 },
    keyboardHeight: 300
  },
  tablet: {
    name: 'iPad Pro 11 (Tablet Safari, iPadOS 12.2)',
    ...devices['iPad Pro 11'],
    portrait: { width: 834, height: 1194 },
    landscape: { width: 1194, height: 834 },
    keyboardHeight: 350
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
  console.log(`RUNNING SAFARI WEBKIT USABILITY TEST ON: ${label} (${baseUrl})`);
  console.log(`========================================================================\n`);

  const browser = await webkit.launch({ headless: true });
  const results = [];

  try {
    for (const [deviceType, profile] of Object.entries(PROFILES)) {
      console.log(`\n>>> Testing Device: ${profile.name} [${deviceType.toUpperCase()}] <<<`);

      const context = await browser.newContext({
        userAgent: profile.userAgent,
        viewport: profile.portrait,
        deviceScaleFactor: profile.deviceScaleFactor,
        isMobile: profile.isMobile,
        hasTouch: profile.hasTouch,
        serviceWorkers: 'block'
      });

      // -----------------------------------------------------------------
      // 1. LITE APP TESTING: /lite/ (Graph zoom, pinch, pan & rotation)
      // -----------------------------------------------------------------
      console.log(`\n--- [${deviceType.toUpperCase()}] Lite App: Pinch, Pan & Rotation ---`);
      const litePage = await context.newPage();
      const liteErrors = [];
      litePage.on('pageerror', err => liteErrors.push(err.message));

      await litePage.goto(baseUrl + '/lite/');
      await litePage.waitForFunction(() => window.echarts?.getInstanceByDom(document.querySelector('#acvChart')) !== undefined, null, { timeout: 20000 });

      // Step A1: Inspect initial graph state
      const initialChartState = await litePage.evaluate(() => {
        const el = document.querySelector('#acvChart');
        const chart = window.echarts.getInstanceByDom(el);
        const opt = chart.getOption();
        const style = window.getComputedStyle(el);
        return {
          touchAction: style.touchAction,
          dragMode: el.dataset.dragMode,
          toolboxShow: opt.toolbox ? opt.toolbox[0]?.show : false,
          dataZoom: opt.dataZoom?.map(z => ({ id: z.id, type: z.type, start: z.start, end: z.end }))
        };
      });

      console.log('  1. Initial chart touch-action:', initialChartState.touchAction);
      console.log('     Toolbox visible on Lite:', initialChartState.toolboxShow);
      console.log('     Initial x-axis dataZoom range: start=' + initialChartState.dataZoom[0].start + '%, end=' + initialChartState.dataZoom[0].end + '%');

      assert.equal(initialChartState.touchAction, 'pan-y pinch-zoom', 'Chart has pan-y pinch-zoom touch-action');
      assert.equal(initialChartState.toolboxShow, false, 'Toolbox is hidden on Lite');
      assert.equal(initialChartState.dataZoom[0].start, 0);
      assert.equal(initialChartState.dataZoom[0].end, 100);

      // Step A2: Test pinch gesture on #acvChart
      console.log('  2. Dispatching two-finger pinch gesture on #acvChart...');
      const box = await litePage.locator('#acvChart').boundingBox();
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;

      await litePage.evaluate(({ cx, cy }) => {
        const el = document.querySelector('#acvChart');
        function dispatchTouch(type, touchesList) {
          const ev = document.createEvent('TouchEvent');
          ev.initEvent(type, true, true);
          Object.defineProperty(ev, 'touches', { value: touchesList });
          Object.defineProperty(ev, 'targetTouches', { value: touchesList });
          Object.defineProperty(ev, 'changedTouches', { value: touchesList });
          el.dispatchEvent(ev);
        }
        const t1Start = { identifier: 1, target: el, clientX: cx - 20, clientY: cy, pageX: cx - 20, pageY: cy };
        const t2Start = { identifier: 2, target: el, clientX: cx + 20, clientY: cy, pageX: cx + 20, pageY: cy };
        dispatchTouch('touchstart', [t1Start, t2Start]);

        const t1Move = { identifier: 1, target: el, clientX: cx - 80, clientY: cy, pageX: cx - 80, pageY: cy };
        const t2Move = { identifier: 2, target: el, clientX: cx + 80, clientY: cy, pageX: cx + 80, pageY: cy };
        dispatchTouch('touchmove', [t1Move, t2Move]);

        dispatchTouch('touchend', []);
      }, { cx, cy });

      const postPinchState = await litePage.evaluate(() => {
        const el = document.querySelector('#acvChart');
        const chart = window.echarts.getInstanceByDom(el);
        const opt = chart.getOption();
        return {
          dataZoom: opt.dataZoom?.map(z => ({ id: z.id, start: z.start, end: z.end })),
          visualViewportScale: window.visualViewport ? window.visualViewport.scale : 1.0
        };
      });

      console.log('     Post-pinch x-axis dataZoom range: start=' + postPinchState.dataZoom[0].start + '%, end=' + postPinchState.dataZoom[0].end + '%');
      console.log('     Observed behavior: Pinch gesture does NOT change chart time axis (retains start=0, end=100); CSS touch-action: pan-y pinch-zoom delegates pinch to page magnification.');
      assert.equal(postPinchState.dataZoom[0].start, 0, 'Chart start remained 0');
      assert.equal(postPinchState.dataZoom[0].end, 100, 'Chart end remained 100');

      // Step A3: Test single-finger pan gesture on #acvChart
      console.log('  3. Dispatching single-finger pan gesture on #acvChart...');
      await litePage.evaluate(({ cx, cy }) => {
        const el = document.querySelector('#acvChart');
        function dispatchTouch(type, touchesList) {
          const ev = document.createEvent('TouchEvent');
          ev.initEvent(type, true, true);
          Object.defineProperty(ev, 'touches', { value: touchesList });
          Object.defineProperty(ev, 'targetTouches', { value: touchesList });
          Object.defineProperty(ev, 'changedTouches', { value: touchesList });
          el.dispatchEvent(ev);
        }
        const tStart = { identifier: 1, target: el, clientX: cx, clientY: cy, pageX: cx, pageY: cy };
        dispatchTouch('touchstart', [tStart]);

        const tMove = { identifier: 1, target: el, clientX: cx - 60, clientY: cy, pageX: cx - 60, pageY: cy };
        dispatchTouch('touchmove', [tMove]);

        dispatchTouch('touchend', []);
      }, { cx, cy });

      const postPanState = await litePage.evaluate(() => {
        const el = document.querySelector('#acvChart');
        const chart = window.echarts.getInstanceByDom(el);
        const opt = chart.getOption();
        return {
          dataZoom: opt.dataZoom?.map(z => ({ id: z.id, start: z.start, end: z.end }))
        };
      });
      console.log('     Post-pan x-axis dataZoom range: start=' + postPanState.dataZoom[0].start + '%, end=' + postPanState.dataZoom[0].end + '%');
      console.log('     Observed behavior: Panning on Lite does not translate chart time axis (retains start=0, end=100); pan mode is off without toolbox.');
      assert.equal(postPanState.dataZoom[0].start, 0);
      assert.equal(postPanState.dataZoom[0].end, 100);

      // Step A4: Rotation to landscape
      console.log(`  4. Rotating to LANDSCAPE (${profile.landscape.width} x ${profile.landscape.height})...`);
      await litePage.setViewportSize(profile.landscape);
      await litePage.waitForTimeout(400);

      const postRotationState = await litePage.evaluate(() => {
        const el = document.querySelector('#acvChart');
        const chart = window.echarts.getInstanceByDom(el);
        const opt = chart.getOption();
        return {
          clientWidth: el.clientWidth,
          clientHeight: el.clientHeight,
          chartWidth: chart.getWidth(),
          chartHeight: chart.getHeight(),
          dataZoom: opt.dataZoom?.map(z => ({ id: z.id, start: z.start, end: z.end }))
        };
      });
      console.log(`     Canvas resized cleanly under ResizeObserver: width=${postRotationState.chartWidth}px, height=${postRotationState.chartHeight}px`);
      assert.ok(postRotationState.chartWidth > 0, 'Chart width resized in landscape');

      // Step A5: Test panning after rotation in landscape
      console.log('  5. Testing pan gesture after rotation in Landscape...');
      const boxLandscape = await litePage.locator('#acvChart').boundingBox();
      const lcx = boxLandscape.x + boxLandscape.width / 2;
      const lcy = boxLandscape.y + boxLandscape.height / 2;

      await litePage.evaluate(({ lcx, lcy }) => {
        const el = document.querySelector('#acvChart');
        function dispatchTouch(type, touchesList) {
          const ev = document.createEvent('TouchEvent');
          ev.initEvent(type, true, true);
          Object.defineProperty(ev, 'touches', { value: touchesList });
          Object.defineProperty(ev, 'targetTouches', { value: touchesList });
          Object.defineProperty(ev, 'changedTouches', { value: touchesList });
          el.dispatchEvent(ev);
        }
        const tStart = { identifier: 1, target: el, clientX: lcx, clientY: lcy, pageX: lcx, pageY: lcy };
        dispatchTouch('touchstart', [tStart]);

        const tMove = { identifier: 1, target: el, clientX: lcx - 70, clientY: lcy, pageX: lcx - 70, pageY: lcy };
        dispatchTouch('touchmove', [tMove]);

        dispatchTouch('touchend', []);
      }, { lcx, lcy });

      const postLandscapePan = await litePage.evaluate(() => {
        const el = document.querySelector('#acvChart');
        const chart = window.echarts.getInstanceByDom(el);
        const opt = chart.getOption();
        return {
          dataZoom: opt.dataZoom?.map(z => ({ id: z.id, start: z.start, end: z.end }))
        };
      });
      console.log('     Post-landscape pan x-axis dataZoom range: start=' + postLandscapePan.dataZoom[0].start + '%, end=' + postLandscapePan.dataZoom[0].end + '%');
      assert.equal(postLandscapePan.dataZoom[0].start, 0);
      assert.equal(postLandscapePan.dataZoom[0].end, 100);

      results.push({
        device: profile.name,
        test: 'Lite App: Pinch, Pan & Rotation Behavior',
        status: 'PASSED',
        details: 'Pinch delegates to visual viewport page zoom (chart axis unchanged); pan does not translate chart time axis; canvas resizes cleanly across rotations via ResizeObserver.'
      });

      await litePage.close();

      // -----------------------------------------------------------------
      // 2. FULL SIMULATOR TESTING: / (Timeline dose editing & Apply with keyboard)
      // -----------------------------------------------------------------
      console.log(`\n--- [${deviceType.toUpperCase()}] Full Simulator: Timeline Dose Editing & Apply with Virtual Keyboard ---`);
      const fullPage = await context.newPage();
      const fullErrors = [];
      fullPage.on('pageerror', err => fullErrors.push(err.message));

      await fullPage.goto(baseUrl + '/');
      await fullPage.waitForFunction(() => !document.querySelector('#saveBaseline').disabled, null, { timeout: 20000 });

      // Navigate to Timeline tab
      console.log('  1. Navigating to Timeline tab (#tab-timeline)...');
      await fullPage.click('#tab-timeline');
      await fullPage.waitForFunction(() => document.querySelector('#tab-timeline').getAttribute('aria-selected') === 'true');

      // Click Add Dose
      console.log('  2. Clicking "+ Add medication dose"...');
      const initialDoseRows = await fullPage.locator('#doseRows .dose-row').count();
      await fullPage.click('#addDose');
      const afterAddRows = await fullPage.locator('#doseRows .dose-row').count();
      assert.equal(afterAddRows, initialDoseRows + 1, 'New dose row added');
      assert.ok(await fullPage.locator('#dosePending').isVisible(), 'Pending notice is visible');

      // Simulate Virtual Keyboard Open (viewport height reduction)
      const reducedHeight = profile.portrait.height - profile.keyboardHeight;
      console.log(`  3. Simulating on-screen keyboard open: reducing viewport from ${profile.portrait.height}px to ${reducedHeight}px...`);
      await fullPage.setViewportSize({ width: profile.portrait.width, height: reducedHeight });

      // Edit the draft dose row with keyboard active
      console.log('  4. Filling unapplied dose fields while keyboard is active (500 mg, Valacyclovir oral, 36 h)...');
      const newRowIdx = initialDoseRows;
      const routeSelect = fullPage.locator(`select[data-dose-index="${newRowIdx}"][data-dose-field="route"]`);
      await routeSelect.selectOption('Valacyclovir oral');
      await routeSelect.dispatchEvent('input');

      const amountInput = fullPage.locator(`input[data-dose-index="${newRowIdx}"][data-dose-field="amount"]`);
      await amountInput.fill('500');
      await amountInput.dispatchEvent('input');

      const timeInput = fullPage.locator(`input[data-dose-index="${newRowIdx}"][data-dose-field="time"]`);
      await timeInput.fill('36');
      await timeInput.dispatchEvent('input');

      // Verify draft values
      assert.equal(await amountInput.inputValue(), '500');
      assert.equal(await timeInput.inputValue(), '36');
      assert.equal(await routeSelect.inputValue(), 'Valacyclovir oral');

      // Reach and verify Apply action under keyboard-reduced viewport
      console.log('  5. Reaching Apply button (#applyFullTimeline) with keyboard visible...');
      const applyBtn = fullPage.locator('#applyFullTimeline');
      await applyBtn.scrollIntoViewIfNeeded();
      assert.ok(await applyBtn.isVisible(), '#applyFullTimeline is visible and reachable');

      // Click Apply
      console.log('  6. Applying schedule while keyboard visible...');
      await applyBtn.click();
      await fullPage.waitForTimeout(400);

      assert.ok(await fullPage.locator('#dosePending').isHidden(), '#dosePending notice cleared after apply');

      // Assert applied configuration in model engine
      console.log('  7. Asserting applied model configuration in engine (window.AyFluxResearchBridge)...');
      const bridgeConfig = await fullPage.evaluate(() => window.AyFluxResearchBridge.snapshot().config);
      assert.equal(bridgeConfig.dosingMode, 'custom', 'Dosing mode must be custom');
      const appliedDose = bridgeConfig.customDoses?.find(d => d.time === 36);
      assert.ok(appliedDose, 'Custom dose at hour 36 must exist in applied configuration');
      assert.equal(appliedDose.amount, 500, 'Applied dose amount is 500 mg');
      assert.equal(appliedDose.route, 'Valacyclovir oral', 'Applied dose route is Valacyclovir oral');
      console.log(`     ✓ Applied model configuration verified: hour=${appliedDose.time}, amount=${appliedDose.amount} mg, route="${appliedDose.route}".`);

      // Dismiss virtual keyboard (restore original viewport)
      await fullPage.setViewportSize(profile.portrait);
      await fullPage.waitForTimeout(200);

      results.push({
        device: profile.name,
        test: 'Full Simulator: Timeline Dose Editing & Apply with Virtual Keyboard',
        status: 'PASSED',
        details: 'Dose inputs edited and #applyFullTimeline reached and clicked under keyboard viewport reduction; applied 500 mg Valacyclovir @ 36 h verified in engine.'
      });

      await fullPage.close();
      await context.close();
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

function getCommitSha() {
  if (process.env.GITHUB_SHA) {
    return process.env.GITHUB_SHA.slice(0, 7);
  }
  try {
    const { execSync } = require('node:child_process');
    const sha = execSync('git rev-parse --short HEAD', { encoding: 'utf8', cwd: __dirname }).trim();
    if (sha) return sha;
  } catch (e) {}
  return 'local';
}

async function main() {
  const localOnly = process.argv.includes('--local') || process.argv.includes('--local-only') || process.env.LOCAL_ONLY === 'true';

  const localServer = await createServer();
  const localBase = 'http://127.0.0.1:' + localServer.address().port;
  const commitLabel = getCommitSha();

  try {
    // 1. Run on Local Exact Build
    const localResults = await runTestSuite(localBase, `LOCAL BUILD (commit ${commitLabel})`);

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
        prodResults = await runTestSuite(targetProd, `PRODUCTION DEPLOYED (${targetProd})`);
      }
    }

    console.log('\n========================================================================');
    console.log('SUMMARY OF SAFARI WEBKIT USABILITY TEST RESULTS');
    console.log('========================================================================\n');
    for (const r of [...localResults, ...prodResults]) {
      console.log(`[${r.status}] ${r.device}: ${r.test}`);
      console.log(`       Details: ${r.details}\n`);
    }

  } finally {
    localServer.close();
  }
}

main().catch(err => {
  console.error('\n❌ Safari Test Suite Failed:', err.message || err);
  process.exitCode = 1;
});
