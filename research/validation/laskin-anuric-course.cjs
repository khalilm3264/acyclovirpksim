// Reproduce with: node research/validation/laskin-anuric-course.cjs
// Six anuric participants, one 2.5 mg/kg IV dose, one six-hour HD session.
// Am J Med 1982, doi:10.1016/0002-9343(82)90090-0, Table I.
// Clin Pharmacol Ther 1982, doi:10.1038/clpt.1982.83, Tables I and III.
// Matching cohort descriptors and shared outcomes: count six people once.
'use strict';
const assert = require('node:assert/strict');
const engine = require('../../public/assets/pk-engine.js');

const predialysis = [[1, 37.5], [2, 17.6], [8, 10.3], [12, 8.9], [24, 6.4], [48, 2.74]];
// Time since HD start, arterial (inlet) group mean in µmol/L.
// AyFlux plasma represents systemic concentration; no venous-outlet prediction.
const inlet = [[0.1, 2.10], [1, 1.86], [2, 1.61], [3, 1.37], [4, 1.25], [5, 1.14], [6, 1.00]];
const sampleTimes = [
  ...predialysis.map(([hour, mean]) => ({phase: 'before HD', hour, mean})),
  ...inlet.map(([elapsed, mean]) => ({phase: 'HD inlet', hour: 48 + elapsed, mean})),
  // Table I labels this 54.5 h, while actual lag after HD varied 15–90 min.
  {phase: 'post-HD nominal', hour: 54.5, mean: 1.12}
];

function simulate(weight, step) {
  const config = {...structuredClone(engine.DEFAULTS), age: 46, weight, crcl: 0,
    crclSource: 'manual', renalMode: 'constant', route: 'Acyclovir IV',
    dose: 2.5 * weight, every: 24, infusion: 1, dosingMode: 'repeat', doseCount: 1,
    horizon: 56, variability: 0, draws: 1, observations: [], hdCl: 81.8,
    schedule: [{type: 'HD', start: 48, end: 54}]};
  const mode = 'Custom sequence';
  assert.deepEqual(engine.validate(config, mode), []);
  const run = engine.single(config, engine.drawParams(config)[0],
    engine.scheduleFor(mode, config), step, engine.buildDoses(config));
  return sampleTimes.map(({hour}) => {
    const i = run.t.findIndex(time => Math.abs(time - hour) < 1e-8);
    assert.ok(i >= 0);
    return run.cols.plasma[i] * 1000 / 225.21;
  });
}

// Average predicted values over all six reported weights. This comparison
// uses group means and requires no matching of IDs across publications.
// The clearance of 81.8 mL/min is from this cohort and anchors the HD default.
const weights = [74, 57, 48, 52.9, 50.1, 63.2];
const curves = weights.map(weight => simulate(weight, 0.1));
const finer = weights.map(weight => simulate(weight, 0.05));
const singleWeight = simulate(57.5, 0.1);
console.table(sampleTimes.map((sample, i) => {
  const predicted = curves.reduce((sum, curve) => sum + curve[i], 0) / curves.length;
  for (const [j, curve] of curves.entries()) assert.ok(Math.abs(curve[i] - finer[j][i]) < 0.001);
  return {...sample, predictedMean: +predicted.toFixed(3), meanWeightRun: +singleWeight[i].toFixed(3),
    predictedObservedRatio: +(predicted / sample.mean).toFixed(3)};
}));
