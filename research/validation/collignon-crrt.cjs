'use strict';

const assert = require('node:assert/strict');
const engine = require('../../public/assets/pk-engine.js');
// Table 1. Samples from two infusions one day apart, not a single serial curve.
const samples = [
  {hour: 1, pre: 28, post: 20.9, effluent: 15.6, bloodClearance: 19.2, effluentClearance: 27.6},
  {hour: 2, pre: 10.93, post: 8.26, effluent: 9.34, bloodClearance: 19.8, effluentClearance: 42},
  {hour: 4, pre: 7.03, post: 5.26, effluent: 5.34, bloodClearance: 21.8, effluentClearance: 37.9},
  {hour: 5, pre: 4.87, post: 3.59, effluent: 4.37, bloodClearance: 24.6, effluentClearance: 44.1},
  {hour: 7, pre: 2.65, post: 2.03, effluent: 2.17, bloodClearance: 26.3, effluentClearance: 40.3},
  {hour: 8, pre: 3.15, post: 2.51, effluent: 2.8, bloodClearance: 21.2, effluentClearance: 44.3}
];
function clearance(effluent, sieving, delivered) {
  const config = {...engine.DEFAULTS, weight: 10, draws: 1, variability: 0,
    effluent, sieving, delivered};
  return engine.drawParams(config)[0].crrt / 0.06;
}
assert.ok(Math.abs(clearance(295, 0.95, 0.85) - 39.7020833333) < 1e-8);
assert.equal(clearance(295, 0.95, 0), 0);
console.log('| Sample | Published blood-based clearance | Published effluent-based clearance | Default coefficients at reported flow | Measured effluent/plasma ratio at reported flow |');
console.log('|---|---:|---:|---:|---:|');
for (const sample of samples) {
  const range = (sieving, delivered) => [295, 299]
    .map(flow => clearance(flow, sieving, delivered).toFixed(2)).join('–');
  console.log('| H' + sample.hour + ' | ' + [sample.bloodClearance,
    sample.effluentClearance, range(0.95, 0.85),
    range(sample.effluent / sample.pre, 1)].join(' | ') + ' |');
}
