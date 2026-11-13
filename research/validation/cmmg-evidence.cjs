#!/usr/bin/env node
'use strict';
// CMMG evidence check for #46: separates the dialyzer-clearance effect from the CMMG dialysis term,
// and records which CMMG parameters the available data can and cannot identify.
// For research only; never patient dosing. Run: node research/validation/cmmg-evidence.cjs [outDir]
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const engine = require('../../public/assets/pk-engine.js');
const hara = require('./hara-hd.cjs');

const r1 = x => Math.round(x * 10) / 10;
const declines = overrides => {
  const p = hara.simulate(0.0625, overrides).predicted;
  return {acyclovirDeclinePct: r1(p.plasmaDeclinePct), cmmgDeclinePct: r1(p.cmmgDeclinePct)};
};

// Hara 2008 (doi 10.2133/dmpk.23.306), p. 310: pre/post-HD declines 69.4% (acyclovir), 77.6% (CMMG).
// Helldén 2008 thesis, Paper V (preliminary, n = 4 HD patients): one HD session lowered serum
// acyclovir by 56% and CMMG by 73%. Dose 50 mg IV; session timing and dialyzer not given.
const observed = {
  hara: {acyclovirDeclinePct: 69.4, cmmgDeclinePct: 77.6},
  helldenPaperV: {acyclovirDeclinePct: 56, cmmgDeclinePct: 73}
};

// 1. HD clearance sweep with the CMMG dialysis multiplier at its default (metDial 1).
const hdSweep = [81.8, 100, 120, 140, 160, 180].map(hdCl => ({hdCl, ...declines({hdCl})}));
// 2. CMMG dialysis multiplier sweep at the default HD clearance (the comparison #46 originally made).
const metDialSweep = [1, 1.5, 2, 2.5].map(metDial => ({metDial, ...declines({metDial})}));

// Dialyzer clearance that matches each source's acyclovir decline (bisection on the Hara reconstruction),
// then the CMMG decline the unchanged CMMG term predicts at that clearance.
function matchAcyclovir(target) {
  let lo = 40, hi = 300;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (declines({hdCl: mid}).acyclovirDeclinePct < target) lo = mid; else hi = mid;
  }
  const hdCl = Math.round((lo + hi) / 2);
  return {hdCl, ...declines({hdCl})};
}
const matched = {
  hara: matchAcyclovir(observed.hara.acyclovirDeclinePct),
  helldenPaperV: matchAcyclovir(observed.helldenPaperV.acyclovirDeclinePct)
};

// 3. Kidney clearance of CMMG: AyFlux coefficient vs Helldén Paper V linear fit (mL/min per mL/min CrCl).
const d = engine.DEFAULTS;
const renal = {
  ayfluxCmmgRenalPerCrCl: r1(0.12 * d.metRenal / 0.06 * 10) / 10,
  helldenPaperVCmmgRenalPerCrCl: 3.7474,
  ayfluxAcyclovirRenalPerCrCl: r1(0.202 / 0.06 * 10) / 10,
  helldenPaperVAcyclovirRenalPerCrCl: 1.5392
};

// 4. CrCl 0: nominal CMMG half-life between sessions (70 kg) and the guided-scenario peak.
const nominalHalfLifeH = r1(Math.LN2 * 0.4 * 70 / 0.25);

const results = {
  purpose: 'Evidence check for #46; no parameter is changed by this script.',
  observed, hdSweep, metDialSweep, matched, renal,
  crcl0: {nominalCmmgHalfLifeH: nominalHalfLifeH,
    identifiable: false,
    note: 'No source in hand reports CMMG nonrenal clearance or an interdialytic CMMG half-life.'},
  clinicalAnchor: {maxSymptomaticCmmgUmolL: 158, maxSymptomaticCmmgMgL: r1(158 * 239.19 / 1000),
    source: 'Helldén 2008 thesis, Paper I (7 of 49 symptomatic patients above 40 µmol/L; range 40–158)'}
};

// Conclusions the write-up relies on; fail loudly if the engine changes them.
assert.ok(Math.abs(matched.hara.cmmgDeclinePct - observed.hara.cmmgDeclinePct) <= 6,
  'with the dialyzer matched to Hara acyclovir, CMMG decline is within 6 points');
assert.ok(matched.hara.cmmgDeclinePct > observed.hara.cmmgDeclinePct &&
  matched.helldenPaperV.cmmgDeclinePct < observed.helldenPaperV.cmmgDeclinePct,
  'the two sources bracket the default CMMG dialysis term');

const out = process.argv[2] || path.join(__dirname);
fs.writeFileSync(path.join(out, 'cmmg-evidence-results.json'), JSON.stringify(results, null, 2) + '\n');
console.log(JSON.stringify({matched, renal, nominalHalfLifeH}, null, 2));
