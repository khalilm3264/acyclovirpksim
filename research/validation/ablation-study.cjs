'use strict';
// Component ablation against the published concentrations of the evidence scorecard.
// Each variant removes or replaces one model component in the nominal (no-variability)
// parameter set, reruns every comparison scenario unchanged otherwise, and reports bias
// (geometric mean predicted/observed) and error (geometric mean absolute fold error).
// The engine file is not modified. Usage: node research/validation/ablation-study.cjs [out.csv]
const fs = require('node:fs');
const engine = require('../../public/assets/pk-engine.js');
const studies = require('../../public/assets/study-library.js');

const ALLOMETRIC = ['q', 'other', 'renal', 'form', 'mr', 'mn'];
const VARIANTS = [
  {id: 'full', label: 'Full model (reference)', apply: p => p},
  {id: 'no-peripheral', label: 'No peripheral compartment (Q = 0)', apply: p => ({...p, q: 0})},
  {id: 'no-other', label: 'No other nonrenal acyclovir clearance', apply: p => ({...p, other: 0})},
  {id: 'no-cmmg', label: 'No CMMG formation', apply: p => ({...p, form: 0})},
  {id: 'gfr-only', label: 'Renal clearance = CrCl (no net secretion)', apply: (p, c) => ({...p, renal: p.renal * (0.06 / 0.202)})},
  {id: 'no-dialysis', label: 'No dialytic clearance', apply: p => ({...p, hd: 0, pd: 0, crrt: 0})},
  {id: 'no-allometry', label: 'No allometric weight scaling', apply: (p, c) => {
    const undo = Math.pow(70 / c.weight, 0.75), out = {...p};
    for (const key of ALLOMETRIC) out[key] *= undo;
    return out;
  }},
  {id: 'renal-75', label: 'Renal coefficient ×0.75 (post hoc, from [16])', posthoc: true, apply: p => ({...p, renal: p.renal * 0.75})},
];

function predictions(study, variant) {
  const config = engine.effectiveConfig({...studies.configFor(study, engine), draws: 1, variability: 0});
  const params = variant.apply(engine.drawParams(config)[0], config);
  const run = engine.single(config, params, engine.scheduleFor(study.mode, config), 0.25, engine.buildDoses(config));
  return studies.pointsOf(study).map(point => ({study: study.id, mode: study.mode, ...point,
    predicted: studies.interp(run.t, run.cols[point.analyte], point.time)}));
}

function stats(rows) {
  // A component whose removal predicts zero for an analyte has no defined fold error.
  if (!rows.length || rows.some(r => !(r.predicted > 0))) return null;
  const logs = rows.map(r => Math.log(r.predicted / r.observed));
  const mean = values => values.reduce((a, b) => a + b, 0) / values.length;
  return {n: rows.length, bias: Math.exp(mean(logs)), afe: Math.exp(mean(logs.map(Math.abs))),
    within2: logs.filter(x => Math.abs(x) <= Math.log(2) + 1e-12).length};
}

const GROUPS = [
  ['plasma', 'Plasma acyclovir, all', r => r.analyte === 'plasma'],
  ['plasma-no-dialysis', 'Plasma, no dialysis', r => r.analyte === 'plasma' && r.mode === 'No dialysis'],
  ['plasma-dialysis', 'Plasma, dialysis', r => r.analyte === 'plasma' && r.mode !== 'No dialysis'],
  ['cmmg', 'Plasma CMMG', r => r.analyte === 'cmmg'],
];

function run() {
  return VARIANTS.map(variant => {
    const rows = studies.STUDIES.flatMap(study => predictions(study, variant));
    return {variant, rows, groups: Object.fromEntries(GROUPS.map(([key, , test]) => [key, stats(rows.filter(test))]))};
  });
}

if (require.main === module) {
  const results = run();
  console.log('| Variant | ' + GROUPS.map(g => g[1] + ' bias / AFE / within 2×').join(' | ') + ' |');
  console.log('|---|' + GROUPS.map(() => '---:').join('|') + '|');
  for (const r of results) console.log('| ' + r.variant.label + ' | ' + GROUPS.map(([key]) => {
    const s = r.groups[key];
    if (!s) return 'not defined';
    return s.bias.toFixed(2) + ' / ' + s.afe.toFixed(2) + ' / ' + s.within2 + '/' + s.n;
  }).join(' | ') + ' |');
  if (process.argv[2]) {
    const lines = ['variant,study_id,analyte,time_h,observed_mg_L,predicted_nominal_mg_L'];
    for (const r of results) for (const row of r.rows)
      lines.push([r.variant.id, row.study, row.analyte, +row.time.toFixed(4), row.observed, +row.predicted.toPrecision(6)].join(','));
    fs.writeFileSync(process.argv[2], lines.join('\n') + '\n');
  }
}
module.exports = {VARIANTS, run, predictions, stats};
