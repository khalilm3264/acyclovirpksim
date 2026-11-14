#!/usr/bin/env node
'use strict';
// Helldén 2007 (BMJ 335:1305), case 1: chronic HD patient, valaciclovir 1 g daily x3, paired serum
// acyclovir/CMMG before and after two dialysis sessions. Tests CMMG accumulation and between-session
// elimination with almost no kidney function (#46). This case set the 0.5 L/h default; Hara is the check.
// For research only; never patient dosing.
// Run: node research/validation/hellden-cotard.cjs [outDir]
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const engine = require('../../public/assets/pk-engine.js');
const hara = require('./hara-hd.cjs');

const MW = {acyclovir: 225.21, cmmg: 239.19}; // the paper converts by 4.44 and 4.18 (µmol/L per mg/L)
// Reported (text of BMJ p. 1305): 1 g daily, first dose after dialysis on day 1, 3 g total; samples
// 30 h after the last dose before dialysis (acyclovir 19.4, CMMG 90.2 µmol/L), CMMG after that session
// 21.1; on day 6 acyclovir 1.8 and CMMG 8.9 before dialysis, CMMG 1.5 after.
// Assumed: doses at 0, 24, 48 h; sessions 78-82 h and 126-130 h (4 h each, 48 h apart); weight 60 kg;
// CrCl 0 (failing transplant, residual function not reported); default model otherwise.
const observed = [
  {label: 'Acyclovir before session 1', key: 'plasma', hour: 78, umolL: 19.4},
  {label: 'CMMG before session 1', key: 'cmmg', hour: 78, umolL: 90.2},
  {label: 'CMMG after session 1', key: 'cmmg', hour: 82, umolL: 21.1},
  {label: 'Acyclovir before session 2 (day 6)', key: 'plasma', hour: 126, umolL: 1.8},
  {label: 'CMMG before session 2 (day 6)', key: 'cmmg', hour: 126, umolL: 8.9},
  {label: 'CMMG after session 2 (day 6)', key: 'cmmg', hour: 130, umolL: 1.5}
];

// Non-kidney CMMG clearance values compared, in L/h at 70 kg. 0.25 was the default before #46; 0.5 is now.
const CANDIDATES = [0.25, 0.5, 0.75];
function simulate(overrides = {}, cmmgNonrenalLh = engine.CMMG_NONRENAL_CL) {
  const config = {...structuredClone(engine.DEFAULTS), age: 35, sex: 'female', weight: 60, crcl: 0,
    crclSource: 'manual', renalMode: 'constant', route: 'Valacyclovir oral', dosingMode: 'repeat',
    dose: 1000, every: 24, doseCount: 3, horizon: 132, draws: 1, variability: 0, observations: [],
    schedule: [{type: 'HD', start: 78, end: 82}, {type: 'HD', start: 126, end: 130}], ...overrides};
  const mode = 'Custom sequence';
  assert.deepEqual(engine.validate(config, mode), []);
  const params = engine.drawParams(config)[0];
  params.mn *= cmmgNonrenalLh / engine.CMMG_NONRENAL_CL; // variability 0, so this sets the value exactly
  const run = engine.single(config, params, engine.scheduleFor(mode, config), 0.0625, engine.buildDoses(config));
  return observed.map(o => {
    const i = run.t.findIndex(t => Math.abs(t - o.hour) < 1e-9);
    assert.ok(i >= 0, 'missing hour ' + o.hour);
    const umolL = run.cols[o.key][i] * 1000 / (o.key === 'cmmg' ? MW.cmmg : MW.acyclovir);
    return {...o, predictedUmolL: Math.round(umolL * 10) / 10, ratio: Math.round(umolL / o.umolL * 100) / 100};
  });
}
const rmsLog = rows => Math.round(Math.sqrt(rows.reduce((s, r) => s + Math.log(r.ratio) ** 2, 0) / rows.length) * 1000) / 1000;

const scenarios = [];
for (const hdCl of [81.8, 159]) for (const lh of CANDIDATES) {
  const rows = simulate({hdCl}, lh);
  scenarios.push({hdCl, cmmgNonrenalLh: lh, rmsLogError: rmsLog(rows), rows});
}
const sensitivity = [
  ['weight 50 kg', {weight: 50}], ['weight 80 kg', {weight: 80}], ['residual CrCl 2 mL/min', {crcl: 2}]
].map(([label, o]) => ({label, rows: simulate({hdCl: 159, ...o}).map(r => ({label: r.label, predictedUmolL: r.predictedUmolL}))}));

// Independent check of the same values against Hara 2008 (not used for the fit).
const original = engine.drawParams;
const haraCheck = CANDIDATES.map(lh => {
  engine.drawParams = c => original(c).map(p => ({...p, mn: p.mn * lh / engine.CMMG_NONRENAL_CL}));
  const p = hara.simulate(0.0625, {hdCl: 159}).predicted;
  return {cmmgNonrenalLh: lh, cmmgPeakMgL: Math.round(p.cmmgPeak * 100) / 100, observedCmmgPeakMgL: 7.47};
});
engine.drawParams = original;

const find = (hd, lh) => scenarios.find(s => s.hdCl === hd && s.cmmgNonrenalLh === lh);
// Conclusions in HELLDEN-COTARD.md; fail if the engine changes them.
assert.equal(engine.CMMG_NONRENAL_CL, 0.5, 'engine default');
assert.ok(Math.abs(find(81.8, 0.5).rows[0].ratio - 1) < 0.15, 'acyclovir before session 1 within 15%');
assert.ok(find(159, 0.25).rows[4].ratio > 2, 'the old 0.25 L/h leaves day-6 CMMG over twice the measured value');
assert.ok(find(159, 0.5).rmsLogError < find(159, 0.25).rmsLogError, '0.5 L/h fits the case better than 0.25');
assert.ok(Math.abs(haraCheck[1].cmmgPeakMgL / 7.47 - 1) < Math.abs(haraCheck[0].cmmgPeakMgL / 7.47 - 1), 'Hara agrees');

const results = {source: 'doi:10.1136/bmj.39408.393137.BE (BMJ 2007;335:1305), case 1',
  assumptions: 'Doses at 0, 24, 48 h; HD 78-82 and 126-130 h; 60 kg; CrCl 0. Only the 30 h dose-to-sample gap is reported.',
  scenarios, sensitivity, haraCheck};
const out = process.argv[2] || __dirname;
fs.writeFileSync(path.join(out, 'hellden-cotard-results.json'), JSON.stringify(results, null, 2) + '\n');
for (const s of scenarios) console.log(`hdCl ${s.hdCl} CMMG non-kidney ${s.cmmgNonrenalLh} L/h: RMS log error ${s.rmsLogError} | ` +
  s.rows.map(r => r.predictedUmolL + '/' + r.umolL).join(' '));
console.log('Hara CMMG peak (obs 7.47):', haraCheck.map(h => h.cmmgNonrenalLh + ' L/h ' + h.cmmgPeakMgL).join(', '));
