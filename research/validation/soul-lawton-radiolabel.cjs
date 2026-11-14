// Soul-Lawton et al. 1995, pp. 2760–2763. Four-person metabolic-disposition arm.
'use strict';
const assert = require('node:assert/strict');
const engine = require('../../public/assets/pk-engine.js');
const acvMw = 225.21, cmmgMw = 239.19, valMw = 324.34;

function recover(crcl, step) {
  const config = {...structuredClone(engine.DEFAULTS), weight: 74, crcl,
    renalMode: 'constant', crclSource: 'manual', route: 'Valacyclovir oral',
    dosingMode: 'repeat', dose: 1000, doseCount: 1, draws: 1, variability: 0,
    horizon: 96, observations: [], trackMassBalance: true};
  assert.deepEqual(engine.validate(config, 'No dialysis'), []);
  const params = engine.drawParams(config)[0];
  const run = engine.single(config, params, [], step);
  // Each molecule of parent or metabolite carries the purine tracer.
  const doseEquivalent = config.dose * acvMw / valMw;
  function collection(hour) {
    const index = run.t.indexOf(hour);
    assert.ok(index >= 0);
    const {parts, residual} = run.accounting[index];
    assert.ok(Math.abs(residual) < 1e-7);
    const metaboliteRemaining = run.cols.cmmg[index] * params.vm * acvMw / cmmgMw;
    const renalFraction = params.mr / (params.mr + params.mn);
    return {parent: parts.kidney, metabolite: (parts.formed - metaboliteRemaining) * renalFraction};
  }
  const at4 = collection(4), at8 = collection(8), at96 = collection(96);
  function share(start, end) {
    const parent = end.parent - start.parent;
    const metabolite = end.metabolite - start.metabolite;
    return 100 * metabolite / (parent + metabolite);
  }
  const zero = {parent: 0, metabolite: 0};
  const parentDosePct = 100 * at96.parent / doseEquivalent;
  const cmmgDosePct = 100 * at96.metabolite / doseEquivalent;
  const totalParentCl = params.renal + params.other + params.form;
  const parentLimit = 100 * params.oralF * params.renal / totalParentCl;
  const cmmgLimit = 100 * params.oralF * params.form / totalParentCl
    * params.mr / (params.mr + params.mn);
  assert.ok(Math.abs(parentLimit - parentDosePct) < 0.001);
  assert.ok(Math.abs(cmmgLimit - cmmgDosePct) < 0.001);
  return {crcl, parentDosePct, cmmgDosePct, bothDosePct: parentDosePct + cmmgDosePct,
    cmmgShare0to4: share(zero, at4), cmmgShare4to8: share(at4, at8), cmmgShare0to8: share(zero, at8)};
}

const rows = [90, 105, 120].map(crcl => {
  const nominal = recover(crcl, 1 / 16), fine = recover(crcl, 1 / 32);
  for (const key of Object.keys(nominal)) assert.ok(Math.abs(nominal[key] - fine[key]) < .001);
  return nominal;
});
const source = {parentUrinePctDose: 40.4, urineRadioactivityPctDose: 45.6,
  fecalRadioactivityPctDose: 47.1, totalRadioactivityPctDose: 92.7,
  selectedUrineMeanPctLabel: {parent: 84.39, cmmg: 13.78, eightHydroxy: 1.46}};
const {parent, cmmg} = source.selectedUrineMeanPctLabel;
console.log(JSON.stringify({source, ratioOfSourceMeanSharesPct: 100 * cmmg / (parent + cmmg), rows}, null, 2));
