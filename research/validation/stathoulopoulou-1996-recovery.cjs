// node research/validation/stathoulopoulou-1996-recovery.cjs
// Stathoulopoulou et al., Nephron 1996, doi:10.1159/000189332.
// Methods p. 338, Tables 1–2 p. 339. Ten CAPD participants received
// a single 800 mg oral acyclovir dose, distinct from the 2002 valacyclovir study.
// Columns: peak µmol/L, AUC0–31 µmol·h/L, apparent total clearance
// mL/min/1.73 m², CAPD clearance mL/min. Do not equate CL/F with CL.
'use strict';
const assert = require('node:assert/strict');
const data = [
  [12.6, 238.1, 229.9, 3.4], [3.56, 62.2, 619.5, 4.2],
  [6.67, 101.2, 429.6, 3.7], [13.7, 181.3, 255.8, 3.7],
  [6.78, 129.6, 290.7, 2.2], [7.2, 146.5, 239.0, 3.3],
  [5.96, 96.6, 421.0, 3.4], [13.9, 201.7, 266.3, 3.3],
  [10.9, 141.2, 306.8, 2.3], [8.2, 82.4, 531.8, 3.6]
];
const mean = values => values.reduce((sum, x) => sum + x, 0) / values.length;
function summarize(values) {
  const average = mean(values);
  const sd = Math.sqrt(values.reduce((sum, x) => sum + (x - average) ** 2, 0) / (values.length - 1));
  return {mean: average, sampleSD: sd, sem: sd / Math.sqrt(values.length)};
}
const results = data.map(([peak, auc31, totalClOverF, pdCl], i) => {
  // Invert the paper's CLpd = collected amount / AUC0–31. The recovered
  // mass is inferred from rounded values, not an independent endpoint.
  const recoveryMg = auc31 * pdCl * .06 * .22521;
  return {participant: i + 1, peak, auc31, totalClOverF, pdCl,
    recoveryMg, percentOfAdministeredDose: recoveryMg / 800 * 100};
});
const summary = Object.fromEntries(['peak', 'auc31', 'totalClOverF', 'pdCl', 'recoveryMg',
  'percentOfAdministeredDose'].map(key => [key, summarize(results.map(r => r[key]))]));
assert.equal(summary.pdCl.mean.toFixed(1), '3.3');
assert.equal(summary.pdCl.sampleSD.toFixed(2), '0.62');
assert.equal(summary.totalClOverF.mean.toFixed(1), '359.0');
assert.equal(summary.totalClOverF.sem.toFixed(1), '42.7');
console.log(JSON.stringify({results, summary}, null, 2));
// The authors' 6.8% estimate is the peritoneal share of total clearance
// under an assumed bioavailability. It has a different denominator from
// 31-hour dialysate mass as a percentage of the swallowed 800 mg.
