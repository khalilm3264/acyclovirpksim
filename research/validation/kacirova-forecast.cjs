'use strict';

const assert = require('node:assert/strict');
const pk = require('../../public/assets/pk-engine.js');
const studies = require('../../public/assets/study-library.js');
const replay = require('../../public/assets/forecast-replay.js');

function forecast(config, points) {
  const observations = points.map(([time, value], i) => ({
    time, value, analyte: 'plasma', role: i === 0 ? 'fit' : 'holdout'
  }));
  const rows = replay.run(pk, { ...config, observations, draws: 120, assayCV: 0.15 }, 'No dialysis');
  assert.equal(rows.length, 1);
  const [row] = rows;
  assert.equal(row.fitted, 1);
  assert.equal(row.time, points[1][0]);
  return row;
}

const first = studies.find('kacirova');
const firstResult = forecast(studies.configFor(first, pk), first.points);
const secondResults = [];
// Figure 2 gives the concentrations and the change from q8h to q24h.
// The transition clock, sampled dose and exact post-infusion lag are uncertain.
for (const creatinine of [126, 135, 148, 160]) {
  for (const sampledDose of [700, 750]) {
    for (const transitionHour of [64, 66]) {
      for (const lagMinutes of [1, 15, 30, 40]) {
        const cutoff = transitionHour + 24;
        const schedule = Array.from({ length: 8 }, (_, i) => [i * 8, 750]);
        schedule.push([transitionHour, 750], [cutoff, sampledDose]);
        const config = {
          ...pk.DEFAULTS, age: 85, sex: 'female', weight: 70, scr: creatinine / 88.4,
          crclSource: 'estimated', renalMode: 'constant', dosingMode: 'custom',
          horizon: cutoff + 3,
          customDoses: schedule.map(([time, amount]) => ({ time, amount, infusion: 1, route: 'Acyclovir IV' }))
        };
        const result = forecast(config, [[cutoff, 3.2], [cutoff + 1 + lagMinutes / 60, 25.7]]);
        secondResults.push({ creatinine, sampledDose, transitionHour, lagMinutes, ...result });
      }
    }
  }
}
console.log(JSON.stringify({ firstResult, secondResults }, null, 2));
