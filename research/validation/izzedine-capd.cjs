// node research/validation/izzedine-capd.cjs
// Izzedine et al., Am J Nephrol 2001;21:162–164, doi:10.1159/000046241.
// Table 1 labels the endpoints acyclovir after valacyclovir. The narrative
// sometimes calls the assayed material valacyclovir. Interpret as ACV for
// the comparison, preserving that source ambiguity.
'use strict';
const assert = require('node:assert/strict');
const engine = require('../../public/assets/pk-engine.js');
const observed = {peak: 8.7, tmax: 2, minimum: 1.7, aucInf: 127, halfLife: 15,
  bagClearance: [3.44, 5.04, 5.62, 7], bagDrainL: [1.7, 2.2, 2.1, 1.9]};
const samples = [0, 1/6, .5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 8, 12, 16, 24];
const mode = 'Peritoneal dialysis';
function simulate(doseCount, glucose, volumeScenario, step) {
  // Morning ingestion at first fill. Fill times 09:00/13:00/17:00/20:00.
  // The printed collection times 11:00/13:00/17:00/21:00 are different.
  // Optional volume scenario maps recorded volumes to fills in printed order.
  const sessionStart = (doseCount - 1) * 24;
  const pdRxRows = [0, 4, 8, 11].map((start, i) => ({
    start, dwell: [4, 4, 3, 13][i], fill: 2, glucose,
    uf: volumeScenario ? Math.round(1000 * (observed.bagDrainL[i] - 2)) : null
  }));
  const config = {...structuredClone(engine.DEFAULTS), age: 60, sex: 'female', weight: 75,
    crcl: 6, crclSource: 'manual', renalMode: 'constant', route: 'Valacyclovir oral',
    dose: 500, every: 24, doseCount, dosingMode: 'repeat', pdMethod: 'manual',
    pdRxEnabled: true, pdRxRows, horizon: doseCount * 24, draws: 1, variability: 0,
    trackMassBalance: true, observations: []};
  assert.deepEqual(engine.validate(config, mode), []);
  const run = engine.single(config, engine.drawParams(config)[0], engine.scheduleFor(mode, config), step);
  // Interpolate the 10 min sample. All other source times lie on the grid.
  const values = samples.map(h => {
    const t = h + sessionStart, right = run.t.findIndex(v => v >= t);
    assert.ok(right >= 0);
    if (run.t[right] === t) return run.cols.plasma[right];
    const left = right - 1, f = (t - run.t[left]) / (run.t[right] - run.t[left]);
    return run.cols.plasma[left] * (1 - f) + run.cols.plasma[right] * f;
  });
  const peak = Math.max(...values);
  const auc24 = samples.slice(1).reduce((sum, h, i) =>
    sum + (h - samples[i]) * (values[i] + values[i + 1]) / 2, 0);
  // Unknown source terminal points. Use 12/16/24 h in each scenario.
  const tailTimes = [12, 16, 24], center = 52 / 3;
  const beta = -tailTimes.reduce((sum, h) => sum + (h-center)*Math.log(values[samples.indexOf(h)]), 0) /
    tailTimes.reduce((sum, h) => sum + (h-center)**2, 0);
  const drains = run.drains.filter(d => d.start >= sessionStart);
  assert.equal(drains.length, 4);
  assert.ok(drains.every(d => d.complete));
  return {peak, tmax: samples[values.indexOf(peak)], predose: values[0], at24h: values.at(-1),
    auc24, aucInf: auc24 + values.at(-1) / beta, halfLife: Math.LN2 / beta,
    drainedMg: drains.reduce((sum, d) => sum + d.mass, 0),
    drainL: drains.map(d => d.volume)};
}
const rows = [];
for (const doseCount of [3, 4]) {
  for (const glucose of [1.36, 2.5]) {
    for (const volumeScenario of [false, true]) {
      const result = simulate(doseCount, glucose, volumeScenario, 1/32);
      const fine = simulate(doseCount, glucose, volumeScenario, 1/64);
      for (const key of ['peak', 'aucInf', 'halfLife', 'drainedMg']) {
        assert.ok(Math.abs(result[key] / fine[key] - 1) < .001);
      }
      rows.push({doseCount, glucose, volumeScenario, ...result});
    }
  }
}
console.log(JSON.stringify({observed, rows}, null, 2));
// The paper gives different dextrose concentrations without listing all
// strengths. The two uniform glucose scenarios are illustrative.
// Its four clearances have an arithmetic mean of 5.275 mL/min. The article
// does not supply the per-bag AUCs needed to reconstruct a 24-h mass from
// that mean. Neither clock nor the apparent 1% recovery fixes this ambiguity.
