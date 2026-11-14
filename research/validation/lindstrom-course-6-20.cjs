// Reconstruct the two remaining cases with explicit initial-dose discrepancies
// in Lindström 2019 Table 1 and its supplementary Case series (dkz357).
// Run: node research/validation/lindstrom-course-6-20.cjs
'use strict';
const assert = require('node:assert/strict');
const engine = require('../../public/assets/pk-engine.js');
const cases = [
  {patient: 6, weight: 60, age: 64, initialDoses: [12, 12.5],
    renal: [[0, 85], [51.5, 40], [292, 65], [488, 70]],
    visits: [
      {day: 3, lag: 3.5, crcl: 40, observed: [50, 9.7]},
      {day: 13, lag: 4, crcl: 65, observed: [18.6, 2.7]},
      {day: 21, lag: 8, crcl: 70, observed: [11, 2.3]}
    ]},
  {patient: 20, weight: 68, age: 55, initialDoses: [14, 15],
    renal: [[0, 131], [26.5, 131], [195, 60]],
    visits: [
      {day: 2, lag: 2.5, crcl: 131, observed: [31, 3.8]},
      {day: 9, lag: 3, crcl: 60, observed: [12, 3]}
    ]}
];

function renalAt(knots, time) {
  const end = knots.findIndex(point => point[0] >= time);
  if (end === -1) return knots.at(-1)[1];
  if (end === 0) return knots[0][1];
  const [a, ca] = knots[end - 1], [b, cb] = knots[end];
  return ca + (cb - ca) * (time - a) / (b - a);
}

function simulate(person, visit, initial, renalMode, step, lookback) {
  // Anchor the last infusion start at the beginning of the reported day.
  // The 8-hour lag on day 21 ends just before the next scheduled dose.
  const lastDose = (visit.day - 1) * 24;
  const end = lastDose + visit.lag;
  const start = Math.max(0, lastDose - lookback);
  const schedule = [];
  for (let time = 0; time <= lastDose;) {
    const reduced = person.patient === 20 && time >= 120;
    if (time >= start) schedule.push({route: 'Acyclovir IV', time: time - start,
      amount: person.weight * (reduced ? 5 : initial), infusion: 1});
    time += reduced ? 12 : 8;
  }
  const knots = [start, ...person.renal.map(([t]) => t).filter(t => t > start && t < end), end];
  const renalProfile = knots.map(time => ({time: time - start, crcl: renalAt(person.renal, time)}));
  const config = {...structuredClone(engine.DEFAULTS), weight: person.weight, age: person.age,
    sex: 'female', route: 'Acyclovir IV', renalMode, renalProfile, crcl: visit.crcl,
    crclSource: 'manual', dosingMode: 'custom', customDoses: schedule, horizon: end - start,
    draws: 1, variability: 0, observations: []};
  assert.deepEqual(engine.validate(config, 'No dialysis'), []);
  const doses = engine.buildDoses(config);
  assert.equal(config.horizon - doses.at(-1).time, visit.lag);
  const run = engine.single(config, engine.drawParams(config)[0], [], step, doses);
  return [run.cols.plasma.at(-1) / .22521, run.cols.cmmg.at(-1) / .23919];
}

const results = [];
for (const person of cases) {
  for (const visit of person.visits) {
    for (const initial of person.initialDoses) {
      for (const renalMode of ['constant', 'profile']) {
        const predicted = simulate(person, visit, initial, renalMode, .125, 288);
        const fine = simulate(person, visit, initial, renalMode, .0625, 288);
        const shorter = simulate(person, visit, initial, renalMode, .125, 240);
        predicted.forEach((value, i) => {
          assert.ok(Math.abs(value / fine[i] - 1) < .001);
          assert.ok(Math.abs(value - shorter[i]) < .001);
        });
        results.push({patient: person.patient, ...visit, initial, renalMode, predicted});
      }
    }
  }
}
console.log(JSON.stringify(results, null, 2));
// Observed pairs are serum ACV/CMMG; predictions are plasma in µmol/L.
// Profile runs linearly connect the reported visit estimates. For patient 6
// the narrative gives an initial CrCl of 85, then fluctuating renal function.
// The interpolation omits unmeasured fluctuations. For patient 20 we hold the
// first estimate through day 2. The reported four-fold creatinine increase
// cannot determine a unique CrCl trajectory. These visits are in the original cohort.
