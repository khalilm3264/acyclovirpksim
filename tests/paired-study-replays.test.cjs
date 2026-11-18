'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { compare, errorFor } = require('../public/assets/paired-study-replays.js');

test('isolating parent renal clearance helps the Kacirova trough and worsens the post-infusion fit', () => {
  const replay = compare('kacirova');
  assert.equal(replay.change.variant, replay.change.baseline * 0.75);
  const [trough, postInfusion] = replay.rows.filter((row) => row.analyte === 'Acyclovir');
  assert.equal(trough.phase, 'Predose trough');
  assert.equal(trough.evidence, 'Individual assay');
  assert.equal(trough.time, 64);
  assert.equal(trough.value, 1.7);
  assert.equal(trough.variantError.signed, trough.variant - trough.value);
  assert.ok(trough.variantError.absolute < trough.baselineError.absolute);
  assert.ok(postInfusion.variantError.absolute > postInfusion.baselineError.absolute);
});

test('the renal comparison has zero effect with no residual kidney function', () => {
  for (const id of ['laskin-anuric', 'boelaert-4']) {
    const replay = compare(id);
    assert.equal(replay.change.baseline, 0);
    assert.equal(replay.change.variant, 0);
    for (const row of replay.rows) assert.equal(row.baseline, row.variant);
  }
});

test('Smith uses a shared AUC interval and the CSF change leaves systemic CMMG unchanged', () => {
  const replay = compare('smith-ckd');
  const [systemic, csf] = replay.rows;
  assert.deepEqual(systemic.window, [48, 60]);
  assert.deepEqual(csf.window, systemic.window);
  assert.equal(systemic.specimen, 'Serum');
  assert.equal(systemic.modelSpecimen, 'Plasma');
  assert.equal(csf.evidence, 'Published group mean');
  assert.equal(csf.unit, 'mg·h/L');
  assert.equal(systemic.baseline, systemic.variant);
  assert.ok(csf.variantError.absolute > csf.baselineError.absolute);
  assert.match(replay.note, /not independent/);
});

test('CAPD recovery pairs each collected mass with its matching dose denominator', () => {
  const replay = compare('boelaert-4');
  assert.equal(replay.rows[0].evidence, 'Author-fitted value');
  const [daily, course] = replay.recovery;
  assert.deepEqual(daily.window, [96, 120]);
  assert.deepEqual(course.window, [0, 120]);
  assert.equal(daily.baseline.dose, 142);
  assert.equal(course.baseline.dose, 710);
  assert.ok(daily.baseline.mass > 0);
  assert.ok(daily.baseline.mass < course.baseline.mass);
  assert.equal(daily.baseline.percent, (100 * daily.baseline.mass) / daily.baseline.dose);
  assert.deepEqual(daily.baseline, daily.variant);
});

test('a below-limit observation yields a bound comparison without fabricated numeric error', () => {
  const reference = { value: 0.5, upperBound: true };
  assert.deepEqual(errorFor(0.4, reference), { compatible: true, signed: null, absolute: null });
  assert.deepEqual(errorFor(0.5, reference), { compatible: false, signed: null, absolute: null });
});
