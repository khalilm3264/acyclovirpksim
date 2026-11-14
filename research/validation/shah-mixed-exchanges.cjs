// node research/validation/shah-mixed-exchanges.cjs
// Shah et al., Am J Kidney Dis 1986, doi:10.1016/S0272-6386(86)80193-7.
// Table 1 gives counts by dextrose concentration, but no within-day order.
// p. 509 gives recovered amounts on each study day and a three-day mean CL.
'use strict';
const assert = require('node:assert/strict');
const engine = require('../../public/assets/pk-engine.js');
const days = [1, 4, 7];
const observedPct = [5.7, 10.8, 11.0];
const mode = 'Custom sequence';
const schedule = Array.from({length: 7}, (_, i) => ({type: 'PD', start: i * 24, end: (i + 1) * 24}));
const customDoses = schedule.map(({start}) => ({time: start, route: 'Acyclovir IV',
  amount: start === 0 ? 275 : 137.5, infusion: 1}));
function orders(bags) {
  const permutations = new Set();
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (i !== j) permutations.add([bags[i], bags[j], bags[3 - i - j]].join(','));
    }
  }
  return [...permutations].map(sequence => sequence.split(',').map(Number));
}
const mixtures = [[1.5, 1.5, 2.5], [1.5, 2.5, 4.25], [1.5, 1.5, 4.25]].map(orders);

function simulate(order, crcl, step) {
  // Day starts at the morning fill/infusion. Approximate exchanges at
  // 07:00, 13:00, 19:00. Assume 1.5% throughout days 2, 3, 5, 6.
  const exchanges = (mix, sessionStart) => mix.map((glucose, j) => ({sessionStart,
    start: j * 6, dwell: j === 2 ? 12 : 6, fill: 2, glucose, uf: null}));
  const pdRxRows = [...exchanges([1.5, 1.5, 1.5], null),
    ...days.flatMap((day, i) => exchanges(order[i], (day - 1) * 24))];
  const config = {...structuredClone(engine.DEFAULTS), weight: 55, age: 75, sex: 'male',
    crcl, crclSource: 'manual', renalMode: 'constant', observations: [],
    route: 'Acyclovir IV', dosingMode: 'custom', customDoses, schedule, pdMethod: 'manual',
    pdRxEnabled: true, pdRxRows, horizon: 168, variability: 0, draws: 1, trackMassBalance: true};
  assert.deepEqual(engine.validate(config, mode), []);
  const run = engine.single(config, engine.drawParams(config)[0], engine.scheduleFor(mode, config), step);
  assert.equal(run.drains.length, 21);
  assert.ok(run.drains.every(d => d.complete));
  assert.ok(Math.abs(run.accounting.at(-1).residual) < 1e-7);
  return days.map(day => {
    const begin = (day - 1) * 24, end = day * 24;
    const drains = run.drains.filter(d => d.start >= begin && d.end <= end);
    assert.equal(drains.length, 3);
    const mg = drains.reduce((sum, drain) => sum + drain.mass, 0);
    let auc = 0;
    const endIndex = run.t.indexOf(end);
    for (let i = run.t.indexOf(begin) + 1; i <= endIndex; i++) {
      auc += (run.t[i] - run.t[i - 1]) * (run.cols.plasma[i] + run.cols.plasma[i - 1]) / 2;
    }
    return {recoveryPct: 100 * mg / customDoses[day - 1].amount, clearanceMlMin: mg / auc / .06};
  });
}
// Table 2 reports indexed CrCl 2.0. Absolute CrCl 1.7 and 2.0 mL/min
// illustrate assumed BSAs of about 1.47 and 1.73 m². Individual BSA unknown.
for (const crcl of [1.7, 2]) {
  const results = [];
  for (const first of mixtures[0]) {
    for (const fourth of mixtures[1]) {
      for (const seventh of mixtures[2]) {
        const order = [first, fourth, seventh];
        const rows = simulate(order, crcl, .125);
        const fine = simulate(order, crcl, .0625);
        rows.forEach((r, i) => {
          for (const key of Object.keys(r)) assert.ok(Math.abs(r[key] / fine[i][key] - 1) < .001);
        });
        results.push(rows);
      }
    }
  }
  assert.equal(results.length, 54);
  const range = values => [Math.min(...values), Math.max(...values)];
  console.log(JSON.stringify({crcl, scenarios: results.length, days, observedPct,
    recoveryPct: days.map((_, i) => range(results.map(rows => rows[i].recoveryPct))),
    meanOfThreeClearancesMlMin: range(results.map(rows =>
      rows.reduce((sum, row) => sum + row.clearanceMlMin, 0) / rows.length))}));
}
// Daily recovery includes drug from previous doses. The reported mean effluent
// volumes per bag strength are not individual exchange UF measurements. Use
// the engine's exploratory fluid model throughout. Results are conditional.
