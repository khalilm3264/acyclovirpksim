// Kably et al. 2025, doi:10.1093/jac/dkaf070, Tables 1, 3, 4 and 5.
// Order in each pair is acyclovir, then CMMG. Day-11 mass units throughout.
'use strict';
const assert = require('node:assert/strict');
const {day11} = require('./kably-auc-comparison.cjs');
const strata = [
  {egfr: '>90', crcls: [104,120], observedN: 33, simulatedN: 684, medianRatioPct: 30.4,
    q8: {auc: [44.8,13.3], cmin: [1.0,.5]}, q12: {auc: [29.9,8.9], cmin: [.4,.2]}},
  {egfr: '61–90', crcls: [75], observedN: 13, simulatedN: 236, medianRatioPct: 34.9,
    q8: {auc: [64.7,23.2], cmin: [1.7,.8]}, q12: {auc: [43.1,15.5], cmin: [.9,.5]}},
  {egfr: '31–60', crcls: [45], observedN: 3, simulatedN: 60, medianRatioPct: 47.6,
    q8: {auc: [63.6,37.7], cmin: [1.8,1.3]}, q12: {auc: [42.4,25.2], cmin: [.9,.9]}},
  {egfr: '<30', crcls: [15,25], observedN: 1, simulatedN: 20, medianRatioPct: 129.9,
    q8: {auc: [88.7,103.1], cmin: [3.7,3.8]}, q12: {auc: [59.1,68.8], cmin: [2.0,2.3]}}
];
const results = [];
for (const stratum of strata) {
  for (const crcl of stratum.crcls) {
    for (const every of [8,12]) {
      for (const slope of [2,3.7474]) {
        // At 70 kg the default is 2 mL/min per mL/min CrCl.
        const estimate = day11(crcl, every, slope / 2, .015625);
        const fine = day11(crcl, every, slope / 2, .0078125);
        for (const key of ['parent','metabolite']) {
          for (const endpoint of ['auc','predose','minimum']) {
            assert.ok(Math.abs(estimate[key][endpoint] / fine[key][endpoint] - 1) < .001,
              [crcl,every,slope,key,endpoint].join('/'));
          }
        }
        const ratioPct = 100 * fine.metabolite.auc / fine.parent.auc;
        results.push({egfr: stratum.egfr, crcl, every, slope, ...fine, ratioPct});
      }
    }
  }
}
assert.equal(strata.reduce((n, s) => n + s.observedN, 0), 50);
assert.equal(strata.reduce((n, s) => n + s.simulatedN, 0), 1000);
console.log(JSON.stringify({strata, results}, null, 2));
