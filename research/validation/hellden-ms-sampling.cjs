'use strict';
// Helldén et al., JAC 2006, doi:10.1093/jac/dkl067, Table 1, rows 1–10.
// These participants also appeared in Lycke 2003. The observed serum entries
// are geometric means of the 2 h and 8 h samples. Figure 2 has no subject IDs.
const assert = require('node:assert/strict');
const engine = require('../../public/assets/pk-engine.js');

// Age (years), sex, weight (kg), estimated CrCl (mL/min), and the published
// serum acyclovir and CMMG values (µmol/L), in Table 1 subject order.
const participants = [
  [38, 'female', 90, 112, 9.0, 0.7],
  [20, 'female', 62, 91, 7.3, 1.0],
  [31, 'male', 85, 109, 6.7, 0.6],
  [36, 'female', 62, 68, 14.6, 1.0],
  [25, 'female', 64, 85, 7.5, 0.4],
  [25, 'male', 87, 130, 8.4, 0.6],
  [33, 'female', 70, 89, 8.2, 0.8],
  [32, 'female', 53, 65, 8.6, 0.9],
  [25, 'female', 57, 84, 5.9, 0.7],
  [46, 'female', 60, 69, 7.4, 0.8]
];

function compare(participant, doseCount) {
  const [age, sex, weight, crcl, serumAcv, serumCmmg] = participant;
  const horizon = doseCount * 8;
  const config = {...structuredClone(engine.DEFAULTS), age, sex, weight, crcl,
    route: 'Valacyclovir oral', dose: 1000, every: 8, doseCount, horizon,
    dosingMode: 'repeat', renalMode: 'constant', crclSource: 'manual',
    draws: 1, variability: 0, observations: []};
  assert.deepEqual(engine.validate(config, 'No dialysis'), []);
  const run = engine.single(config, engine.drawParams(config)[0], [], 0.125, engine.buildDoses(config));
  const indices = [horizon - 6, horizon].map(time => run.t.indexOf(time));
  assert.ok(indices.every(i => i >= 0));
  function ratio(curve, molarMass, observed) {
    const [early, late] = indices.map(i => curve[i]);
    return Math.sqrt(early * late) * 1000 / molarMass / observed;
  }
  return {acyclovir: ratio(run.cols.plasma, 225.21, serumAcv), cmmg: ratio(run.cols.cmmg, 239.19, serumCmmg)};
}

// Use once-every-8-hours administration. The Lycke study sampled after six
// days of treatment. Verify that a longer approach to steady state agrees.
const rows = participants.map((participant, i) => {
  const result = compare(participant, 19);
  const extended = compare(participant, 39);
  for (const key of Object.keys(result)) assert.ok(Math.abs(result[key] - extended[key]) < 1e-5);
  return {subject: i + 1, ...result};
});
console.table(rows);
for (const key of ['acyclovir', 'cmmg']) {
  const ratios = rows.map(row => row[key]);
  const gmr = Math.exp(ratios.reduce((sum, r) => sum + Math.log(r), 0) / ratios.length);
  console.log(key, {geometricMeanPredictedObserved: gmr, withinTwofold: ratios.filter(r => r >= 0.5 && r <= 2).length, n: ratios.length});
}
