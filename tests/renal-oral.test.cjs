'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const dir = path.join(__dirname, '../research/validation/renal-oral');
const run = (...args) => execFileSync(process.execPath, args, { encoding: 'utf8' });

function close(a, b, where = '') {
  if (Array.isArray(a)) {
    assert.equal(a.length, b.length, where);
    a.forEach((v, i) => close(v, b[i], `${where}[${i}]`));
  } else if (a && typeof a === 'object') {
    assert.deepEqual(Object.keys(a), Object.keys(b), where);
    for (const k of Object.keys(a)) close(a[k], b[k], `${where}.${k}`);
  } else if (typeof a === 'number') {
    assert.ok(Math.abs(a - b) <= 1e-12 * Math.max(1, Math.abs(a)), `${where}: ${a} vs ${b}`);
  } else assert.equal(a, b, where);
}

test('Hara and Smith renal oral replays reproduce their stored scores', () => {
  for (const study of ['hara', 'smith']) {
    const stored = JSON.parse(fs.readFileSync(path.join(dir, study, 'scores.json'), 'utf8'));
    close(JSON.parse(run(path.join(dir, study, 'score.cjs'))), stored, study);
  }
});

test('Renal oral page data is generated from the stored scores', () => {
  assert.match(run(path.join(dir, 'build-page-data.cjs'), '--check'), /Verified 6 renal oral/);
  global.window = {};
  require('../public/experimental/renal-oral/data.js');
  const { cases, kTr, lag } = global.window.renalOralData;
  delete global.window;
  assert.equal(kTr, 1.636);
  assert.equal(lag, 0.59);
  const hara = cases.filter((c) => c.study === 'hara');
  const smith = cases.find((c) => c.id === 'smith-ckd-70');
  // The page's headline: Hara exposure too high and Smith too low for every absorption model.
  for (const c of hara) for (const m of Object.values(c.models)) assert.ok(m.aucPO > 1.04);
  for (const m of Object.values(smith.models)) assert.ok(m.aucPO < 0.66);
});
