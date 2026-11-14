// node research/validation/krasny-hd-recovery.cjs
// Krasny et al., Am J Med 1982, doi:10.1016/0002-9343(82)90091-2, pp. 202–204.
// Six anuric patients for plasma endpoints, three with effluent in Table I.
// The overlapping Laskin reports should not be counted as separate replication.
'use strict';
const assert = require('node:assert/strict');
const engine = require('../../public/assets/pk-engine.js');
const source = {
  peakPlasma: 37.5, at24h: 6.44, beforeHD: 3.03, endHD: 1.21, // µmol/L
  meanIndividualPlasmaFallPct: 61.5,
  // Predialysis burden (µmol) estimated by authors as Cpre × Vbeta;
  // fraction of this estimate recovered (%); effluent-based CL (mL/min).
  recovery: [[192.3, 41, 133.8], [106.9, 30, 89.2], [125.8, 45, 115.3]]
};
function simulate(weight, hdCl, dt) {
  const config = {...structuredClone(engine.DEFAULTS), weight, crcl: 0,
    renalMode: 'constant', crclSource: 'manual', route: 'Acyclovir IV',
    dose: 2.5 * weight, infusion: 1, doseCount: 1, dosingMode: 'repeat',
    horizon: 55, hdCl, schedule: [{type: 'HD', start: 47, end: 53}],
    trackMassBalance: true, draws: 1, variability: 0, observations: []};
  const mode = 'Custom sequence';
  assert.deepEqual(engine.validate(config, mode), []);
  const p = engine.drawParams(config)[0];
  const run = engine.single(config, p, engine.scheduleFor(mode, config), dt);
  const at = h => {
    const i = run.t.indexOf(h);
    assert.ok(i >= 0);
    return {plasma: run.cols.plasma[i], ...run.accounting[i].parts};
  };
  const pre = at(47), end = at(53);
  const burden = pre.central + pre.peripheral;
  // Source estimator uses asymptotic beta volume; model states provide a
  // separate exact parent mass denominator. CMMG is excluded from both.
  const betaVolume = (p.other + p.form) * run.summary.modelHalfLife / Math.LN2;
  const hdMass = end.hd - pre.hd;
  assert.ok(Math.abs(burden - (end.central + end.peripheral + hdMass +
    end.other - pre.other + end.formed - pre.formed)) < 1e-8);
  return {weight, hdCl, prePlasma: pre.plasma / .22521, endPlasma: end.plasma / .22521,
    disconnectFallPct: 100 * (1 - end.plasma / pre.plasma),
    at15minFallPct: 100 * (1 - at(53.25).plasma / pre.plasma),
    at90minFallPct: 100 * (1 - at(54.5).plasma / pre.plasma),
    preBodyMg: burden, dialysateMg: hdMass, recoveryPctOfBody: 100 * hdMass / burden,
    recoveryPctOfEstimatedBody: 100 * hdMass / (pre.plasma * betaVolume),
    recoveryPctOfDose: 100 * hdMass / config.dose};
}
const rows = [];
// The Laskin mean weight (57.5 kg) anchors an illustrative reconstruction;
// the range is a sensitivity, not assignment of weights to effluent subjects.
for (const weight of [48, 57.5, 74]) {
  for (const hdCl of [81.8, 112.8]) {
    const result = simulate(weight, hdCl, .125);
    const fine = simulate(weight, hdCl, .0625);
    for (const key of Object.keys(result)) assert.ok(Math.abs(result[key] / fine[key] - 1) < .001);
    rows.push(result);
  }
}
console.log(JSON.stringify({source, rows}, null, 2));
