'use strict';

// Lindström 2019, Table 1 and supplementary Case series, patient 7.
// The treatment day fixes a nominal last dose at the start of that day. The
// reported lag then fixes the sample. Each visit is reconstructed separately.
const assert = require('node:assert/strict');
const engine = require('../../public/assets/pk-engine.js');

const visits = [
  {id: '7a', day: 8, lag: 2.5, crcl: 109, serum: [55, 18]},
  {id: '7b', day: 15, lag: 4.5, crcl: 51, serum: [120, 38]},
  {id: '7c', day: 29, lag: 21, crcl: 35, serum: [11, 11]}
];
const sampleTime = visit => (visit.day - 1) * 24 + visit.lag;
const measurements = visits.map(visit => ({time: sampleTime(visit), crcl: visit.crcl}));

function clearanceAt(time) {
  if (time <= measurements[0].time) return measurements[0].crcl;
  for (let i = 1; i < measurements.length; i++) {
    const a = measurements[i - 1], b = measurements[i];
    if (time <= b.time) return a.crcl + (b.crcl - a.crcl) * (time - a.time) / (b.time - a.time);
  }
  return measurements.at(-1).crcl;
}

// Work backward from the last dose so every scenario honors the observed lag.
// A specified number of final 12 h intervals follows the initial 8 h regimen.
function simulate(visit, final12hIntervals, renalMode, crcl = visit.crcl, lookback = 312, step = 0.25) {
  const end = sampleTime(visit), lastDose = end - visit.lag;
  const start = Math.max(0, lastDose - lookback);
  const times = [];
  let time = lastDose;
  while (time >= start) {
    times.push(time);
    const interval = times.length <= final12hIntervals ? 12 : 8;
    time -= interval;
  }
  const route = 'Acyclovir IV';
  const customDoses = times.reverse().map(time => ({time: time - start, route, amount: 1140, infusion: 1}));
  const renalProfile = [
    {time: 0, crcl: clearanceAt(start)},
    ...measurements.filter(m => m.time > start && m.time < end)
      .map(m => ({time: m.time - start, crcl: m.crcl})),
    {time: end - start, crcl: clearanceAt(end)}
  ];
  const config = {...structuredClone(engine.DEFAULTS), age: 65, sex: 'male', weight: 76,
    crclSource: 'manual', crcl, renalMode, renalProfile, route, dosingMode: 'custom',
    customDoses, horizon: end - start, draws: 1, variability: 0, observations: []};
  assert.deepEqual(engine.validate(config, 'No dialysis'), []);
  const doses = engine.buildDoses(config);
  assert.equal(config.horizon - doses.at(-1).time, visit.lag);
  const intervals = doses.slice(1).map((d, i) => d.time - doses[i].time);
  const split = Math.max(0, intervals.length - final12hIntervals);
  assert.ok(intervals.slice(0, split).every(interval => interval === 8));
  assert.ok(intervals.slice(split).every(interval => interval === 12));
  const run = engine.single(config, engine.drawParams(config)[0], [], step, doses);
  assert.equal(run.t.at(-1), config.horizon);
  return [run.cols.plasma.at(-1) * 1000 / 225.21, run.cols.cmmg.at(-1) * 1000 / 239.19];
}

function display(visit, scenario, intervals, renalMode, crcl = visit.crcl) {
  const values = simulate(visit, intervals, renalMode, crcl);
  const finer = simulate(visit, intervals, renalMode, crcl, 312, 0.125);
  for (let i = 0; i < values.length; i++) assert.ok(Math.abs(values[i] / finer[i] - 1) < 0.001);
  if (crcl === visit.crcl) {
    const shorter = simulate(visit, intervals, renalMode, crcl, 240);
    for (let i = 0; i < values.length; i++) assert.ok(Math.abs(values[i] - shorter[i]) < 0.001);
  }
  const [acv, cmmg] = values;
  return {visit: visit.id, scenario, renalMode, acv: acv.toFixed(2), cmmg: cmmg.toFixed(2),
    acvPO: (acv / visit.serum[0]).toFixed(2), cmmgPO: (cmmg / visit.serum[1]).toFixed(2)};
}

const rows = [];
for (const visit of visits) {
  for (const mode of ['constant', 'profile']) {
    rows.push(display(visit, 'q8h comparison', 0, mode));
    if (visit.id === '7b') rows.push(display(visit, 'one preceding 12 h interval', 1, mode));
    if (visit.id === '7c') rows.push(display(visit, '12 days of q12h', 24, mode));
  }
}
for (const crcl of [10, 15]) rows.push(display(visits[1], 'q8h, fixed CrCl ' + crcl, 0, 'constant', crcl));
console.table(rows);
