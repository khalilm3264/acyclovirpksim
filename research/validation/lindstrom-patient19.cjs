// node research/validation/lindstrom-patient19.cjs
// Lindström 2019, doi:10.1093/jac/dkz357, Table 1 and supplementary Case series.
// Female, age 75, 57 kg; IV acyclovir 10 mg/kg q8h; 7 h since last dose.
// Observed concentrations below in µmol/L, albumin quotient in units of 10⁻³.
// The first renal number is a cystatin-C CAPA GFR, the second is the authors'
// CrCl estimate. Entering the numerical GFR as absolute CrCl is a sensitivity
// assumption. This neither converts between the estimators nor measures CrCl.
'use strict';
const assert = require('node:assert/strict');
const engine = require('../../public/assets/pk-engine.js');
const visits = [
  {id: '19a', day: 7, gfr: 30, crcl: 54, albuminQuotient: 162.4,
    observed: {plasma: 15, cmmg: 5.2, csf: 28, csfCmmg: 6.4}},
  {id: '19b', day: 14, gfr: 52, crcl: 68, albuminQuotient: 108.1,
    observed: {plasma: 13, cmmg: 3.6, csf: 27, csfCmmg: 3.8}}
];

// Reconstruct each visit separately. Assume 1-hour infusions, three doses
// per treatment day, and constant renal function over each reconstruction.
// The damaged-barrier preset was informed by this cohort.
function simulate(visit, crcl, dt) {
  const count = visit.day * 3;
  const config = {...structuredClone(engine.DEFAULTS), ...engine.CSF_BARRIER.damaged,
    age: 75, sex: 'female', weight: 57, renalMode: 'constant', crclSource: 'manual',
    crcl, route: 'Acyclovir IV', dose: 570, infusion: 1, dosingMode: 'repeat',
    every: 8, doseCount: count, horizon: (count - 1) * 8 + 7,
    draws: 1, variability: 0, observations: []};
  assert.deepEqual(engine.validate(config, 'No dialysis'), []);
  const doses = engine.buildDoses(config);
  assert.equal(doses.length, count);
  assert.equal(config.horizon - doses.at(-1).time, 7);
  const run = engine.single(config, engine.drawParams(config)[0], [], dt, doses);
  const concentration = key => run.cols[key].at(-1) / (key.toLowerCase().includes('cmmg') ? .23919 : .22521);
  return Object.fromEntries(Object.keys(visit.observed).map(key => [key, concentration(key)]));
}
for (const visit of visits) {
  const rows = [];
  for (let crcl = visit.gfr; crcl <= visit.crcl; crcl++) {
    const result = simulate(visit, crcl, 1 / 64);
    const fine = simulate(visit, crcl, 1 / 128);
    for (const key of Object.keys(result)) assert.ok(Math.abs(result[key] / fine[key] - 1) < .001);
    rows.push({crcl, ...result, csfToPlasmaCmmg: result.csfCmmg / result.cmmg});
  }
  console.log(JSON.stringify({visit, observedCsfToSerumCmmg: visit.observed.csfCmmg / visit.observed.cmmg, rows}));
}
