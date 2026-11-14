// Sun et al. 2025, Fig. 3 (p. 1418) and section 3.2. Model-to-model comparison.
'use strict';
const assert = require('node:assert/strict');
const engine = require('../../public/assets/pk-engine.js');

const pbpk = {
  plasma: {auc8: 26.1, peak: 11.2, trough: .3},
  sas: {auc8: 5.9, peak: 1.0, trough: .5},
  brainEcf: {auc8: 17.1, peak: 6.6, trough: .2}
};
function steadyInterval(weight, crcl, dt) {
  const config = {...structuredClone(engine.DEFAULTS), weight, crcl, crclSource: 'manual',
    renalMode: 'constant', route: 'Acyclovir IV', dose: 10 * weight, every: 8,
    dosingMode: 'repeat', infusion: 1, doseCount: 15, horizon: 120, draws: 1,
    variability: 0, observations: []};
  assert.deepEqual(engine.validate(config, 'No dialysis'), []);
  const p = engine.drawParams(config)[0];
  const run = engine.single(config, p, [], dt);
  function metrics(key, end) {
    const first = run.t.indexOf(end - 8), last = run.t.indexOf(end);
    assert.ok(first >= 0 && last > first);
    const points = run.cols[key].slice(first, last + 1);
    const auc8 = points.slice(1).reduce((sum, value, i) => sum + dt * (value + points[i]) / 2, 0);
    return {auc8, peak: Math.max(...points), trough: Math.min(...points)};
  }
  const plasma = metrics('plasma', 120), csf = metrics('csf', 120);
  for (const [key, current] of [['plasma', plasma], ['csf', csf]]) {
    const previous = metrics(key, 112);
    for (const metric of Object.keys(current)) assert.ok(Math.abs(current[metric] / previous[metric] - 1) < .0001);
  }
  // Exact periodic mass balance for parent; integrate the linear CSF lag
  // over one interval to get its AUC relation at periodic steady state.
  const closedAuc = config.dose / (p.renal + p.other + p.form);
  assert.ok(Math.abs(plasma.auc8 / closedAuc - 1) < .0001);
  assert.ok(Math.abs(csf.auc8 / plasma.auc8 - p.kp) < .0001);
  return {plasma, csf, csfToPlasmaAuc: csf.auc8 / plasma.auc8};
}
const rows = [];
for (const weight of [50, 70, 90]) {
  for (const crcl of [90, 111, 120]) {
    const model = steadyInterval(weight, crcl, 1 / 32);
    const fine = steadyInterval(weight, crcl, 1 / 64);
    for (const key of ['plasma', 'csf']) for (const metric of ['auc8','peak','trough']) {
      assert.ok(Math.abs(model[key][metric] / fine[key][metric] - 1) < .002);
    }
    rows.push({weight, crcl, ...model});
  }
}
console.log(JSON.stringify({source: '10.1007/s40262-025-01545-w', pbpk,
  pbpkSasToPlasmaAuc: pbpk.sas.auc8 / pbpk.plasma.auc8, rows}, null, 2));
