'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const pk = require('../public/assets/pk-engine.js');
const forecast = require('../public/learn/model-methods/post-hd.js');

// Almond 1995, Tables 1–2. IDs 3 and 6 lack a disconnect concentration.
// Expected forecasts from independent quadrature and a matrix exponential.
const cases = [
  [1, 74.5, 5, 4.38, 1.77, 1.96, 1.9564],
  [2, 60,   4, 1.78, 0.17, 0.21, 0.3361],
  [4, 68,   4, 1.13, 0.52, 0.56, 0.5701],
  [5, 55.5, 4, 2.24, 1.28, 1.79, 1.3302],
  [7, 57.5, 4, 2.26, 2.25, 1.46, 2.1079]
];
test('one-hour forecasts reproduce the Almond comparison without the one-hour level as input', () => {
  let modelError = 0, baselineError = 0;
  for (const [id, weight, hours, before, end, observed, expected] of cases) {
    const estimate = forecast(pk, {weight, hours, before, end});
    assert.ok(Math.abs(estimate - expected) < 0.00006, 'patient ' + id);
    modelError += Math.abs(estimate - observed);
    baselineError += Math.abs(end - observed);
  }
  assert.equal((modelError / cases.length).toFixed(3), '0.249');
  assert.equal((baselineError / cases.length).toFixed(3), '0.314');
});
test('requires quantified positive inputs and handles the limiting interpolation slope', () => {
  const args = { weight: 70, hours: 4, before: 2, end: 1 };
  for (const key of Object.keys(args)) {
    assert.throws(() => forecast(pk, {...args, [key]: 0}), RangeError);
  }
  const end = 2 * Math.exp(-4 * 10 / (0.37 * 70));
  const central = forecast(pk, {...args, end});
  const nearby = forecast(pk, {...args, end: end * (1 + 1e-8)});
  assert.ok(central > 0 && Math.abs(central - nearby) < 1e-7);
});

test('CRRT comparisons keep hours equal and produce identical results without interruption', () => {
  const compare = require('../public/learn/model-methods/crrt-interruption.js');
  for (const duration of [0, 2, 4, 8]) {
    const [early, late] = compare(pk, duration);
    assert.equal(early.hours, 24-duration);
    assert.equal(early.hours, late.hours);
    if (duration === 0) {
      assert.equal(early.plasma, late.plasma);
      assert.equal(early.removed, late.removed);
    } else {
      assert.equal(early.start, 1);
      assert.equal(late.end, 24);
      assert.ok(late.plasma > early.plasma);
      assert.ok(late.removed > early.removed && late.removed < 700);
    }
  }
});
