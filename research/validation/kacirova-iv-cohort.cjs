// Kacířová et al. 2022, Tables 2–3. Aggregate IV cohort, DOI 10.1016/j.biopha.2022.113852.
'use strict';
const assert = require('node:assert/strict');
const engine = require('../../public/assets/pk-engine.js');

const strata = [
  {group:'higher eGFR', weight:77, height:174, indexed:85.8, daily:2250, nTrough:15, nPost:15,
    observed:{parent:[1.9,14.0], cmmg:[0.39,0.92], ratio:[0.18,0.07]}},
  {group:'lower eGFR', weight:70, height:160, indexed:48, daily:1500, nTrough:11, nPost:10,
    observed:{parent:[3.2,13.6], cmmg:[1.30,1.85], ratio:[0.38,0.15]}}
];
const lags = [1,30,40];
function compare(group, every, deindex, thesisSlope, dt) {
  const bsa = Math.sqrt(group.weight * group.height / 3600);
  const crcl = group.indexed * (deindex ? bsa / 1.73 : 1);
  const scale = (group.weight / 70) ** 0.75;
  const config = {...structuredClone(engine.DEFAULTS), weight:group.weight, crcl, crclSource:'manual',
    renalMode:'constant', dose:group.daily * every / 24, infusion:1, every,
    // Before the first morning dose on day five and after that same dose.
    doseCount:1 + 96/every, horizon:98, schedule:[], draws:1, variability:0,
    metRenal:thesisSlope ? 3.7474 / (2 * scale) : 1};
  assert.deepEqual(engine.validate(config,'No dialysis'),[]);
  const run = engine.single(config, engine.drawParams(config)[0], [], dt);
  const measurements = [96, ...lags.map(minutes => 97 + minutes/60)].map(time => {
    const index = run.t.findIndex(t => Math.abs(t-time) < 1e-7);
    assert.ok(index >= 0, 'missing sample time ' + time);
    const parent = run.cols.plasma[index], cmmg = run.cols.cmmg[index];
    return {time,parent,cmmg,ratio:cmmg/parent};
  });
  return {every,deindex,thesisSlope,crcl,measurements};
}
const results = strata.map(group => {
  const scenarios = [];
  for (const every of [8,12]) for (const deindex of [true,false]) for (const thesisSlope of [false,true]) {
    const fine = compare(group,every,deindex,thesisSlope,1/60);
    const finer = compare(group,every,deindex,thesisSlope,1/120);
    for (const i of [0,1,2,3]) for (const k of ['parent','cmmg','ratio'])
      assert.ok(Math.abs(fine.measurements[i][k] - finer.measurements[i][k]) < 0.00001);
    scenarios.push(fine);
  }
  return {...group,scenarios};
});
console.log(JSON.stringify({lags,results},null,2));
