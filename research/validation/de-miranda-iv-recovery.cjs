// Node research-only comparison with de Miranda et al., Clin Pharmacol Ther 1981.
// DOI 10.1038/clpt.1981.218, Methods pp. 663–664 and Table IV on pp. 670–671.
// Table IV splits horizontally across the page break. Columns are paired by row.
'use strict';
const assert = require('node:assert/strict');
const engine = require('../../public/assets/pk-engine.js');

// Study row, mg/kg IV, estimated indexed CrCl, total urinary label (% of dose),
// urinary ACV (HPLC and RIA %), urinary CMMG (HPLC %), renal ACV CL (indexed).
const table = [
  ['VMB', 0.5, 84, 78.9, 68.1, 56.5, 9.3, 216],
  ['EJH', 0.5, 52, 70.6, 62.1, 60.1, 9.4, 178],
  ['MAM', 2.5, 71, 93.1, 85.4, 86.0, 9.3, 282],
  ['RFR', 2.5, 66, 89.4, 75.5, 77.6, 14.1, 173],
  ['GSS', 2.5, 125, 99.0, 91.0, 96.2, 8.5, 353]
];
const measuredCrCl = {VMB: 66, EJH: 28}; // Table IV footnotes, mL/min/1.73 m²
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;

function recover(row, indexedCrCl, bsa, weight, step) {
  const [id, mgPerKg] = row;
  const crcl = indexedCrCl * bsa / 1.73;
  const config = {...structuredClone(engine.DEFAULTS), weight, crcl,
    route: 'Acyclovir IV', infusion: 1, dose: mgPerKg * weight, doseCount: 1,
    dosingMode: 'repeat', renalMode: 'constant', crclSource: 'manual',
    draws: 1, variability: 0, horizon: 120, observations: [], trackMassBalance: true};
  assert.deepEqual(engine.validate(config, 'No dialysis'), []);
  const p = engine.drawParams(config)[0];
  const run = engine.single(config, p, [], step);
  const final = run.accounting.at(-1);
  assert.ok(Math.abs(final.residual) < 1e-7);
  const parentPercent = final.parts.kidney / config.dose * 100;

  // CMMG carries the parent's label. Express its mass in molar parent equivalents.
  // At constant clearances the renal fraction of eliminated CMMG is mr/(mr+mn).
  const remainingEquivalent = run.cols.cmmg.at(-1) * p.vm * 225.21 / 239.19;
  const urineEquivalent = (final.parts.formed - remainingEquivalent) * p.mr / (p.mr + p.mn);
  const cmmgPercent = 100 * urineEquivalent / config.dose;

  // Check against direct integration of the renal flux from simulated concentrations.
  let eliminated = 0;
  for (let i = 1; i < run.t.length; i++) {
    eliminated += (run.t[i] - run.t[i-1]) * p.mr * (run.cols.cmmg[i-1] + run.cols.cmmg[i]) / 2;
  }
  assert.ok(Math.abs(eliminated * 225.21 / 239.19 - urineEquivalent) < 1e-5 * config.dose);
  // Upper asymptotes computed from nominal parallel pathway clearance fractions.
  const total = p.renal + p.form + p.other;
  const closedParent = 100 * p.renal / total;
  const closedCmmg = 100 * p.form / total * p.mr / (p.mr + p.mn);
  assert.ok(Math.abs(closedParent - parentPercent) < .005);
  assert.ok(Math.abs(closedCmmg - cmmgPercent) < .005);
  return {id, crcl, parentPercent, cmmgPercent, cmmgShareOfTwo:
    100 * cmmgPercent / (parentPercent + cmmgPercent)};
}

if (require.main === module) {
  const results = table.map(row => {
    const base = recover(row, row[2], 1.73, 70, 0.125);
    const finer = recover(row, row[2], 1.73, 70, 0.0625);
    assert.ok(Math.abs(base.cmmgPercent - finer.cmmgPercent) < .001);
    return {...base, observedParentPercent: row[4], observedCmmgPercent: row[6],
      observedCmmgShareOfTwo: 100 * row[6] / (row[4] + row[6])};
  });
  const sensitivity = [1.5, 1.73, 2.1].map(bsa => {
    const rows = table.map(row => recover(row, row[2], bsa, 70, .125));
    return {assumedBsa: bsa, meanParentPercent: mean(rows.map(r => r.parentPercent)),
      meanCmmgPercent: mean(rows.map(r => r.cmmgPercent))};
  });
  const alternativeCrCl = table.filter(row => measuredCrCl[row[0]]).map(row =>
    recover(row, measuredCrCl[row[0]], 1.73, 70, .125));
  console.log(JSON.stringify({results, sensitivity, alternativeCrCl,
    observedMeanParentPercent: mean(results.map(r => r.observedParentPercent)),
    observedMeanCmmgPercent: mean(results.map(r => r.observedCmmgPercent))}, null, 2));
}
module.exports = {table};
