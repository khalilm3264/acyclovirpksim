'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const expectedSources = [
  '/assets/measurement-pixel.js',
  './assets/charts.js',
  './assets/pk-engine.js',
  './assets/ayflux-exchange.js',
  './assets/ayflux-version.js',
  './assets/model-integrity.js',
  './assets/osp-import.js',
  './assets/study-library.js',
  './assets/regimen-tools.js',
  './assets/simulator-ui.js',
  './assets/analysis-views.js',
  './assets/research-workspace.js',
  './assets/pwa-register.js',
];

function assertExternalScripts(scripts, expected) {
  assert.deepEqual(scripts.map(script => script.src), expected, 'External scripts must occur in the required order');
  for (const script of scripts) {
    assert.equal(script.content.trim(), '', 'Inline JavaScript would violate script-src self');
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    // Parse inert documents: do not execute or load any script from the input.
    const parse = markup => page.evaluate(input => {
      const document = new DOMParser().parseFromString(input, 'text/html');
      return [...document.querySelectorAll('script')].map(script => ({
        src: script.getAttribute('src'), content: script.textContent,
      }));
    }, markup);
    const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
    assertExternalScripts(await parse(html), expectedSources);

    // HTML parsing handles quotes, case, comments and malformed end-tag attributes.
    const fixture = `<!-- <script src="decoy.js"></script> -->
      <SCRIPT data-note="a > b" src='first.js'></SCRIPT extra>
      <script src="second.js"></script>`;
    assertExternalScripts(await parse(fixture), ['first.js', 'second.js']);
    const inline = await parse('<script>unexpected()</script extra>');
    assert.throws(() => assertExternalScripts(inline, [null]), /Inline JavaScript/);
    const reordered = await parse('<script src="second.js"></script><script src="first.js"></script>');
    assert.throws(() => assertExternalScripts(reordered, ['first.js', 'second.js']), /required order/);
    console.log('PASS script markup: browser parsing, asset order, inline rejection and parser edge cases');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
