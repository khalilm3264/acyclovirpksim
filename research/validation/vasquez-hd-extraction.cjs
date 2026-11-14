// node research/validation/vasquez-hd-extraction.cjs
// Vasquez Vasquez et al., doi:10.1002/bcp.70138, Table 1A/B and Fig. 2.
// One 150-minute HD session, zero ultrafiltration, no extra drug doses.
// Flow rates mL/min, concentrations mg/L, times minutes.
'use strict';
const assert = require('node:assert/strict');
const {simulate} = require('./vasquez-hd.cjs');
const times = [0, 60, 120, 150];
const inlet = [2.0, 1.2, .99, 1.0], outlet = [.79, .56, .50, .45];
const bloodFlow = 250, dialysateFlow = 500;
const extraction = inlet.map((v, i) => 1 - outlet[i] / v);
function auc(values) {
  return values.slice(1).reduce((sum, current, i) => sum +
    (times[i + 1] - times[i]) * (values[i] + current) / 2, 0);
}
// Fig. 2 gives y = 1.4336 exp(-0.007 x), µg/mL (= mg/L), x in min.
const effluentAuc = 1.4336 * -Math.expm1(-.007 * 150) / .007;
const effluentMass = effluentAuc * dialysateFlow / 1000;
assert.ok(Math.abs(effluentMass - 66.6) < .1);
const inletAuc = auc(inlet);
const effluentClearance = effluentMass / inletAuc * 1000;
const clearanceAtUnitBloodPlasmaRatio = bloodFlow * (1 - auc(outlet) / inletAuc);
// Conditional on a constant whole-blood/plasma ratio on BOTH sides, no
// ultrafiltration, and linear interpolation between sparse blood samples.
const bloodMassAtUnitRatio = clearanceAtUnitBloodPlasmaRatio * inletAuc / 1000;
const ratioNeeded = effluentMass / bloodMassAtUnitRatio;
// Table II of de Miranda et al. (1981) gives total radioactivity clearance
// by plasma and whole blood in the same participants. AUCblood/AUCplasma
// equals CLplasma/CLblood for the same tracer input and body-surface factor.
const clearancePairs = [
  ['VMB',238,209], ['EJH',260,244], ['MAM',291,276], ['GSS',265,248]
];
const tracerComparison = clearancePairs.map(([id,plasma,blood]) => {
  const tracerAucRatio = plasma / blood;
  return {id,plasma,blood,tracerAucRatio,
    conditionalBloodMassMg: bloodMassAtUnitRatio * tracerAucRatio};
});
// Table 1B's haematocrit row reads 26.7 g/dL. Treat 26.7 as percent
// for this additional sensitivity, with the same Hct in inlet and outlet.
const assumedHct = .267;
const requiredCellToPlasma = (ratioNeeded - (1 - assumedHct)) / assumedHct;
const minimumInletBloodToPlasma = effluentMass / (bloodFlow * inletAuc / 1000);
const summaries = [81.8, clearanceAtUnitBloodPlasmaRatio, effluentClearance].map(hdCl => {
  // Existing case reconstruction with an assumed four-hour last-dose lag.
  // Use the same CL for both sessions as a sensitivity. HD1 CL is unmeasured.
  const endpoints = simulate(4, .125, {hdCl});
  const fine = simulate(4, .0625, {hdCl});
  endpoints.forEach((r, i) => assert.ok(Math.abs(r[2] - fine[i][2]) < .001));
  return {hdCl, endpoints};
});
console.log(JSON.stringify({extraction, inletAuc, effluentAuc, effluentMass,
  bloodMassAtUnitRatio, clearanceAtUnitBloodPlasmaRatio, effluentClearance, ratioNeeded, tracerComparison, assumedHct, requiredCellToPlasma,
  minimumInletBloodToPlasma, summaries}, null, 2));
// The implied ratio is a reconciliation calculation. Blood/plasma partition
// was unknown (Table 1B). It cannot be inferred uniquely from these results.
// Model comparisons using the effluent-derived clearance reuse observed data.
