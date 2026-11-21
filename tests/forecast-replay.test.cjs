'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');
const pk = require('../public/assets/pk-engine.js');
const replay = require('../public/assets/forecast-replay.js');

const mode = 'Intermittent HD';
const config = { ...pk.DEFAULTS, horizon: 48, draws: 20, hdStart: 20, hdRepeat: 24 };
const sample = (time, value, role = 'fit', analyte = 'plasma') => ({ time, value, role, analyte });
const observations = [
  sample(30, 1), sample(0, 2), sample(15, 3), sample(9, 7, 'holdout'),
  sample(15, 0.5, 'holdout', 'cmmg')
];

test('rolling replay covers every later sampling time and preserves simultaneous targets', () => {
  const rows = replay.run(pk, { ...config, observations }, mode);
  assert.deepEqual(rows.map(({ cutoff, time, analyte, fitted }) => [cutoff, time, analyte, fitted]),
    [[0, 9, 'plasma', 1], [9, 15, 'plasma', 1], [9, 15, 'cmmg', 1], [15, 30, 'plasma', 2]]);
  assert.deepEqual(rows.map(({ improvement, population, updated, observed }) =>
    improvement === Math.abs(population.median - observed) - Math.abs(updated.median - observed)),
    [true, true, true, true]);
  assert.deepEqual(replay.run(pk, { ...config, observations: [sample(8, 1)] }, mode), []);
});

test('targets and permanent holdouts do not influence weights before or during their forecast', () => {
  const run = (rows) => replay.run(pk, { ...config, observations: rows }, mode);
  const changed = observations.map((entry) =>
    entry.time === 0 ? entry : { ...entry, value: entry.value + 20 });
  const baseline = run(observations);
  const revised = run(changed);
  for (let i = 0; i < baseline.length; i++) {
    assert.deepEqual(baseline[i].population, revised[i].population);
    if (baseline[i].cutoff < 15) assert.deepEqual(baseline[i].updated, revised[i].updated);
  }
  assert.notDeepEqual(baseline.at(-1).updated, revised.at(-1).updated);

  const withheld = run(observations.map(entry =>
    entry.role === 'holdout' ? { ...entry, value: entry.value + 50 } : entry));
  assert.deepEqual(withheld.map(row => row.updated), baseline.map(row => row.updated));
});

test('the research worker returns replay rows for the chosen mode', () => {
  const messages = [];
  const sandbox = vm.createContext({ performance });
  sandbox.self = sandbox;
  sandbox.RenalPKV7 = pk;
  sandbox.postMessage = (message) => messages.push(message);
  sandbox.importScripts = (...paths) => {
    if (paths.includes('/assets/forecast-replay.js')) {
      vm.runInContext(fs.readFileSync(require.resolve('../public/assets/forecast-replay.js'), 'utf8'), sandbox);
    }
  };
  vm.runInContext(fs.readFileSync(require.resolve('../public/assets/research-worker.js'), 'utf8'), sandbox);
  const replayConfig = { ...config, observations };
  sandbox.onmessage({ data: { id: 1, action: 'forecast-replay', config: replayConfig, mode } });
  assert.equal(messages[0].id, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(messages[0].data)), replay.run(pk, replayConfig, mode));
});
