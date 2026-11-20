'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { run } = require('../research/verification/dialysis-sampling.cjs');
const published = require('../public/research/sampling/dialysis-data.json');

test('dialysis sampling results reproduce and compare an identical withheld trough', () => {
  const result = run();
  assert.deepEqual(result, published);
  assert.deepEqual(result.scenarios.map(({ id }) => id), ['hd', 'capd']);
  for (const scenario of result.scenarios) {
    const sampleTimes = scenario.designs.map(({ times }) => times);
    const first = result.firstTrough;
    assert.deepEqual(sampleTimes, [[first], [first, 25.5], [first, scenario.boundary], [first, 48]]);
    assert.ok(sampleTimes.flat().every(time => time < result.heldOutTime));
    for (const design of scenario.designs) {
      assert.ok(Number.isFinite(design.medianError) && design.medianError >= 0);
      assert.ok(design.covered >= 0 && design.covered <= result.trials);
    }
  }
});

test('dialysis sampling headline metrics are stable with a halved solver step', () => {
  const fine = run(published.dt / 2);
  fine.scenarios.forEach((scenario, i) => scenario.designs.forEach((design, j) => {
    const baseline = published.scenarios[i].designs[j];
    assert.ok(Math.abs(design.medianError - baseline.medianError) < 0.001);
    assert.ok(Math.abs(design.medianWidth - baseline.medianWidth) < 0.001);
    assert.equal(design.covered, baseline.covered);
  }));
});
