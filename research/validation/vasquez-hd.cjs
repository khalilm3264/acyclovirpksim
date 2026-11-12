'use strict';

const assert = require('node:assert/strict');
const engine = require('../../public/assets/pk-engine.js');

function simulate(admissionDelay, step) {
  const admission = 24 + admissionDelay;
  const hd1 = { type: 'HD', start: admission + 16, end: admission + 18 };
  const hd2 = { type: 'HD', start: hd1.end + 14, end: hd1.end + 16.5 };
  const config = engine.effectiveConfig({
    ...engine.DEFAULTS, age: 69, sex: 'female', weight: 49.9, scr: 11.3,
    crclSource: 'estimated', renalMode: 'constant', route: 'Valacyclovir oral',
    dosingMode: 'repeat', dose: 1000, every: 8, doseCount: 4,
    schedule: [hd1, hd2], horizon: hd2.end, draws: 1, variability: 0,
    trackMassBalance: true
  });
  const mode = 'Custom sequence';
  assert.deepEqual(engine.validate(config, mode), []);
  const run = engine.single(config, engine.drawParams(config)[0],
    engine.scheduleFor(mode, config), step, engine.buildDoses(config));
  function at(hour) {
    const index = run.t.indexOf(hour);
    assert.ok(index >= 0, 'Missing endpoint at hour ' + hour);
    return { plasma: run.cols.plasma[index], ...run.accounting[index].parts };
  }
  const start1 = at(hd1.start), end1 = at(hd1.end);
  const start2 = at(hd2.start), end2 = at(hd2.end);
  return [
    ['HD1 inlet at start (mg/L)', 8.8, start1.plasma],
    ['HD1 inlet at 2 h (mg/L)', 3.2, end1.plasma],
    ['HD2 removal (mg)', 66.6, end2.hd - start2.hd],
    ['Urinary recovery over 16 + 14 h (mg)', 17.7,
      (start1.kidney - at(admission).kidney) + (start2.kidney - end1.kidney)]
  ];
}

for (const delay of [0, 4, 8]) {
  const results = simulate(delay, 0.125);
  const finer = simulate(delay, 0.0625);
  console.log('\nAssumed last dose to admission: ' + delay + ' h\n');
  console.log('| Endpoint | Published | Predicted | Absolute difference | Difference (%) |');
  console.log('|---|---:|---:|---:|---:|');
  results.forEach(([label, observed, predicted], i) => {
    assert.ok(Math.abs(predicted - finer[i][2]) < 0.001, label + ': integration check');
    const diff = predicted - observed;
    console.log('| ' + [label, observed, predicted.toFixed(2), Math.abs(diff).toFixed(2),
      (100 * diff / observed).toFixed(1)].join(' | ') + ' |');
  });
}
