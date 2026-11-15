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
      // 1. LITE APP TESTING: /lite/ (Visible time controls #213 & synthetic touch events)
      // -----------------------------------------------------------------
      console.log(`\n--- [${deviceType.toUpperCase()}] Lite App: Visible Time-Axis Controls (#213) & Synthetic Touch Events ---`);
      const litePage = await context.newPage();
      const liteErrors = [];
      litePage.on('pageerror', err => liteErrors.push(err.message));

      await litePage.goto(baseUrl + '/lite/');
      await litePage.waitForFunction(() => window.echarts?.getInstanceByDom(document.querySelector('#acvChart')) !== undefined, null, { timeout: 20000 });

      // Helper to read xAxis extent from an ECharts instance
      const getTimeExtent = (chartId = 'acvChart') => litePage.evaluate((id) => {
        const chart = window.echarts.getInstanceByDom(document.getElementById(id));
        return chart.getModel().getComponent('xAxis').axis.scale.getExtent();
      }, chartId);

      const getTimeWindowLabel = () => litePage.locator('#liteTimeWindow').innerText();

      // Step 1: Verify touch target sizes of time control buttons (min-height >= 44px)
      console.log('  1. Verifying time-axis control buttons (#liteTimeIn, #liteTimeOut, #liteTimeReset)...');
      const inBox = await litePage.locator('#liteTimeIn').boundingBox();
      const outBox = await litePage.locator('#liteTimeOut').boundingBox();
      const resetBox = await litePage.locator('#liteTimeReset').boundingBox();

      assert.ok(inBox.height >= 44, `#liteTimeIn touch target height (${inBox.height}px) >= 44px`);
      assert.ok(outBox.height >= 44, `#liteTimeOut touch target height (${outBox.height}px) >= 44px`);
      assert.ok(resetBox.height >= 44, `#liteTimeReset touch target height (${resetBox.height}px) >= 44px`);
      console.log(`     ✓ Button touch targets verified: in=${inBox.height}px, out=${outBox.height}px, reset=${resetBox.height}px (all >= 44px)`);

      // Step 2: Initial visible time range
      const initialExtent = await getTimeExtent('acvChart');
      const initialLabel = await getTimeWindowLabel();
      console.log(`  2. Initial visible time range: [${initialExtent.join(', ')}] h, label: "${initialLabel}"`);
      assert.deepEqual(initialExtent, [0, 96], 'Initial time range is [0, 96]');
      assert.ok(/^Time:\s*0(\.0)?–96(\.0)?\s*h$/.test(initialLabel), `Initial label matches Time: 0–96 h (actual: "${initialLabel}")`);

      // Step 3: Test "Zoom time in" button
      console.log('  3. Clicking "Zoom time in" (#liteTimeIn)...');
      await litePage.locator('#liteTimeIn').click();
      await litePage.waitForFunction(() => {
        const c = window.echarts?.getInstanceByDom(document.getElementById('acvChart'));
        const ext = c?.getModel().getComponent('xAxis').axis.scale.getExtent();
        return ext && Math.abs(ext[0] - 24) < 0.1 && Math.abs(ext[1] - 72) < 0.1;
      });
      const zoomedExtent = await getTimeExtent('acvChart');
      const zoomedLabel = await getTimeWindowLabel();
      console.log(`     ✓ Time range narrowed: [${zoomedExtent.join(', ')}] h, label: "${zoomedLabel}"`);
      assert.deepEqual(zoomedExtent, [24, 72], 'Zoomed extent narrowed to [24, 72]');
      assert.ok(/^Time:\s*24(\.0)?–72(\.0)?\s*h$/.test(zoomedLabel), `Zoomed label matches Time: 24–72 h (actual: "${zoomedLabel}")`);

      // Assert all visible charts updated synchronously
      const cmmgZoomedExtent = await getTimeExtent('cmmgChart');
      assert.deepEqual(cmmgZoomedExtent, [24, 72], 'cmmgChart synchronized to [24, 72]');

      // Step 4: Rotate to landscape and verify time range persists
      console.log(`  4. Rotating to LANDSCAPE (${profile.landscape.width} x ${profile.landscape.height})...`);
      await litePage.setViewportSize(profile.landscape);
      await litePage.waitForTimeout(400);

      const landscapeExtent = await getTimeExtent('acvChart');
      const landscapeLabel = await getTimeWindowLabel();
      const landscapeCanvas = await litePage.evaluate(() => {
        const c = window.echarts.getInstanceByDom(document.getElementById('acvChart'));
        return { width: c.getWidth(), height: c.getHeight() };
      });
      console.log(`     ✓ Canvas resized under ResizeObserver: ${landscapeCanvas.width} x ${landscapeCanvas.height} px`);
      console.log(`     ✓ Time range persisted across rotation: [${landscapeExtent.join(', ')}] h, label: "${landscapeLabel}"`);
      assert.deepEqual(landscapeExtent, [24, 72], 'Time range persists across rotation');
      assert.ok(/^Time:\s*24(\.0)?–72(\.0)?\s*h$/.test(landscapeLabel), `Label persists across rotation (actual: "${landscapeLabel}")`);

      // Step 5: Test "Zoom time out" in landscape
      console.log('  5. Testing "Zoom time out" (#liteTimeOut) in Landscape...');
      await litePage.locator('#liteTimeOut').click();
      await litePage.waitForFunction(() => {
        const c = window.echarts?.getInstanceByDom(document.getElementById('acvChart'));
        const ext = c?.getModel().getComponent('xAxis').axis.scale.getExtent();
        return ext && Math.abs(ext[0] - 0) < 0.1 && Math.abs(ext[1] - 96) < 0.1;
      });
      const zoomOutExtent = await getTimeExtent('acvChart');
      const zoomOutLabel = await getTimeWindowLabel();
      console.log(`     ✓ Time range widened: [${zoomOutExtent.join(', ')}] h, label: "${zoomOutLabel}"`);
      assert.deepEqual(zoomOutExtent, [0, 96], 'Time range widened back to [0, 96]');
      assert.ok(/^Time:\s*0(\.0)?–96(\.0)?\s*h$/.test(zoomOutLabel), `Label reset to Time: 0–96 h (actual: "${zoomOutLabel}")`);

      // Step 6: Test "Reset time axis" button
      console.log('  6. Testing "Reset time axis" (#liteTimeReset)...');
      await litePage.locator('#liteTimeIn').click();
      await litePage.waitForFunction(() => {
        const c = window.echarts?.getInstanceByDom(document.getElementById('acvChart'));
        const ext = c?.getModel().getComponent('xAxis').axis.scale.getExtent();
        return ext && Math.abs(ext[0] - 24) < 0.1;
      });
      await litePage.locator('#liteTimeReset').click();
      await litePage.waitForFunction(() => {
        const c = window.echarts?.getInstanceByDom(document.getElementById('acvChart'));
        const ext = c?.getModel().getComponent('xAxis').axis.scale.getExtent();
        return ext && Math.abs(ext[0] - 0) < 0.1 && Math.abs(ext[1] - 96) < 0.1;
      });
      const resetExtent = await getTimeExtent('acvChart');
      const resetLabel = await getTimeWindowLabel();
      console.log(`     ✓ Time range reset: [${resetExtent.join(', ')}] h, label: "${resetLabel}"`);
      assert.deepEqual(resetExtent, [0, 96], 'Reset restored [0, 96]');
      assert.ok(/^Time:\s*0(\.0)?–96(\.0)?\s*h$/.test(resetLabel), `Reset restored Time: 0–96 h (actual: "${resetLabel}")`);

      // Step 7: Rotate back to portrait
      await litePage.setViewportSize(profile.portrait);
      await litePage.waitForTimeout(200);

      // Step 8: Synthetic DOM TouchEvents checks
      console.log('  7. Dispatching synthetic two-finger pinch TouchEvents over #acvChart...');
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

      const postPinchExtent = await getTimeExtent('acvChart');
      console.log(`     Observed: Synthetic TouchEvents do not modify chart dataZoom; range remains [${postPinchExtent.join(', ')}] h.`);
      console.log(`     (Note: Genuine on-device physical Safari pinch-to-zoom behavior remains open / unverified.)`);
      assert.deepEqual(postPinchExtent, [0, 96], 'Chart extent unchanged by synthetic DOM touch events');

      console.log('  8. Dispatching synthetic single-finger pan TouchEvents over #acvChart...');
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

      const postPanExtent = await getTimeExtent('acvChart');
      console.log(`     Observed: Single-finger synthetic drag does not translate full-range time axis; range remains [${postPanExtent.join(', ')}] h.`);
      assert.deepEqual(postPanExtent, [0, 96], 'Chart extent unchanged by synthetic drag');

      assert.deepEqual(liteErrors, [], 'No uncaught page errors on Lite');

      results.push({
        device: profile.name,
        test: 'Lite App: Time-Axis Controls (#213) & Synthetic Touch Events',
        status: 'PASSED',
        details: 'Visible time-axis controls (#213) narrow axis to 24–72 h, persist across rotation, and reset to 0–96 h with button heights >= 44px; synthetic touch events leave axis unchanged.'
      });

      await litePage.close();

      // -----------------------------------------------------------------
      // 2. FULL SIMULATOR TESTING: / (Reduced-height viewport test)
      // -----------------------------------------------------------------
      console.log(`\n--- [${deviceType.toUpperCase()}] Full Simulator: Timeline Dose Editing & Apply under Reduced-Height Viewport ---`);
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

      // Viewport height reduction emulation
      const reducedHeight = profile.portrait.height - profile.keyboardHeight;
      console.log(`  3. Applying reduced-height portrait viewport: reducing viewport from ${profile.portrait.height}px to ${reducedHeight}px...`);
      await fullPage.setViewportSize({ width: profile.portrait.width, height: reducedHeight });

      // Edit the draft dose row in reduced-height viewport
      console.log('  4. Filling unapplied dose fields in reduced-height viewport (500 mg, Valacyclovir oral, 36 h)...');
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

      // Reach and verify Apply action under reduced-height viewport
      console.log('  5. Reaching Apply button (#applyFullTimeline) in reduced-height viewport...');
      const applyBtn = fullPage.locator('#applyFullTimeline');
      await applyBtn.scrollIntoViewIfNeeded();
      assert.ok(await applyBtn.isVisible(), '#applyFullTimeline is visible and reachable');

      // Click Apply
      console.log('  6. Applying schedule while reduced-height viewport is active...');
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
      console.log(`     (Note: Genuine on-device physical Safari virtual keyboard interaction and layout shifting remain open / unverified.)`);

      // Restore original viewport
      await fullPage.setViewportSize(profile.portrait);
      await fullPage.waitForTimeout(200);

      assert.deepEqual(fullErrors, [], 'No uncaught page errors on Full Simulator');

      results.push({
        device: profile.name,
        test: 'Full Simulator: Timeline Dose Editing & Apply under Reduced-Height Viewport',
        status: 'PASSED',
        details: 'Dose inputs edited and #applyFullTimeline reached and clicked under reduced-height portrait viewport; applied 500 mg Valacyclovir @ 36 h verified in engine.'
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

    // 2. Run on Production Deployed Site (Optional / skipped if localOnly)
    let prodResults = [];
    if (!localOnly) {
      const prodUrl = 'https://khalilm3264.github.io/acyclovirpksim';
      console.log(`\nChecking production reachability (${prodUrl})...`);
      const reachability = await checkUrlReachable(prodUrl);
      if (reachability.connected) {
        if (reachability.statusCode >= 200 && reachability.statusCode < 400) {
          prodResults = await runTestSuite(prodUrl, 'PRODUCTION DEPLOYED SITE');
        } else {
          console.error(`❌ PRODUCTION PREFLIGHT HTTP ERROR: received status ${reachability.statusCode}`);
          process.exitCode = 1;
          return;
        }
      } else {
        console.log(`[OFFLINE SKIP] Production preflight check failed: ${reachability.error}. Skipping production run.`);
      }
    } else {
      console.log('\n[INFO] Skipping production test suite (--local-only specified).');
    }

    const allResults = [...localResults, ...prodResults];
    console.log(`\n========================================================================`);
    console.log(`SUMMARY OF SAFARI WEBKIT USABILITY TEST RESULTS`);
    console.log(`========================================================================\n`);
    for (const r of allResults) {
      console.log(`[${r.status}] ${r.device}: ${r.test}`);
      console.log(`       Details: ${r.details}\n`);
    }

    const anyFailed = allResults.some(r => r.status === 'FAILED');
    if (anyFailed) {
      process.exitCode = 1;
    }
  } finally {
    localServer.close();
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error in test suite:', err);
    process.exit(1);
  });
}

module.exports = { runTestSuite, PROFILES };
