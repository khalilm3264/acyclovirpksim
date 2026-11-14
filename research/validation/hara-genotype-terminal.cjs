// Hara et al. 2008, Tables 1–3. Six participants per group.
'use strict';
const assert = require('node:assert/strict');
const hara = require('./hara-hd.cjs');

const groups = [
  {genotype: '*1/*1', weight: 55.7, crcl: 0.93, halfLife: 18.1, sd: 4.1, aucInf: 197.62},
  {genotype: '*1/*2', weight: 53.7, crcl: 0.72, halfLife: 21.9, sd: 3.2, aucInf: 270.43},
  {genotype: '*2/*2', weight: 59.2, crcl: 1.14, halfLife: 26.7, sd: 4.0, aucInf: 280.23}
];
const sampling = [0, 1, 2, 3, 4, 6, 8, 12, 24, 44, 48];
const windows = [[12, 24, 44, 48], [24, 44, 48]];

function terminalFit(group, step) {
  const {run} = hara.simulate(step, {weight: group.weight, crcl: group.crcl});
  const plasma = hour => {
    const index = run.t.indexOf(hour);
    assert.ok(index >= 0);
    return run.cols.plasma[index];
  };
  // Source uses linear-up/log-down trapezoids and a Clast / ke tail.
  let auc48 = 0;
  for (let i = 1; i < sampling.length; i++) {
    const previous = plasma(sampling[i - 1]), current = plasma(sampling[i]);
    const mean = current < previous && current > 0
      ? (previous - current) / Math.log(previous / current) : (previous + current) / 2;
    auc48 += (sampling[i] - sampling[i - 1]) * mean;
  }
  return windows.map(hours => {
    const center = hours.reduce((sum, hour) => sum + hour, 0) / hours.length;
    const ke = -hours.reduce((sum, hour) => sum + (hour - center) * Math.log(plasma(hour)), 0)
      / hours.reduce((sum, hour) => sum + (hour - center) ** 2, 0);
    assert.ok(ke > 0);
    return {hours, halfLife: Math.LN2 / ke, aucInf: auc48 + plasma(48) / ke};
  });
}

const mean = groups.reduce((sum, g) => sum + g.halfLife, 0) / groups.length;
const between = groups.reduce((sum, g) => sum + 6 * (g.halfLife - mean) ** 2, 0);
const within = groups.reduce((sum, g) => sum + 5 * g.sd ** 2, 0);
const f = (between / 2) / (within / 15), r2 = between / (between + within);
// F(2,15) has an elementary upper-tail probability.
const p = (1 + 2 * f / 15) ** (-15 / 2);
assert.ok(Math.abs(r2 - 0.510) < 0.005 && Math.abs(f - 7.8) < 0.1);

const results = groups.map(group => {
  const predicted = terminalFit(group, 1 / 16);
  const fine = terminalFit(group, 1 / 32);
  predicted.forEach((row, i) => {
    for (const key of ['halfLife', 'aucInf']) assert.ok(Math.abs(row[key] / fine[i][key] - 1) < 0.0001);
  });
  return {...group, predicted};
});
console.log(JSON.stringify({source: '10.2133/dmpk.23.306', sampling, summaryAnova: {f, p, r2}, results}, null, 2));
