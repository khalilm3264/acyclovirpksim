'use strict';

const assert = require('node:assert/strict');
const pk = require('../../public/assets/pk-engine.js');

function predict(scrUmol, sampledDoseIndex, infusion, dt) {
  const start = sampledDoseIndex * 8;
  const sample = start + infusion + 25 / 60;
  const config = pk.effectiveConfig({
    ...pk.DEFAULTS, age: 36, sex: 'male', weight: 86, scr: scrUmol / 88.4,
    crclSource: 'estimated', dosingMode: 'custom', draws: 1, variability: 0,
    horizon: start + 4,
    customDoses: Array.from({length: sampledDoseIndex + 1}, (_, i) => ({
      time: i * 8, route: 'Acyclovir IV', amount: i < 6 ? 750 : 850, infusion
    }))
  });
  assert.deepEqual(pk.validate(config, 'No dialysis'), []);
  const run = pk.single(config, pk.drawParams(config)[0], [], dt, pk.buildDoses(config));
  function at(hour, column) {
    const index = run.t.findIndex(t => Math.abs(t - hour) < 1e-7);
    assert.ok(index >= 0, 'Missing sampling time ' + hour);
    return run.cols[column][index];
  }
  return [at(start, 'plasma'), at(sample, 'plasma'), at(start, 'cmmg'), at(sample, 'cmmg')];
}

const reference = predict(87, 8, 1, 1/12);
const observations = [1.7, 8.9, 0.27, 0.64];
const endpoints = ['Acyclovir trough', 'Acyclovir +25 min', 'CMMG trough', 'CMMG +25 min'];
const grid = [];
for (const scr of [86, 87, 102]) {
  for (const index of [7, 8, 9]) {
    for (const infusion of [1, 2]) {
      const prediction = predict(scr, index, infusion, 1/12);
      const fine = predict(scr, index, infusion, 1/24);
      prediction.forEach((value, i) => assert.ok(Math.abs(value - fine[i]) < 0.001));
      grid.push(prediction);
    }
  }
}
console.log('| Serum endpoint | Measured | Predicted | Predicted minus measured | Scenario range |');
console.log('|---|---:|---:|---:|---:|');
endpoints.forEach((label, i) => {
  const values = grid.map(row => row[i]);
  console.log('| ' + [label, observations[i], reference[i].toFixed(2),
    (reference[i] - observations[i]).toFixed(2),
    Math.min(...values).toFixed(2) + '–' + Math.max(...values).toFixed(2)].join(' | ') + ' |');
});
