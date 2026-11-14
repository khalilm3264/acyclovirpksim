// Almond et al., Nephron 1995;69:428–432, Table 2 p. 430.
// DOI 10.1159/000188514. Plasma acyclovir in µmol/L after one oral 800 mg
// acyclovir dose. The next routine HD started 48 h later and lasted 4–5 h.
// The authors simulate subsequent replacement doses separately from these
// measurements. The oral acyclovir formulation is outside AyFlux's routes.
'use strict';
const assert = require('node:assert/strict');
const rows = [
  // patient, pre-HD, end-HD, one hour after HD
  [1, 4.38, 1.77, 1.96], [2, 1.78, .17, .21], [3, 1.23, null, 1.43],
  [4, 1.13, .52, .56], [5, 2.24, 1.28, 1.79], [6, 2.50, null, 1.90],
  [7, 2.26, 2.25, 1.46]
];
const mean = values => values.reduce((a, b) => a + b, 0) / values.length;
const paired = rows.filter(([, , end, later]) => Number.isFinite(end) && Number.isFinite(later));
const differences = paired.map(([id, , end, later]) => ({id, change: later - end}));
const sorted = differences.map(d => d.change).sort((a, b) => a - b);
const endMean = mean(paired.map(r => r[2]));
const allLaterMean = mean(rows.map(r => r[3]));
assert.equal(paired.length, 5);
assert.equal(endMean.toFixed(2), '1.20');
assert.equal(allLaterMean.toFixed(2), '1.33');
console.log(JSON.stringify({units: 'µmol/L', rows, differences,
  increases: differences.filter(d => d.change > 0).length,
  pairedEndMean: endMean, pairedOneHourMean: mean(paired.map(r => r[3])),
  pairedMeanChange: mean(sorted), pairedMedianChange: sorted[2],
  allSevenOneHourMean: allLaterMean}, null, 2));
// Four increases and one larger decline produce almost identical paired
// means. The two additional one-hour samples lack a value at disconnect.
// No imputation, route substitution, or pooling with other cohorts.
