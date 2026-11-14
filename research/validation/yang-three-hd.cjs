// Yang et al., Int J Dermatol 2007, pp. 883–884 and Fig. 1.
// DOI 10.1111/j.1365-4632.2007.03269.x. Units are mg/L, hours and mL/min.
'use strict';
const assert = require('node:assert/strict');
const engine = require('../../public/assets/pk-engine.js');
const observed = {before: {parent: 1.6, cmmg: 5}, after: {parentBelow: .5, cmmg: 'undetectable'}};
const startTimes = [48,72,96];
const schedule = startTimes.map(start => ({type: 'HD', start, end: start + 4}));
const preHours = [36,42,48], postHours = [100,106,112];
const inferredWeight = 500 / 7.7; // Daily IV dose (mg) divided by rounded mg/kg/day.
function simulate(crcl, hdCl, step) {
  const config = {...structuredClone(engine.DEFAULTS), age: 70, sex: 'male', weight: inferredWeight,
    crclSource: 'manual', renalMode: 'constant', crcl, hdCl, schedule, route: 'Acyclovir IV',
    dose: 250, every: 12, infusion: 1, doseCount: 3, horizon: 112, draws: 1, variability: 0};
  const mode = 'Custom sequence';
  assert.deepEqual(engine.validate(config, mode), []);
  const run = engine.single(config, engine.drawParams(config)[0], engine.scheduleFor(mode,config), step);
  return [...preHours,...postHours].map(time => {
    const i = run.t.indexOf(time);
    assert.ok(i >= 0);
    return {time, parent: run.cols.plasma[i], cmmg: run.cols.cmmg[i]};
  });
}
const results = [];
for (const crcl of [0,5,10]) {
  for (const hdCl of [81.8,159]) {
    const rows = simulate(crcl, hdCl, .125), finer = simulate(crcl, hdCl, .0625);
    for (let i = 0; i < rows.length; i++) {
      for (const key of ['parent','cmmg']) {
        assert.ok(Math.abs(rows[i][key] - finer[i][key]) < .0001);
      }
    }
    results.push({crcl, hdCl, rows: finer});
  }
}
console.log(JSON.stringify({observed, inferredWeight, preHours, postHours, results}, null, 2));
