// Run from the repository root with node research/validation/soul-lawton-crossover.cjs
// Source: Soul-Lawton et al. 1995, doi:10.1128/AAC.39.12.2759.
// Methods pp. 2760–2761 and Table 1. Twelve fasting crossover participants,
// mean weight 73 kg. The separate four-person radiolabel study is excluded.
// Table 1 reports means of individual endpoints. A deterministic trajectory
// at mean weight cannot reproduce their distribution or parameter covariance.
// CrCl 90/105/120 mL/min are assumed scenarios, not reported cohort values.
// This comparison reuses the frozen engine. No parameters are fitted.
'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const engine = require('../../public/assets/pk-engine.js');
const enginePath = require.resolve('../../public/assets/pk-engine.js');
const samples = [0, .25, .5, .75, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 16, 24];
const terminalTimes = [6, 8, 10, 12, 16];
const acvMgPerMicromole = .22521;
const valMgPerMicromole = .32434;
const observed = {
  oral: {peak: 29.53, tmax: 1.71, auc: 89.37, halfLife: 2.62},
  iv: {peak: 40.99, tmax: .98, auc: 84.04, halfLife: 2.37}
};

function simulate(crcl, route, valKa, step) {
  const config = {...structuredClone(engine.DEFAULTS), weight: 73, crcl,
    renalMode: 'constant', crclSource: 'manual', route,
    dose: route === 'Acyclovir IV' ? 350 : 1000, dosingMode: 'repeat',
    doseCount: 1, infusion: 1, horizon: 48, valKa, draws: 1, variability: 0,
    observations: []};
  assert.deepEqual(engine.validate(config, 'No dialysis'), []);
  const doses = engine.buildDoses(config);
  assert.equal(doses.length, 1);
  assert.equal(doses[0].time, 0);
  const run = engine.single(config, engine.drawParams(config)[0], [], step, doses);
  function concentration(time) {
    const index = run.t.indexOf(time);
    assert.ok(index >= 0, 'Every source sampling time must exist on the model grid');
    return run.cols.plasma[index] / acvMgPerMicromole;
  }
  const averageTime = terminalTimes.reduce((sum, t) => sum + t, 0) / terminalTimes.length;
  const numerator = terminalTimes.reduce((sum, t) =>
    sum + (t - averageTime) * Math.log(concentration(t)), 0);
  const denominator = terminalTimes.reduce((sum, t) => sum + (t - averageTime) ** 2, 0);
  const lambda = -numerator / denominator;
  assert.ok(lambda > 0);
  const aucTo24 = samples.slice(1).reduce((sum, t, index) => {
    const previous = samples[index];
    return sum + (t - previous) * (concentration(t) + concentration(previous)) / 2;
  }, 0);
  const tmax = samples.reduce((best, time) =>
    concentration(time) > concentration(best) ? time : best, 0);
  return {peak: concentration(tmax), tmax, auc: aucTo24 + concentration(24) / lambda,
    halfLife: Math.log(2) / lambda};
}

const rows = [];
for (const crcl of [90, 105, 120]) {
  const iv = simulate(crcl, 'Acyclovir IV', engine.DEFAULTS.valKa, 1 / 64);
  for (const valKa of [engine.DEFAULTS.valKa, .9]) {
    const oral = simulate(crcl, 'Valacyclovir oral', valKa, 1 / 64);
    for (const [arm, route, result] of [
      ['iv', 'Acyclovir IV', iv], ['oral', 'Valacyclovir oral', oral]
    ]) {
      if (arm === 'iv' && valKa === .9) continue;
      const fine = simulate(crcl, route, valKa, 1 / 128);
      for (const metric of ['peak', 'auc', 'halfLife']) {
        assert.ok(Math.abs(result[metric] / fine[metric] - 1) < .002,
          'Integration-step change must stay below 0.2%');
      }
      assert.equal(result.tmax, fine.tmax);
      rows.push({crcl, arm, valKa, ...result});
    }
    const apparentF = oral.auc / iv.auc * (350 / acvMgPerMicromole) / (1000 / valMgPerMicromole);
    assert.ok(Math.abs(apparentF / engine.DEFAULTS.valF - 1) < .02,
      'Sampled oral/IV AUC should recover assigned F within 2%');
  }
}
console.log(JSON.stringify({
  source: 'doi:10.1128/AAC.39.12.2759',
  engineSha256: crypto.createHash('sha256').update(fs.readFileSync(enginePath)).digest('hex'),
  units: {peak: 'µmol/L', tmax: 'h', auc: 'µmol·h/L', halfLife: 'h'},
  observed, assignedF: engine.DEFAULTS.valF,
  // Ratio of aggregate AUC means differs from mean of individual F (54.2%).
  sourceAggregateF: observed.oral.auc / observed.iv.auc *
    (350 / acvMgPerMicromole) / (1000 / valMgPerMicromole),
  rows
}, null, 2));
// Read together with issue #75. At CrCl 105, slower absorption moves the peak
// later but reduces its magnitude from ~29.3 to ~20.9 µmol/L. Both default
// AUCs underpredict the source at this assumed clearance. Lower assumed CrCl
// increases exposure in both arms. The oral/IV ratio alone cannot establish
// absolute clearance, and the default peak match alone cannot establish ka.
