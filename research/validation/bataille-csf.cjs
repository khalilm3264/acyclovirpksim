'use strict';

const assert = require('node:assert/strict');
const pk = require('../../public/assets/pk-engine.js');
const reference = {weight: 70, crcl: 0, hdCl: 81.8, duration: 4, extraHD: false};
const measured = [1.12 * 0.22521, 0.67 * 0.22521, 17.6 * 0.22521];

function predict(assumptions, dt, overrides = {}) {
  const {weight, crcl, hdCl, duration, extraHD} = assumptions;
  // Dose 1 begins immediately after the day-0 session.
  // Subsequent documented HD sessions end at day 3 and day 6.
  const schedule = [72, ...(extraHD ? [108] : []), 144]
    .map(end => ({type: 'HD', start: end - duration, end}));
  const config = {
    ...pk.DEFAULTS, age: 59, sex: 'female', weight, crcl,
    crclSource: 'manual', renalMode: 'constant', hdCl,
    horizon: 169, draws: 1, variability: 0, schedule, dosingMode: 'custom',
    customDoses: [0, 144].map(time => ({
      time, route: 'Acyclovir IV', amount: weight * 10, infusion: 1
    })), ...overrides
  };
  assert.deepEqual(pk.validate(config, 'Custom sequence'), []);
  const output = pk.single(config, pk.drawParams(config)[0],
    pk.scheduleFor('Custom sequence', config), dt, pk.buildDoses(config));
  function at(hour, compartment) {
    const index = output.t.indexOf(hour);
    assert.ok(index >= 0);
    return output.cols[compartment][index];
  }
  return [at(72, 'plasma'), at(72, 'csf'), at(169, 'plasma')];
}

if (require.main === module) {
const nominal = predict(reference, 0.015625);
const scenarios = [];
for (const weight of [50, 70, 90]) {
  for (const crcl of [0, 2, 5]) {
    for (const hdCl of [40, 81.8, 120]) {
      for (const duration of [3, 4, 5]) {
        for (const extraHD of [false, true]) {
          const assumptions = {weight, crcl, hdCl, duration, extraHD};
          const prediction = predict(assumptions, 0.015625);
          const fine = predict(assumptions, 0.0078125);
          prediction.forEach((value, i) =>
            assert.ok(Math.abs(value - fine[i]) < 0.001, 'Convergence'));
          scenarios.push(prediction);
        }
      }
    }
  }
}
console.log('| Endpoint | Measured | Reference prediction | Difference | Scenario range |');
console.log('|---|---:|---:|---:|---:|');
['Day-3 serum (mg/L)', 'Day-3 CSF (mg/L)', 'Day-7 serum (mg/L)',
  'Day-3 CSF/serum ratio'].forEach((label, i) => {
  const value = row => i === 3 ? row[1] / row[0] : row[i];
  const observed = i === 3 ? measured[1] / measured[0] : measured[i];
  const values = scenarios.map(value);
  console.log('| ' + [label, observed.toFixed(3), value(nominal).toFixed(3),
    (value(nominal) - observed).toFixed(3),
    Math.min(...values).toFixed(3) + '–' + Math.max(...values).toFixed(3)].join(' | ') + ' |');
});

}
module.exports = {predict};
