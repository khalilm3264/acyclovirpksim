'use strict';

// Issue #51: compare the engine's renal and nonrenal acyclovir clearance terms
// with Laskin et al. 1982 (probenecid study) and the Sadjadi anuric intercept [23].
// Runs the same public/assets/pk-engine.js the website uses. No parameter is changed.

const assert = require('node:assert/strict');
const engine = require('../../public/assets/pk-engine.js');

const ML_MIN_PER_L_H = 1000 / 60;
const COHORT_WEIGHT_KG = 79.1;
const COHORT_BSA_M2 = 1.89;
const TO_INDEXED = 1.73 / COHORT_BSA_M2;
const MODE = 'No dialysis';

// Published values (Laskin 1982, n = 3, mean ± SD, mL/min per 1.73 m²)
const LASKIN = {
  totalCl: 300, renalCl: 248, crcl: 90, renalFraction: 0.83,
  renalClProbenecid: 168, auc: 91.3, aucProbenecid: 127.6
};
const SADJADI_ANURIC_INTERCEPT = 28.7; // mL/min per 1.73 m², cited as [23]

function config(crcl, overrides = {}) {
  return engine.effectiveConfig({
    ...engine.DEFAULTS, weight: 70, crcl, crclSource: 'manual', renalMode: 'constant',
    route: 'Acyclovir IV', dosingMode: 'repeat', dose: 350, every: 24, doseCount: 1,
    infusion: 1, horizon: 168, draws: 1, variability: 0, ...overrides
  });
}

function totalClearance(cfg) {
  assert.deepEqual(engine.validate(cfg, MODE), []);
  const run = engine.single(cfg, engine.drawParams(cfg)[0], engine.scheduleFor(MODE, cfg), 0.0625,
    engine.buildDoses(cfg));
  const c = run.cols.plasma;
  let auc = 0;
  for (let i = 1; i < run.t.length; i++) auc += 0.5 * (c[i] + c[i - 1]) * (run.t[i] - run.t[i - 1]);
  const tail = c[c.length - 1] / (Math.log(2) / run.summary.modelHalfLife); // negligible by 168 h; kept for completeness
  return { auc: auc + tail, halfLife:run.summary.modelHalfLife, cl: (cfg.dose / (auc + tail)) * ML_MIN_PER_L_H };
}

function terms(cfg) {
  const p = engine.drawParams(cfg)[0];
  return {
    renal: p.renal * ML_MIN_PER_L_H,
    other: p.other * ML_MIN_PER_L_H,
    formation: p.form * ML_MIN_PER_L_H,
    nonrenal: (p.other + p.form) * ML_MIN_PER_L_H
  };
}

function report() {
  const nominal = config(LASKIN.crcl / TO_INDEXED, {weight:COHORT_WEIGHT_KG, dose:5*COHORT_WEIGHT_KG});
  const t = terms(nominal);
  const total = totalClearance(nominal);
  const probenecid = {...nominal, probenecid:true};
  const totalProb = totalClearance(probenecid);
  const baseline = engine.drawParams(nominal)[0], inhibited = engine.drawParams(probenecid)[0];
  assert.ok(Math.abs(inhibited.renal / baseline.renal - engine.PROBENECID_RENAL) < 1e-12);
  assert.equal(inhibited.mr, baseline.mr); // drug switch preserves renal clearance of CMMG
  const anuric = terms(config(0));
  const anuricTotal = totalClearance(config(0));
  return {
    cohort: {weightKg:COHORT_WEIGHT_KG, bsaM2:COHORT_BSA_M2, absoluteCrCl:nominal.crcl, indexedCrCl:LASKIN.crcl},
    engineAtLaskinCrCl: {
      renal: t.renal * TO_INDEXED, nonrenal: t.nonrenal * TO_INDEXED, formationToCMMG: t.formation * TO_INDEXED, otherNonrenal: t.other * TO_INDEXED,
      totalFromParameters: (t.renal + t.nonrenal) * TO_INDEXED, totalFromSimulatedAUC: total.cl * TO_INDEXED,
      renalToCrClRatio: t.renal / nominal.crcl, renalFraction: t.renal / (t.renal + t.nonrenal)
    },
    laskinDerived: {
      nonrenalBySubtraction: LASKIN.totalCl - LASKIN.renalCl,
      renalToCrClRatio: LASKIN.renalCl / LASKIN.crcl
    },
    anuric: { nonrenal: anuric.nonrenal, totalFromSimulatedAUC: anuricTotal.cl,
      sadjadiIntercept: SADJADI_ANURIC_INTERCEPT },
    probenecidEmulation: { // retain the existing report key for downstream readers
      engineAucControlUmolHL: total.auc / .22521,
      engineAucProbenecidUmolHL: totalProb.auc / .22521,
      engineHalfLifeControlH: total.halfLife,
      engineHalfLifeProbenecidH: totalProb.halfLife,
      engineAucIncreasePct: 100 * (total.cl / totalProb.cl - 1),
      laskinAucIncreasePct: 100 * (LASKIN.aucProbenecid / LASKIN.auc - 1),
      engineTotalClFallPct: 100 * (1 - totalProb.cl / total.cl),
      laskinTotalClFallPct: 100 * (1 - (LASKIN.totalCl - (LASKIN.renalCl - LASKIN.renalClProbenecid)) / LASKIN.totalCl)
    }
  };
}

if (require.main === module) {
  const r = report();
  const f = (x, d = 1) => x.toFixed(d);
  console.log('| Quantity | Laskin 1982 | Engine |');
  console.log('|---|---:|---:|');
  console.log('| Renal clearance at indexed CrCl 90 (mL/min/1.73 m²) | 248 ± 80 | ' + f(r.engineAtLaskinCrCl.renal) + ' |');
  console.log('| Nonrenal clearance (mL/min/1.73 m²) | 52 (300 − 248, derived) | ' + f(r.engineAtLaskinCrCl.nonrenal) + ' |');
  console.log('| Total clearance (mL/min/1.73 m²) | 300 ± 69 | ' + f(r.engineAtLaskinCrCl.totalFromSimulatedAUC) + ' |');
  console.log('| Renal fraction of total | 83% | ' + f(100 * r.engineAtLaskinCrCl.renalFraction, 0) + '% |');
  console.log('| Renal clearance / CrCl | ' + f(r.laskinDerived.renalToCrClRatio, 2) + ' | ' + f(r.engineAtLaskinCrCl.renalToCrClRatio, 2) + ' |');
  console.log('| Anuric total clearance (mL/min) | 28.7 (Sadjadi [23]) | ' + f(r.anuric.totalFromSimulatedAUC) + ' |');
  console.log('| Total clearance fall, assuming unchanged nonrenal CL in the source | ' + f(r.probenecidEmulation.laskinTotalClFallPct) + '% | ' + f(r.probenecidEmulation.engineTotalClFallPct) + '% |');
  console.log('| AUC increase, renal −32% | ' + f(r.probenecidEmulation.laskinAucIncreasePct) + '% | ' + f(r.probenecidEmulation.engineAucIncreasePct) + '% |');
  assert.ok(Math.abs(r.engineAtLaskinCrCl.totalFromSimulatedAUC - r.engineAtLaskinCrCl.totalFromParameters) < 1,
    'AUC-derived clearance must match the parameter sum');
}
module.exports = {report};
