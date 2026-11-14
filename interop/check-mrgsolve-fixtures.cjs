// Verify every committed mrgsolve comparison fixture against the production engine.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const engine = require('../public/assets/pk-engine.js');

const hd = [{type: 'HD', start: 8, end: 12}];
const cases = [
  {name: 'iv_700mg_constant_crcl50', crcl: 50},
  {name: 'iv_700mg_dynamic_crcl50_to10_to95', crcl: 50, renalMode: 'profile',
    renalProfile: [{time: 0, crcl: 50}, {time: 12, crcl: 10}, {time: 24, crcl: 95}]},
  {name: 'iv_700mg_anuric_hd8_to12', crcl: 0, schedule: hd}
];
for (const {name, ...inputs} of cases) {
  const config = {...structuredClone(engine.DEFAULTS), weight: 70, dose: 700, infusion: 1,
    doseCount: 1, horizon: 24, draws: 1, variability: 0, observations: [], schedule: [], ...inputs};
  const mode = config.schedule.length ? 'Custom sequence' : 'No dialysis';
  assert.deepEqual(engine.validate(config, mode), []);
  const run = engine.single(config, engine.drawParams(config)[0], engine.scheduleFor(mode, config), .25);
  const file = path.join(__dirname, 'fixtures', name + '.csv');
  const lines = fs.readFileSync(file, 'utf8').trim().split(/\r?\n/);
  assert.equal(lines.shift(), 'time_hours,plasma_acyclovir_mg_L,plasma_cmmg_mg_L,entered_crcl_mL_min');
  assert.equal(lines.length, run.t.length, name);
  lines.forEach((line, i) => {
    const fields = line.split(',');
    assert.equal(fields.length, 4);
    assert.ok(fields.every(s => s.trim().length && Number.isFinite(Number(s))));
    const [time, plasma, metabolite, clearance] = fields.map(Number);
    assert.equal(time, run.t[i]);
    assert.ok(Math.abs(plasma - run.cols.plasma[i]) < 1e-9, name + ' acyclovir at ' + time);
    assert.ok(Math.abs(metabolite - run.cols.cmmg[i]) < 1e-9, name + ' CMMG at ' + time);
    assert.ok(Math.abs(clearance - engine.renalCrClAt(config, time)) < 1e-9);
  });
  console.log(name + ': ' + lines.length + ' time points match the production engine');
}
