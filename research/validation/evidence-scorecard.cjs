'use strict';
// Reproduces the evidence scorecard shown on the References & methods tab.
// Usage: node research/validation/evidence-scorecard.cjs [output.csv]
// Default parameters, no calibration, 400 seeded parameter draws for the 90% interval.
const fs = require('node:fs');
const engine = require('../../public/assets/pk-engine.js');
const studies = require('../../public/assets/study-library.js');

const scores = studies.STUDIES.map(study => studies.score(study, engine, {draws: 400}));
const csv = studies.csv(scores);
if (process.argv[2]) fs.writeFileSync(process.argv[2], csv);

console.log('| Study | Points | Predicted/observed (GMR) | Inside 90% interval |');
console.log('|---|---:|---:|---:|');
for (const score of scores) {
  const study = studies.find(score.id);
  console.log('| ' + [study.short + ' ' + study.cite, score.total, score.gmr.toFixed(2),
    score.inside + ' of ' + score.total].join(' | ') + ' |');
}
const summary = studies.summarize(scores);
const line = r => r.total + ' points; bias ratio (GMR) ' + r.gmr.toFixed(3) + '; geometric mean absolute fold error ' +
  r.absoluteFoldError.toFixed(3) + '; within twofold ' + r.withinTwo + '; inside band ' + r.inside;
console.log('\n' + summary.scenarios + ' comparison scenarios from ' + summary.sources + ' reference sources');
console.log('All: ' + line(summary.overall));
for (const group of summary.groups) if (group.total) console.log(group.name + ': ' + line(group));
module.exports = {scores, summary};
