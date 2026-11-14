// Khajehdehi et al. Clin Nephrol 2000;54:351–355. PMID 11076113.
// One anuric patient studied on separate occasions. The abstract gives the two
// clearances, extraction percentages and estimated daily removal percentages.
// Detailed inputs are from the project's existing Table 1 / pp. 352–353
// transcription, not a new reading of the primary scan.
'use strict';
const assert = require('node:assert/strict');
const engine = require('../../public/assets/pk-engine.js');
const occasions = [
  {mode: 'CVVHD', weight: 92, outflowMlH: 1000, pre: 13, effluent: 11,
    dailyDose: 1500, reportedCl: 14, reportedRecovery: 18, hoursObserved: 6},
  {mode: 'CVVHDF', weight: 94, outflowMlH: 1700, pre: 13, effluent: 7.9,
    dailyDose: 500, reportedCl: 17, reportedRecovery: 65, hoursObserved: null}
];
const comparisons = occasions.map(row => {
  const ratio = row.effluent / row.pre; // same units for both concentrations (mg/L)
  const flow = row.outflowMlH / 1000;
  const config = {...engine.DEFAULTS, weight: row.weight, crcl: 0,
    crclSource: 'manual', renalMode: 'constant', effluent: row.outflowMlH / row.weight,
    variability: 0, draws: 1};
  const clearance = overrides => engine.drawParams({...config, ...overrides})[0].crrt / .06;
  const fromEffluent = clearance({sieving: ratio, delivered: 1});
  assert.ok(Math.abs(fromEffluent - ratio * row.outflowMlH / 60) < 1e-9);
  assert.ok(Math.abs(fromEffluent - row.reportedCl) < .5);
  const dailyMgAtFixedConcentration = row.effluent * flow * 24;
  const recoveryPct = 100 * dailyMgAtFixedConcentration / row.dailyDose;
  // Published percentages are approximate, rounded from finite-precision inputs.
  assert.ok(Math.abs(recoveryPct - row.reportedRecovery) < 1);
  return {...row, saturationPct: ratio*100, fromEffluentMlMin: fromEffluent,
    defaultMlMin: clearance({}), fullDeliveryNominalMlMin: clearance({delivered: 1}),
    dailyMgAtFixedConcentration, recoveryPct,
    sixHourProjectionMg: row.hoursObserved ? row.effluent*flow*row.hoursObserved : null};
});
console.log(JSON.stringify(comparisons, null, 2));
