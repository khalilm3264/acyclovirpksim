// Weller et al., DOI 10.1038/clpt.1993.196, pp. 596–600, 602, Tables I, II, IV.
// Run with node research/validation/weller-single-dose.cjs. Research comparison.
'use strict';
const assert = require('node:assert/strict');
const engine = require('../../public/assets/pk-engine.js');

// Dose (mg valacyclovir base), n, mean plasma peak (µg/mL), mean Tmax (h),
// mean AUC to infinity (µg·h/mL), 24-hour urinary unchanged ACV (% molar dose).
// Each endpoint is an aggregate of individual estimates. One participant
// withdrew after 100 mg. The remaining seven completed the escalation.
const study = [
  [100, 8, 0.83, 0.88, 2.28, 75.9],
  [250, 7, 2.15, 1.04, 5.76, 65.0],
  [500, 7, 3.28, 1.50, 11.59, 71.6],
  [750, 7, 4.17, 1.46, 14.11, 49.0],
  [1000, 7, 5.65, 1.75, 19.52, 44.3]
];
const samples = [0, .25, .5, .75, 1, 1.5, 2, 2.5, 3, 4, 6, 8, 10, 12, 16, 24];
const crcl = 71.8 * 1.91 / 1.73; // Table I group means, approximate absolute mL/min.

function simulate(dose, step) {
  const config = {...structuredClone(engine.DEFAULTS), dose, weight: 74.6, crcl,
    route: 'Valacyclovir oral', doseCount: 1, dosingMode: 'repeat',
    renalMode: 'constant', crclSource: 'manual', variability: 0, draws: 1,
    observations: [], trackMassBalance: true, horizon: 24};
  assert.deepEqual(engine.validate(config, 'No dialysis'), []);
  const params = engine.drawParams(config)[0];
  const run = engine.single(config, params, [], step);
  const concentrations = samples.map(time => {
    const index = run.t.indexOf(time);
    assert.ok(index >= 0);
    return run.cols.plasma[index];
  });
  const peak = Math.max(...concentrations);
  const equivalentMg = dose * 225.21 / 324.34;
  // Exact model AUC∞ for this linear system with complete depot input.
  // The paper used trapezoids plus terminal extrapolation on individual data.
  const auc = equivalentMg * params.oralF / (params.renal + params.other + params.form);
  const final = run.accounting.at(-1);
  assert.ok(Math.abs(final.residual) < 1e-7);
  return {peak, tmax: samples[concentrations.indexOf(peak)], auc,
    urine: 100 * final.parts.kidney / equivalentMg};
}

const rows = study.map(([dose, n, peak, tmax, auc, urine]) => {
  const model = simulate(dose, 1 / 32);
  const fine = simulate(dose, 1 / 64);
  for (const key of ['peak', 'urine']) assert.ok(Math.abs(model[key] / fine[key] - 1) < .001);
  assert.equal(model.tmax, fine.tmax);
  return {dose, n, observed: {peak, tmax, auc, urine}, model};
});
for (const row of rows) {
  for (const key of ['peak', 'auc']) {
    assert.ok(Math.abs(row.model[key] / rows[0].model[key] - row.dose / 100) < 1e-8);
  }
  assert.equal(row.model.tmax, rows[0].model.tmax);
  assert.ok(Math.abs(row.model.urine - rows[0].model.urine) < 1e-8);
}
console.log(JSON.stringify({crcl, rows}, null, 2));
