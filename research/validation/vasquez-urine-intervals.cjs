// Vasquez Vasquez et al. 2025, Table 1A and pp. 2470–2472, DOI 10.1002/bcp.70138.
'use strict';
const assert = require('node:assert/strict');
const {simulateCourse} = require('./vasquez-hd.cjs');

const urineMg = [4.51, 0.600 * 22];
const plasmaBetween = [3.2, 2.1]; // end of session 1, before session 2
const duration = 14;
const linearAuc = duration * (plasmaBetween[0] + plasmaBetween[1]) / 2;
const logLinearAuc = duration * (plasmaBetween[0] - plasmaBetween[1]) /
  Math.log(plasmaBetween[0] / plasmaBetween[1]);
const clearance = auc => urineMg[1] / auc / 0.06; // (mg)/(mg h/L) -> mL/min
const observedInlet = [2.0, 1.2, 0.99, 1.0];
const duringHD = [0, 1, 2, 2.5];

function endpoints(delay, step) {
  const {admission, hd1, hd2, run, at} = simulateCourse(delay, step);
  const urine = [[admission, hd1.start], [hd1.end, hd2.start]]
    .map(([start, end]) => at(end).kidney - at(start).kidney);
  const cl = run.cols.kidneyClear[0];
  let aucBetween = 0;
  for (let i = run.t.indexOf(hd1.end) + 1; i <= run.t.indexOf(hd2.start); i++) {
    aucBetween += (run.t[i] - run.t[i - 1]) * (run.cols.plasma[i] + run.cols.plasma[i - 1]) / 2;
  }
  // Independently integrate central plasma over the second collection.
  assert.ok(Math.abs(aucBetween * cl * 0.06 - urine[1]) < 0.002);
  const inlet = duringHD.map(h => at(hd2.start + h).plasma);
  return {urine, aucBetween, cl, inlet, inletFraction: inlet.map(c => c / inlet[0])};
}

const reconstructions = [0, 4, 8].map(admissionDelay => {
  const coarse = endpoints(admissionDelay, 0.125);
  const fine = endpoints(admissionDelay, 0.0625);
  for (const key of Object.keys(fine)) {
    [].concat(fine[key]).forEach((value, i) =>
      assert.ok(Math.abs(value - [].concat(coarse[key])[i]) < 0.001, key));
  }
  return {admissionDelay, ...fine};
});
console.log(JSON.stringify({urineMg, linearAuc, logLinearAuc,
  renalClearanceMlMin: {linear: clearance(linearAuc), logLinear: clearance(logLinearAuc)},
  duringHD, observedInlet, observedFraction: observedInlet.map(x => x / observedInlet[0]),
  reconstructions}, null, 2));
