'use strict';
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const frozenBlobs = {
  'pk-engine.js': 'cb07505a2b9e619ee3351bb0bf66d5610a611a6f',
  'study-library.js': '3339c1561aeab7b6a01f3408b7fbbf558e96034d'
};
// Whole-page pixels, PDF page 6 at 145 dpi. The nominal times come from the
// protocol. The plot only identifies which infusion each square precedes.
const calibration = { zeroY: 1188, thirtyY: 799, xTicks: [284, 423, 559, 696, 836] };
const squares = [
  { hour: 24, x: 285, y: 1146 },
  { hour: 48, x: 419, y: 1146 },
  { hour: 72, x: 558, y: 1149 },
  { hour: 96, x: 690, y: 1145 }
];
const readingMarginUmolL = 0.5;
const mgPerUmol = 0.22521;
const leadHours = [0, 0.125, 0.25, 0.5];
const clearanceValues = [0, 2, 5];

function loadFrozen(directory, name) {
  const location = path.resolve(directory, name);
  const bytes = fs.readFileSync(location);
  const blob = createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
  assert.equal(blob, frozenBlobs[name], name + ' must come from revision 8fc1c9d');
  return require(location);
}

function run(directory, dt = 0.125) {
  const engine = loadFrozen(directory, 'pk-engine.js');
  const studies = loadFrozen(directory, 'study-library.js');
  const study = studies.find('boelaert-5');
  const base = { ...studies.configFor(study, engine), variability: 0, draws: 1 };
  const points = squares.map(square => ({
    ...square,
    observedUmolL: Number((30 * (calibration.zeroY - square.y) /
      (calibration.zeroY - calibration.thirtyY)).toFixed(1))
  }));
  const scenarios = clearanceValues.map(crcl => {
    const config = { ...base, crcl };
    const model = engine.single(config, engine.drawParams(config)[0], engine.scheduleFor(study.mode, config), dt);
    return points.map(({ hour }) => leadHours.map(lead => {
      const index = model.t.findIndex(time => Math.abs(time - (hour - lead)) < 1e-9);
      assert.ok(index >= 0, 'missing sample time');
      return model.cols.plasma[index];
    }));
  });
  return points.map((point, index) => {
    const observedMgL = point.observedUmolL * mgPerUmol;
    const nominal = scenarios[0][index][0];
    const timing = scenarios[0][index];
    const all = scenarios.flatMap(scenario => scenario[index]);
    return {
      ...point, observedMgL, nominal, nominalRatio: nominal / observedMgL,
      timingMin: Math.min(...timing), timingMax: Math.max(...timing),
      envelopeLowRatio: Math.min(...all) / ((point.observedUmolL + readingMarginUmolL) * mgPerUmol),
      envelopeHighRatio: Math.max(...all) / ((point.observedUmolL - readingMarginUmolL) * mgPerUmol)
    };
  });
}

if (require.main === module) {
  const directory = process.argv[2];
  if (!directory) throw new Error('Pass the directory containing the pinned pk-engine.js and study-library.js');
  const rows = run(directory);
  const fine = run(directory, 0.0625);
  for (const [i, row] of rows.entries()) {
    for (const key of ['nominal', 'timingMin', 'timingMax', 'envelopeLowRatio', 'envelopeHighRatio']) {
      assert.ok(Math.abs(row[key] - fine[i][key]) < 0.001, 'solver convergence for ' + key);
    }
  }
  console.log(JSON.stringify({ revision: '8fc1c9d', calibration, readingMarginUmolL,
    leadHours, clearanceValues, rows }, (_key, value) =>
    typeof value === 'number' ? Number(value.toFixed(4)) : value, 2));
}
module.exports = { run };
