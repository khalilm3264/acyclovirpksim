'use strict';
const fs = require('node:fs');
const path = require('node:path');
const pk = require('../../public/assets/pk-engine.js');
const {run} = require('./parameter-recovery.cjs');
const times = Array.from({length:65}, (_, index) => index / 4);
const schedules = [[12], [1,12], [0.5,1,2,4,8,12]];
const examples = [];
run(({c, base, grid, raw, reference, observations, truth, replicate, at}) => {
  if (replicate !== 0) return;
  const clearance = scale => base.form + (base.other + base.renal) * scale;
  const designs = schedules.map(hours => {
    const samples = observations.filter(sample => hours.includes(sample.time));
    const {weights} = pk.posterior(raw, {...c, observations:samples});
    const interval = values => pk.weightedStat(values, weights, 0.9);
    return {
      hours,
      curve:times.map(time => interval(raw.map(profile => at(profile,time))).median),
      peak:interval(raw.map(profile => profile.summary.peak)),
      auc:interval(raw.map(profile => profile.summary.auc)),
      clearance:interval(grid.map(pair => clearance(pair.clearance)))
    };
  });
  examples.push({truth:{peak:reference.summary.peak, auc:reference.summary.auc, clearance:clearance(truth.clearance)},
    samples:observations.map(({time,value}) => ({time,value})), designs});
});
fs.writeFileSync(path.join(__dirname,'../../public/research/sampling/data.json'), JSON.stringify({times,examples}, (key,value) =>
  typeof value === 'number' ? Number(value.toFixed(5)) : value) + '\n');
