// Burgess & Gill 1990, doi:10.1002/j.1552-4604.1990.tb03585.x.
// Run: node research/validation/burgess-iv-terminal.cjs.
// Four IV CAPD participants, Table I (p. 999); Methods pp. 997–998.
// Each row is [half-life h, total clearance mL/min, terminal Vd L/kg].
'use strict';
const assert = require('node:assert/strict');
const engine = require('../../public/assets/pk-engine.js');
const source = [[9.6, 49.9, .58], [9.3, 46.6, .62], [14.4, 31.7, .45], [19.3, 30.4, 1.00]];
const hours = [0, 1, 2, 3, 4, 6, 12, 24];
const windows = [[4, 6, 12, 24], [6, 12, 24], [12, 24]];
const mode = 'Peritoneal dialysis';
function estimate(weight, crcl, dose, step) {
  const config = {...structuredClone(engine.DEFAULTS), weight, crcl, crclSource: 'manual',
    renalMode: 'constant', route: 'Acyclovir IV', dosingMode: 'repeat', dose,
    infusion: 1, doseCount: 1, draws: 1, variability: 0, observations: [],
    pdMethod: 'manual', pdRxEnabled: true, horizon: 24,
    pdRxRows: [0, 6, 12, 18].map(start => ({start, dwell: 6, fill: 1.5, glucose: 1.5, uf: null})),
    trackMassBalance: true};
  assert.deepEqual(engine.validate(config, mode), []);
  const run = engine.single(config, engine.drawParams(config)[0], engine.scheduleFor(mode, config), step);
  assert.equal(run.drains.length, 4);
  assert.ok(run.drains.every(d => d.complete));
  const concentration = t => {
    const index = run.t.indexOf(t);
    assert.ok(index >= 0);
    return run.cols.plasma[index];
  };
  const auc24 = hours.slice(1).reduce((sum, h, i) => sum +
    (h - hours[i]) * (concentration(h) + concentration(hours[i])) / 2, 0);
  return windows.map(times => {
    const center = times.reduce((a, b) => a + b, 0) / times.length;
    const beta = -times.reduce((sum, t) => sum + (t - center) * Math.log(concentration(t)), 0) /
      times.reduce((sum, t) => sum + (t - center) ** 2, 0);
    assert.ok(beta > 0);
    // Source does not identify selected terminal points or its precise tail
    // convention. Extrapolate the final level at the scenario slope.
    const aucInf = auc24 + concentration(24) / beta;
    return {halfLife: Math.LN2 / beta, totalCl: dose / aucInf / .06};
  });
}
const results = [];
for (const [i, [halfLife, totalCl, volumePerKg]] of source.entries()) {
  // Approximate weight by the Vbeta = CL / beta identity, using the rounded
  // table entries. These weights are derived from endpoints, not raw inputs.
  const weight = totalCl * .06 * halfLife / Math.LN2 / volumePerKg;
  for (const crcl of [0, 5]) {
    const nominal = estimate(weight, crcl, 500, .125);
    const fine = estimate(weight, crcl, 500, .0625);
    const doubleDose = estimate(weight, crcl, 1000, .125);
    nominal.forEach((row, j) => {
      for (const key of Object.keys(row)) {
        assert.ok(Math.abs(row[key] / fine[j][key] - 1) < .001);
        assert.ok(Math.abs(row[key] / doubleDose[j][key] - 1) < 1e-9);
      }
    });
    results.push({subject: i + 1, weight, crcl, observed: {halfLife, totalCl}, nominal});
  }
}
console.log(JSON.stringify({windows, results}, null, 2));
// The two renal scenarios do not estimate individual residual CrCl. Drug
// elimination and the terminal fit both include ongoing CAPD exchanges.
// Two final samples give a two-point slope without a goodness-of-fit check.
