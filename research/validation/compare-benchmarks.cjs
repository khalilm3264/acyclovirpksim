'use strict';

const assert = require('node:assert/strict');
const kac = require('./kacirova-paired.cjs');
const vasquez = require('./vasquez-hd.cjs');
const bataille = require('./bataille-csf.cjs');
const capd = require('./boelaert-capd.cjs');

const observedKac = [1.7, 8.9, 0.27, 0.64];
function parentLoss(values) {
  return values.slice(0, 2).reduce((sum, value, i) =>
    sum + Math.log(value / observedKac[i]) ** 2, 0) / 2;
}
// Select only on the two parent acyclovir samples in the reference reconstruction.
let best;
for (const clearanceScale of [0.4, 0.55, 0.7, 0.85, 1, 1.15]) {
  for (const vcScale of [0.6, 0.8, 1, 1.2, 1.5, 2]) {
    const overrides = {clearanceScale, vcScale};
    const values = kac.predict(87, 8, 1, 1 / 12, overrides);
    const loss = parentLoss(values);
    if (!best || loss < best.loss) best = {overrides, loss};
  }
}
console.log('# Exploratory benchmark comparison\n');
console.log('Selected multipliers: ' + JSON.stringify(best.overrides) + '\n');
console.log('| Endpoint | Published | Default | Selected grid point |');
console.log('|---|---:|---:|---:|');
function row(label, observed, baseline, candidate) {
  console.log('| ' + [label, observed.toFixed(3), baseline.toFixed(3), candidate.toFixed(3)].join(' | ') + ' |');
}
const baselineKac = kac.predict(87, 8, 1, 1 / 12);
const selectedKac = kac.predict(87, 8, 1, 1 / 12, best.overrides);
const fineKac = kac.predict(87, 8, 1, 1 / 24, best.overrides);
selectedKac.forEach((value, i) => {
  assert.ok(Math.abs(value - fineKac[i]) < 0.001);
  row(['Kacířová ACV trough (mg/L)', 'Kacířová ACV +25 min (mg/L)',
    'Kacířová CMMG trough (mg/L)', 'Kacířová CMMG +25 min (mg/L)'][i],
  observedKac[i], baselineKac[i], value);
});
const baseHD = vasquez.simulate(4, 0.125);
const selectedHD = vasquez.simulate(4, 0.125, best.overrides);
const fineHD = vasquez.simulate(4, 0.0625, best.overrides);
baseHD.forEach(([label, observed, value], i) => {
  assert.ok(Math.abs(selectedHD[i][2] - fineHD[i][2]) < 0.001);
  row('Vasquez ' + label, observed, value, selectedHD[i][2]);
});
const assumptions = {weight: 70, crcl: 0, hdCl: 81.8, duration: 4, extraHD: false};
const baseCSF = bataille.predict(assumptions, 1 / 64);
const selectedCSF = bataille.predict(assumptions, 1 / 64, best.overrides);
const fineCSF = bataille.predict(assumptions, 1 / 128, best.overrides);
[1.12, 0.67, 17.6].forEach((value, i) => {
  assert.ok(Math.abs(selectedCSF[i] - fineCSF[i]) < 0.001);
  row(['Bataille day-3 serum (mg/L)', 'Bataille day-3 CSF (mg/L)',
    'Bataille rechallenge serum (mg/L)'][i], value * 0.22521, baseCSF[i], selectedCSF[i]);
});
for (const subject of capd.subjects) {
  const baseline = capd.runOne(subject).metrics;
  const selected = capd.runOne(subject, best.overrides).metrics;
  const fine = capd.runOne(subject, best.overrides, 'Peritoneal dialysis', 0.125).metrics;
  assert.ok(Math.abs(selected.drainedPdPctTotalDose - fine.drainedPdPctTotalDose) < 0.01);
  row('Boelaert subject ' + subject.id + ' five-day CAPD recovery (%)',
    subject.pdRecoveryPct, baseline.drainedPdPctTotalDose, selected.drainedPdPctTotalDose);
}

// A single illustrative CAPD reconstruction, with both reported denominator interpretations.
const stath = require('./stathoulopoulou-capd.cjs');
const baseRecovery = stath.run(1, 70, 0.125);
const selectedRecovery = stath.run(1, 70, 0.125, best.overrides);
const fineRecovery = stath.run(1, 70, 0.0625, best.overrides);
for (const key of ['urine', 'dialysate']) {
  assert.ok(Math.abs(selectedRecovery[key] - fineRecovery[key]) < 0.001);
  const percent = key === 'urine' ? 3.4 : 6.51;
  for (const [label, denominator] of [['tablet', 500], ['ACV equivalent', 500 * 225.21 / 324.34]]) {
    row('Stathoulopoulou ' + key + ', ' + label + ' denominator (mg)',
      percent / 100 * denominator, baseRecovery[key], selectedRecovery[key]);
  }
}
