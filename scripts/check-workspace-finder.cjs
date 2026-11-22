'use strict';
const assert = require('node:assert/strict');

module.exports = async function checkWorkspaceFinder(page) {
  const base = page.url().split('#')[0];
  const query = page.locator('#workspaceQuery');
  const results = page.locator('#workspaceResults');
  const input = page.locator('#num_dose');
  await input.fill('725');
  await page.waitForFunction(() => window.AyFluxResearchBridge.snapshot().config.dose === 725);
  const dose = '725';

  await query.fill('no such tool 000');
  assert.match(await results.innerText(), /No matching tools/);
  await query.press('Escape');
  assert.equal(await results.isVisible(), false);
  assert.ok(await query.evaluate(field => field === document.activeElement));
  await query.fill('peritoneal bags');
  assert.match(await results.locator('li').first().innerText(), /PD exchange prescription/);
  await query.press('ArrowDown');
  assert.equal(await page.evaluate(() => document.activeElement.hash), '#pdRxPanel');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => location.hash === '#pdRxPanel' && document.activeElement.id === 'pdRxPanel');
  assert.ok(await page.locator('#timeline').isVisible());
  assert.equal(await input.inputValue(), dose);

  await query.fill('long tail');
  await query.press('Enter');
  await page.waitForFunction(() => location.hash === '#uncertaintyNote' && document.activeElement.parentElement.id === 'uncertaintyNote');
  assert.ok(await page.locator('#concentration').isVisible());
  assert.ok(await page.locator('#uncertaintyNote').evaluate(detail => detail.open));
  assert.ok(await page.locator('#summaryMore').evaluate(detail => detail.open));
  await page.goBack();
  await page.waitForFunction(() => location.hash === '#pdRxPanel' && document.activeElement.id === 'pdRxPanel');
  assert.equal(await input.inputValue(), dose);
  await page.goForward();
  await page.waitForFunction(() => location.hash === '#uncertaintyNote' && document.activeElement.parentElement.id === 'uncertaintyNote');

  await page.setViewportSize({width: 390, height: 844});
  await query.fill('bibliography');
  assert.equal(await results.getByRole('link', {name: /Bibliography/}).getAttribute('href'), '/references/');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2));
  await page.locator('.workspace-finder-links a').first().focus();
  assert.equal(await results.isVisible(), false);
  await page.locator('a[href="#guidedPanel"]').click();
  await page.waitForFunction(() => location.hash === '#guidedPanel' && document.activeElement.id === 'guidedPanel');
  assert.ok(await page.locator('#research').isVisible());
  assert.equal(await input.inputValue(), dose);

  await page.setViewportSize({width: 1280, height: 900});
  await page.goto('about:blank');
  await page.goto(base + '#uncertaintyNote');
  await page.waitForFunction(() => document.activeElement.parentElement.id === 'uncertaintyNote');
  await page.goto('about:blank');
  await page.goto(base);
  await page.waitForFunction(() => window.AyFluxResearchBridge.snapshot().updated);
  console.log('Tool finder keyboard, mobile layout, direct links and Back preserve settings.');
};
