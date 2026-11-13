#!/usr/bin/env node
'use strict';
// Lindström 2019 (J Antimicrob Chemother 74:3565, doi:10.1093/jac/dkz357), Table 1: paired serum and CSF
// acyclovir and CMMG in 21 patients treated for herpesvirus CNS infection (34 samples). Each sample is
// reconstructed at its weight, dose, estimated CrCl, treatment day and time since dose, and the CSF CMMG
// partition (csfMetRatio) is compared at 0.25 (before #47), 0.035 and 0.025 (Smith 2010). Independent of
// Smith, which informed 0.025. For research only; never patient dosing.
// Run: node research/validation/lindstrom-csf.cjs [outDir]
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const engine = require('../../public/assets/pk-engine.js');

const MW = {plasma: 225.21, csf: 225.21, cmmg: 239.19, csfCmmg: 239.19};
const CANDIDATES = [0.25, 0.035, 0.025];
const parseCsv = text => {
  const [head, ...lines] = text.trim().split(/\r?\n/);
  const split = l => l.match(/("([^"]*)"|[^,]*)(,|$)/g).slice(0, -1).map(x => x.replace(/,$/, '').replace(/^"|"$/g, ''));
  const keys = split(head);
  return lines.map(l => Object.fromEntries(split(l).map((v, i) => [keys[i], v])));
};
const rows = parseCsv(fs.readFileSync(path.join(__dirname, 'data/lindstrom2019-table1.csv'), 'utf8'));
assert.equal(rows.length, 34);

// Assumptions: IV doses as 1 h infusions every 8 h (20b every 12 h); oral valaciclovir 1,000 mg every 8 h for
// patients 3 and 14; dosing from day 1 at a constant estimated CrCl for the stated treatment duration; the
// sample is taken lag hours after the last dose. Patient 1a has no albumin ratio and is unclassified.
function regimen(r) {
  // Treatment longer than 13 days is simulated as 13 days (the engine's 336 h limit); both analytes are at
  // steady state long before that at every CrCl in the table.
  const weight = +r.weight_kg, days = Math.min(13, +String(r.treatment_duration_days).replace(/\D+$/, ''));
  if (/valaciclovir/.test(r.acv_dose)) return {route: 'Valacyclovir oral', dose: 1000, every: 8, days, weight};
  const every = /twice/.test(r.acv_dose) ? 12 : 8;
  return {route: 'Acyclovir IV', dose: Math.round(parseFloat(r.acv_dose) * weight), every, days, weight};
}
function barrier(r) {
  if (r.albumin_ratio_x1e3 === 'N/A') return 'unknown';
  return +r.albumin_ratio_x1e3 <= (+r.age <= 45 ? 6.8 : 10.2) ? 'intact' : 'disrupted';
}
function simulate(r, csfMetRatio, extra = {}) {
  const g = regimen(r), lag = +r.lag_time_h;
  const doseCount = Math.max(1, Math.round(g.days * 24 / g.every));
  const horizon = (doseCount - 1) * g.every + lag;
  const config = {...structuredClone(engine.DEFAULTS), age: +r.age, sex: r.sex === 'F' ? 'female' : 'male',
    weight: g.weight, crcl: +r.est_clcr_ml_min, crclSource: 'manual', renalMode: 'constant', route: g.route,
    dosingMode: 'repeat', dose: g.dose, every: g.every, doseCount, infusion: 1, horizon,
    draws: 1, variability: 0, observations: [], csfMetRatio, ...extra};
  assert.deepEqual(engine.validate(config, 'No dialysis'), [], r.sample_id);
  const run = engine.single(config, engine.drawParams(config)[0], [], 0.25, engine.buildDoses(config));
  const i = run.t.length - 1;
  assert.ok(Math.abs(run.t[i] - horizon) < 1e-9);
  return Object.fromEntries(Object.keys(MW).map(k => [k, run.cols[k][i] * 1000 / MW[k]]));
}
const observed = (r, key) => {
  const v = r[key];
  if (v === 'N/A') return null;
  return v.startsWith('<') ? {below: +v.slice(1)} : {value: +v};
};

const samples = rows.map(r => {
  const preds = Object.fromEntries(CANDIDATES.map(k => [k, simulate(r, k)]));
  return {id: r.sample_id, barrier: barrier(r), albuminRatio: r.albumin_ratio_x1e3,
    observed: {serumAcv: observed(r, 'serum_acv_umol_L'), serumCmmg: observed(r, 'serum_cmmg_umol_L'),
      csfAcv: observed(r, 'csf_acv_umol_L'), csfCmmg: observed(r, 'csf_cmmg_umol_L')},
    predicted: Object.fromEntries(CANDIDATES.map(k => [k, Object.fromEntries(Object.entries(preds[k]).map(([a, v]) => [a, Math.round(v * 1000) / 1000]))]))};
});

// Summary: geometric mean ratio (GMR) and absolute fold error (AAFE) on quantified values; for values below the
// limit, the share of predictions at or under it.
function summarize(filter, obsKey, predKey, k) {
  const q = [], cens = [];
  for (const s of samples.filter(filter)) {
    const o = s.observed[obsKey];
    if (!o) continue;
    const p = s.predicted[k][predKey];
    if ('value' in o) q.push(Math.log(p / o.value)); else cens.push(p <= o.below);
  }
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  return {n: q.length, gmr: q.length ? +Math.exp(mean(q)).toFixed(3) : null,
    aafe: q.length ? +Math.exp(mean(q.map(Math.abs))).toFixed(3) : null,
    withinTwofold: q.filter(x => Math.abs(x) <= Math.LN2).length,
    belowLimit: cens.length, belowLimitConsistent: cens.filter(Boolean).length};
}
const groups = {all: () => true, intact: s => s.barrier === 'intact', disrupted: s => s.barrier === 'disrupted'};
const summary = {};
for (const k of CANDIDATES) {
  summary[k] = {};
  for (const [g, f] of Object.entries(groups)) summary[k][g] = {csfCmmg: summarize(f, 'csfCmmg', 'csfCmmg', k)};
}
const serum = {cmmg: summarize(groups.all, 'serumCmmg', 'cmmg', 0.25), acyclovir: summarize(groups.all, 'serumAcv', 'plasma', 0.25),
  csfAcyclovir: summarize(groups.all, 'csfAcv', 'csf', 0.25)};

// Conclusions in LINDSTROM-CSF.md; fail if the engine changes them.
const S = (k, g) => summary[k][g].csfCmmg;
assert.ok(S(0.25, 'intact').gmr > 3 && S(0.25, 'intact').belowLimitConsistent === 0, 'intact barrier: 0.25 overpredicts');
assert.ok(S(0.025, 'intact').withinTwofold === S(0.025, 'intact').n &&
  S(0.025, 'intact').belowLimitConsistent === S(0.025, 'intact').belowLimit, 'intact barrier: 0.025 fits every sample');
assert.ok(S(0.25, 'disrupted').gmr > 1.5 && S(0.025, 'disrupted').gmr < 0.5, 'disrupted barrier: neither value fits');
assert.ok(Math.abs(serum.cmmg.gmr - 1) < 0.15, 'serum CMMG unbiased within 15%');

// Blood-brain barrier presets (engine CSF_BARRIER). The damaged preset was fitted to the CSF/serum ratios of the
// disrupted-barrier samples, so its fit below is in-sample: CSF GMR should match that group's serum GMR.
const presets = {};
for (const [name, p] of Object.entries(engine.CSF_BARRIER)) {
  const group = name === 'intact' ? 'intact' : 'disrupted';
  const sel = samples.filter(x => x.barrier === group);
  const rowsById = Object.fromEntries(rows.map(r => [r.sample_id, r]));
  const logs = {csf: [], csfCmmg: [], plasma: [], cmmg: []};
  for (const x of sel) {
    const pred = simulate(rowsById[x.id], p.csfMetRatio, {csfRatio: p.csfRatio});
    for (const [k, o] of [['csf', 'csfAcv'], ['csfCmmg', 'csfCmmg'], ['plasma', 'serumAcv'], ['cmmg', 'serumCmmg']]) {
      const v = x.observed[o];
      if (v && 'value' in v) logs[k].push(Math.log(pred[k] / v.value));
    }
  }
  const g = a => +Math.exp(a.reduce((x, y) => x + y, 0) / a.length).toFixed(3);
  presets[name] = {...p, group, gmr: Object.fromEntries(Object.entries(logs).map(([k, a]) => [k, {n: a.length, gmr: g(a)}]))};
}
const ratioErr = q => Math.abs(Math.log(q.csf.gmr / q.plasma.gmr)) + Math.abs(Math.log(q.csfCmmg.gmr / q.cmmg.gmr));
assert.ok(ratioErr(presets.damaged.gmr) < 0.1, 'damaged preset reproduces the disrupted-barrier CSF/serum ratios');

const results = {source: 'doi:10.1093/jac/dkz357, Table 1 (34 samples, 21 patients)', candidates: CANDIDATES, summary, serum, presets, samples};
const out = process.argv[2] || __dirname;
fs.writeFileSync(path.join(out, 'lindstrom-csf-results.json'), JSON.stringify(results, null, 2) + '\n');
for (const k of CANDIDATES) console.log('csfMetRatio', k, JSON.stringify(summary[k]));
console.log('serum (independent of csfMetRatio):', JSON.stringify(serum));
console.log('barrier presets:', JSON.stringify(presets));
