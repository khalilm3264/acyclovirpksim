'use strict';

// Dependency-free smoke and pharmacokinetic regression tests.
// Run with: node --test tests/*.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const html = read('public/index.html');
const engineSource = read('public/assets/pk-engine.js');
const scriptPaths = [
  './assets/charts.js',
  './assets/pk-engine.js',
  './assets/ayflux-exchange.js',
  './assets/ayflux-version.js',
  './assets/model-integrity.js',
  './assets/osp-import.js',
  './assets/simulator-ui.js',
  './assets/analysis-views.js',
  './assets/research-workspace.js',
  './assets/pwa-register.js',
];

// Model code is evaluated without the browser-only renderer.
const sandbox = { window: {} };
vm.runInNewContext(engineSource, sandbox, { filename: 'pk-engine.js', timeout: 5000 });
const pk = sandbox.window.RenalPKV7;
assert.ok(pk, 'PK engine must expose window.RenalPKV7');

function scenario(overrides = {}) {
  return {
    ...pk.DEFAULTS,
    draws: 1,
    variability: 0,
    horizon: 12,
    doseCount: 1,
    hdStart: 0,
    ...overrides,
  };
}

test('simulator script assets exist and use the expected loader', () => {
  // Script order and inline content are checked with DOMParser in check-script-markup.cjs.
  for (const relative of scriptPaths) {
    const filename = path.join(root, 'public', relative);
    assert.ok(fs.statSync(filename).size > 0, relative + ' must exist');
  }
  assert.ok(!html.includes('<script src="./assets/vendor/echarts-5.6.0.min.js"'));
  assert.ok(read('public/assets/charts.js').includes('script.async=true'));
  assert.ok(read('public/assets/simulator-ui.js').includes('window.AyFluxCharts.ensure()'));
  assert.ok(read('public/assets/simulator-ui.js').includes('window.RenalPKV7'));
});

test('worker Content Security Policy allows local scripts but not inline scripts', () => {
  const worker = read('src/index.js');
  const directive = /script-src ([^;]+);/.exec(worker)?.[1];
  assert.equal(directive?.trim(), "'self'");
  assert.doesNotMatch(directive, /unsafe-inline|unsafe-eval/);
  const markup = html;
  assert.doesNotMatch(markup, /\s(?:onclick|onchange|oninput|onload|onerror)\s*=/i);
});

test('the default educational configuration validates', () => {
  assert.deepEqual(Array.from(pk.validate(scenario(), 'No dialysis')), []);
});

test('Cockcroft-Gault calculation remains consistent', () => {
  assert.equal(pk.cockcroftGault({ age: 50, sex: 'male', scr: 1, weight: 70 }), 87.5);
  assert.equal(pk.cockcroftGault({ age: 50, sex: 'female', scr: 1, weight: 70 }), 74.375);
  assert.ok(Number.isNaN(pk.cockcroftGault({ age: 50, sex: 'male', scr: 0, weight: 70 })));
});

test('repeat doses obey the horizon and invalid doses are rejected', () => {
  const c = scenario({ horizon: 25, doseCount: 5, every: 8 });
  assert.deepEqual(Array.from(pk.buildDoses(c), dose => dose.time), [0, 8, 16, 24]);
  assert.ok(pk.validateDoses({ ...c, dose: -1 }).length > 0);
  assert.ok(pk.validateDoses({ ...c, every: 0 }).length > 0);
});

test('zero creatinine clearance has no kidney clearance in the generated parameters', () => {
  const c = scenario({ crcl: 0, crclSource: 'manual' });
  assert.deepEqual(Array.from(pk.validate(c, 'No dialysis')), []);
  const params = pk.drawParams(c)[0];
  assert.equal(params.renal, 0);
  assert.equal(params.mr, 0);
});

test('zero dose produces zero concentrations in the no-dialysis model', () => {
  const c = scenario({ dose: 0, horizon: 8 });
  const output = pk.simulate(c, 'No dialysis');
  for (const series of ['plasma', 'csf', 'cmmg']) {
    assert.ok(output[series].median.every(value => value === 0), series);
  }
  assert.ok(output.dialClear.median.every(value => value === 0));
});

test('each primary dialysis scenario produces finite concentration curves', () => {
  for (const mode of ['No dialysis', 'Intermittent HD', 'Peritoneal dialysis', 'CRRT']) {
    const output = pk.simulate(scenario({ crcl: 0 }), mode);
    assert.ok(output.time.length > 10, mode + ': expected time samples');
    assert.equal(output.time.at(-1), 12);
    assert.equal(output.plasma.median.length, output.time.length);
    assert.ok(output.plasma.median.every(Number.isFinite), mode + ': plasma must be finite');
    assert.ok(output.plasma.median.some(value => value > 0), mode + ': dose must produce exposure');
    if (mode === 'No dialysis') assert.ok(output.dialClear.median.every(v => v === 0));
    if (mode === 'Intermittent HD' || mode === 'CRRT') {
      assert.ok(output.dialClear.median.some(v => v > 0), mode + ': expected dialysis clearance');
    }
  }
});

test('simulator uses a same-origin Worker with shared engine', () => {
  const ui=read('public/assets/simulator-ui.js');
  const code=read('public/assets/simulator-worker.js');
  assert.ok(ui.includes("new Worker('/assets/simulator-worker.js')"));
  assert.ok(code.includes("importScripts('/assets/pk-engine.js')"));
  assert.ok(code.includes('self.RenalPKV7.simulateMany(config)'));
  assert.ok(!ui.includes("$('pk-engine').textContent"));
  const policy=read('src/index.js');
  assert.ok(policy.includes("worker-src 'self'"));
});

test('public citations and license links resolve to actual files', () => {
  for(const page of ['license','cite','disclaimer']){
    assert.ok(html.includes('href="/'+page+'/"'),page);
    const pageHtml=read('public/'+page+'/index.html');
    assert.ok(pageHtml.includes('<title>') && pageHtml.includes('rel="canonical"'),page);
  }
  assert.ok(read('CITATION.cff').includes('cff-version: 1.2.0'));
  assert.equal(read('public/CITATION.cff'),read('CITATION.cff'));
  assert.equal(read('public/LICENSE.txt'),read('LICENSE'));
  assert.equal(read('public/THIRD_PARTY_NOTICES.txt'),read('THIRD_PARTY_NOTICES.md'));
  assert.ok(read('THIRD_PARTY_NOTICES.md').includes('ECharts GL'));
  assert.ok(!html.includes('id="ayfluxLicense"'));
  assert.ok(!html.includes('id="ayfluxCitation"'));
});

test('the outdated research release label is absent', () => {
  assert.ok(!html.includes('Version 13 research tools:'));
  assert.ok(html.includes('Peritoneal dialysis (PD) exchange table:'));
});

test('CSV export is a single sharp-cornered field across browsers', () => {
  const markup = read('public/index.html');
  assert.ok(markup.includes('<div class="export-control"><select id="csv"'));
  assert.ok(!markup.includes('id="csvFormat"'));
  assert.ok(markup.includes('-webkit-appearance:none!important'));
  assert.ok(markup.includes('-moz-appearance:none!important'));
  assert.ok(markup.includes('border-radius:0!important'));
  assert.ok(markup.includes('class="export-picker"'));
  assert.ok(!markup.includes('class="btn export-picker"'));
});

test('R/OSP CSV export is wired and interoperability documentation exists', () => {
  const ui = read('public/assets/simulator-ui.js');
  const dataExchange = require('../public/assets/ayflux-exchange.js');
  assert.ok(html.includes('select id="csv"'));
  assert.ok(!html.includes('id="csvFormat"'));
  assert.ok(html.includes('id="csv"'));
  assert.ok(!html.includes('id="csvInterop"'));
  assert.ok(ui.includes("$('csv').addEventListener('change'"));
  assert.ok(html.includes('href="/learn/interoperability/"'));
  assert.ok(html.includes('src="./assets/ayflux-exchange.js"'));
  assert.ok(ui.includes("window.AyFluxExchange.exportTidyCSV"));
  assert.ok(read('public/learn/interoperability/index.html').includes('rel="canonical"'));
  assert.ok(read('public/sitemap.xml').includes('/learn/interoperability/'));
  const result = pk.simulate(scenario({ horizon: 2 }), 'No dialysis');
  const csv = dataExchange.exportTidyCSV({ 'No dialysis': result },
    ['No dialysis'], { coverage: 0.9 });
  assert.ok(csv.startsWith('time_hours,scenario,analyte,statistic,'));
  assert.ok(csv.includes('No dialysis,plasma_acyclovir,median,'));
  assert.ok(!csv.includes('NaN'));
});

test('v0.20 research workspace remains optional and has public sources', () => {
 const ui=read('public/assets/research-workspace.js');
 const index=read('public/index.html');
 assert.ok(index.includes('id="ospPanel"'));
 assert.ok(index.includes('id="runHeatmap"'));
 assert.ok(index.includes('id="runIntegrity"'));
 assert.ok(index.includes('id="printResearchReport"'));
 assert.ok(ui.includes('window.AyFluxResearchBridge'));
 assert.ok(index.includes('/manifest.webmanifest'));
 assert.ok(read('public/sw.js').includes('ayflux-static-v0.26.0'));
 assert.ok(read('public/manifest.webmanifest').includes('AyFlux'));
 assert.ok(read('CITATION.cff').includes('version: "0.26.0"'));
 assert.equal(read('CITATION.cff'),read('public/CITATION.cff'));
 assert.ok(read('CHANGELOG.md').includes('[0.26.0]'));
});
