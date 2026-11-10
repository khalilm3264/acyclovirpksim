'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { toZengUnits, zengParameters, compare } = require('../research/pediatric/compare.cjs');
test('Zeng Table 3 reference values survive indexed renal unit conversion', () => {
  const indexed = 3.7 * 1000 / 60 * 1.73;
  assert.ok(Math.abs(toZengUnits(indexed) - 3.7) < 1e-12);
  const p = zengParameters(19.6, indexed);
  assert.ok(Math.abs(p.cl - 3.55) < 1e-12);
  assert.ok(Math.abs(p.v - 7.36) < 1e-12);
  assert.throws(() => zengParameters(19.6, 30), RangeError);
});
test('comparison uses overlapping covariate ranges and exact dose/clearance AUC', () => {
  for (const row of compare()) for (const name of ['abdalla', 'zeng']) {
    const s = row[name];
    assert.ok(Math.abs(s.aucPerInterval * s.cl - row.weightKg * row.doseMgKg) < 1e-10);
    assert.ok(s.ssPeak > s.ssTrough && s.ssTrough > 0);
  }
});
