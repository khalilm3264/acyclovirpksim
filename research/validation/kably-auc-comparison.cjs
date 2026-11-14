// Run: node research/validation/kably-auc-comparison.cjs
// Kably 2025 (doi:10.1093/jac/dkaf070), Tables 3 and 5, simulated day-11
// AUC in mg·h/L. Table 5 gives a median of within-subject metabolic ratios.
// Absolute CrCl values are scenarios; indexed eGFR categories do not supply
// matched CrCl inputs. Weight 70 kg approximates the cohort median of 69.5.
'use strict';
const assert = require('node:assert/strict');
const engine = require('../../public/assets/pk-engine.js');
const strata = [
  {eGFR: '>90', crcls: [104, 120], parent: 44.8, metabolite: 13.3, ratioPct: 30.4},
  {eGFR: '61–90', crcls: [75], parent: 64.7, metabolite: 23.2, ratioPct: 34.9},
  {eGFR: '31–60', crcls: [45], parent: 63.6, metabolite: 37.7, ratioPct: 47.6},
  {eGFR: '<30', crcls: [15, 25], parent: 88.7, metabolite: 103.1, ratioPct: 129.9}
];
function day11(crcl) {
  const config = {...structuredClone(engine.DEFAULTS), weight: 70, crcl, renalMode: 'constant',
    crclSource: 'manual', route: 'Valacyclovir oral', dosingMode: 'repeat', dose: 2000,
    every: 8, doseCount: 33, horizon: 264, draws: 1, variability: 0, observations: []};
  assert.deepEqual(engine.validate(config, 'No dialysis'), []);
  const run = engine.single(config, engine.drawParams(config)[0], [], 0.0625, engine.buildDoses(config));
  const start = run.t.indexOf(240);
  assert.ok(start >= 0);
  assert.equal(run.t.at(-1), 264);
  function area(curve) {
    let sum = 0;
    for (let i = start + 1; i < curve.length; i++) {
      sum += (run.t[i] - run.t[i - 1]) * (curve[i] + curve[i - 1]) / 2;
    }
    return sum;
  }
  const acv = area(run.cols.plasma), cmmg = area(run.cols.cmmg);
  return {ayfluxAcv: +acv.toFixed(2), ayfluxCmmg: +cmmg.toFixed(2), ayfluxRatioPct: +(100 * cmmg / acv).toFixed(1)};
}
console.table(strata.flatMap(s => s.crcls.map(crcl => ({
  eGFR: s.eGFR, crcl, kablyAcv: s.parent, kablyCmmg: s.metabolite, kablyRatioPct: s.ratioPct, ...day11(crcl)
}))));
