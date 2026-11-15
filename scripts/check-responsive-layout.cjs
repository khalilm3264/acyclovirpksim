'use strict';
const assert = require('node:assert/strict');
const { chromium, firefox } = require('playwright');

// Page zoom changes the CSS viewport. Pinch zoom changes the visual viewport
// separately, so exercise both. Allow chart resize observers time to settle.
async function fits(page, label) {
  try {
    await page.waitForFunction(() => {
      const root = document.documentElement;
      return root.scrollWidth <= root.clientWidth + 1;
    }, null, { timeout: 4000 });
  } catch {
    const widths = await page.evaluate(() => [document.documentElement.clientWidth, document.documentElement.scrollWidth]);
    throw Error(label + ' viewport/document widths ' + widths.join('/'));
  }
}

// Coarse-pointer tablets keep the wide timeline layout while gaining touch targets.
async function checkTabletTargets(browser, base) {
  for (const hasTouch of [true, false]) {
    const page = await browser.newPage({ hasTouch, serviceWorkers: 'block' });
    try {
      await page.goto(base + '/');
      await page.waitForFunction(() => !document.querySelector('#saveBaseline').disabled);
      await page.locator('#tab-timeline').click();
      await page.locator('#addDose').click();
      assert.ok(await page.locator('#timeline .dose-row input').count() > 0, 'Dynamic medication controls are populated');
      for (const [width, height] of [[800, 1280], [1280, 800]]) {
        await page.setViewportSize({ width, height });
        assert.equal(await page.evaluate(() => matchMedia('(pointer:coarse)').matches), hasTouch);
        const targets = await page.locator('#timeline .intervals input, #timeline .intervals select, #timeline .dose-row input, #timeline .dose-row select, #timeline .rx-table input, #timeline .rx-table select, #timeline button').evaluateAll(nodes => nodes.filter(n => n.getBoundingClientRect().height).map(n => ({id: n.id || n.className, height: n.getBoundingClientRect().height})));
        assert.ok(targets.length > 10, 'Populated timeline targets are measured');
        if (hasTouch) {
          for (const target of targets) assert.ok(target.height >= 39.9, `${width} touch target ${JSON.stringify(target)}`);
          assert.ok(await page.locator('#timeline .rx-table button').first().evaluate(n => n.getBoundingClientRect().width >= 40));
          assert.ok(await page.locator('#pdRxPanel>.check').evaluate(n => n.getBoundingClientRect().height >= 40));
        } else {
          assert.ok(await page.locator('#applyFullTimeline').evaluate(n => n.getBoundingClientRect().height < 40), 'Fine-pointer desktop sizing is preserved');
        }
        assert.equal(await page.locator('#timeline .intervals').first().evaluate(n => getComputedStyle(n).gridTemplateColumns.split(' ').length), 4, 'Tablet retains four-column session layout');
        assert.equal(await page.locator('#addRow').evaluate(n => getComputedStyle(n).flexBasis), 'auto', 'Tablet actions retain natural width');
        await fits(page, `tablet ${width} touch=${hasTouch}`);
      }
    } finally { await page.close(); }
  }
}

async function checkResponsiveLayout(base) {
  const sizes = [[320,568], [568,320], [390,844], [844,390], [768,1024], [1024,768], [820,1180], [1180,820]];
  for (const engine of [chromium, firefox]) {
    const isChromium = engine === chromium;
    const browser = await engine.launch(isChromium ? {} : { firefoxUserPrefs: { 'font.minimum-size.x-western': 20 } });
    try {
      if (isChromium) await checkTabletTargets(browser, base);
      const page = await browser.newPage({ hasTouch: true, isMobile: isChromium, serviceWorkers: 'block' });
      await page.goto(base + '/');
      await page.waitForFunction(() => !document.querySelector('#saveBaseline').disabled);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.locator('#num_dose').fill('725');
      await page.locator('#num_dose').press('Tab');
      const tabs = await page.locator('#tabs [role=tab]').evaluateAll(nodes => nodes.map(node => node.id));
      for (const [width, height] of sizes) {
        for (const zoom of [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5]) {
          // At narrower effective widths mobile browsers magnify and pan.
          const effectiveWidth = Math.max(160, Math.round(width / zoom));
          await page.setViewportSize({ width: effectiveWidth, height: Math.ceil(height / zoom) });
          const activeTabs = [1, 2, 4].includes(zoom) ? tabs : ['tab-validation'];
          for (const id of activeTabs) {
            const tab = page.locator('#' + id);
            await tab.tap();
            assert.equal(await tab.getAttribute('aria-selected'), 'true');
            await fits(page, [engine.name(), id, width, height, zoom].join(' '));
          }
          assert.equal(await page.locator('#num_dose').inputValue(), '725');
        }
      }
      await page.setViewportSize({ width: 320, height: 568 });
      await page.locator('#tab-validation').tap();
      await page.locator('#addMeasure').tap();
      const measurements = page.getByRole('region', { name: 'Assay measurements' });
      await measurements.focus();

      await measurements.evaluate(el => el.scrollTo(el.scrollWidth, 0));
      assert.ok(await measurements.evaluate(el => el.scrollLeft > 0));
      await fits(page, 'Populated measurements');
      if (isChromium) {
        const session = await page.context().newCDPSession(page);
        for (const scale of [1.5, 2, 3, 4]) {
          await session.send('Emulation.setPageScaleFactor', { pageScaleFactor: scale });
          await page.waitForFunction(expected => Math.abs(visualViewport.scale - expected) < 0.05, scale);
          assert.equal(await page.locator('#num_dose').inputValue(), '725');
        }
        await session.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
        await page.goto(base + '/lite/index.html');
        const touchAction = await page.locator('.chart').first().evaluate(chart => getComputedStyle(chart).touchAction);
        assert.ok(touchAction.includes('pinch-zoom'), 'Lite chart allows pinch zoom');
        await session.send('Emulation.setPageScaleFactor', { pageScaleFactor: 3 });
        await page.waitForFunction(() => Math.abs(visualViewport.scale - 3) < 0.05);
        await session.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
      }
      for (const route of ['/lite/index.html', '/learn/index.html', '/research/pediatric/index.html', '/experimental/neonatal/index.html']) {
        await page.goto(base + route);
        for (const [width, height] of [[160,320], [320,160], ...sizes]) {
          await page.setViewportSize({ width, height });
          await fits(page, engine.name() + ' ' + route + ' ' + width);
        }
      }
    } finally {
      await browser.close();
    }
  }
}

module.exports = { checkResponsiveLayout };
