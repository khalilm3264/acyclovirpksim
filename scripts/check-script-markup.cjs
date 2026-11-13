'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const expectedSources = [
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
  './assets/literature-cases.js',
  './assets/literature-workspace.js',
  './assets/pwa-register.js',
];

// JSON-LD blocks are inert data, not executed scripts, so script-src does not apply to them.
// They are allowed only with that exact type and only if their content is valid JSON.
function assertExternalScripts(allScripts, expected) {
  const data = allScripts.filter(script => (script.type || '').trim().toLowerCase() === 'application/ld+json');
  for (const block of data) assert.doesNotThrow(() => JSON.parse(block.content), 'JSON-LD must be valid JSON');
  const scripts = allScripts.filter(script => !data.includes(script));
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
        src: script.getAttribute('src'), type: script.getAttribute('type'), content: script.textContent,
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
    // JSON-LD data blocks are allowed only as valid JSON; any other inline type is still rejected.
    assertExternalScripts(await parse('<script type="application/ld+json">{"@type":"WebSite"}</script><script src="a.js"></script>'), ['a.js']);
    const badJson = await parse('<script type="application/ld+json">alert(1)</script>');
    assert.throws(() => assertExternalScripts(badJson, []), /valid JSON/);
    const typedInline = await parse('<script type="text/javascript">alert(1)</script>');
    assert.throws(() => assertExternalScripts(typedInline, [null]), /Inline JavaScript/);
    const nearMiss = await parse('<script type="application/ld+json+x">{}</script>');
    assert.throws(() => assertExternalScripts(nearMiss, []), /required order/);
    console.log('PASS script markup: browser parsing, asset order, inline rejection, JSON-LD data blocks and parser edge cases');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
