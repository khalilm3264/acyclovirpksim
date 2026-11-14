// Research-only split of nonrenal parent clearance at fixed total clearance.
// Changing the production formFactor by itself does not hold this sum fixed.
'use strict';
const assert = require('node:assert/strict');
const engine = require('../../public/assets/pk-engine.js');
const hara = require('./hara-hd.cjs');
const {groups, calculate, summarize} = require('./hellden-iv-profiles.cjs');

const nominal = engine.drawParams({...engine.DEFAULTS,weight:70,draws:1,variability:0})[0];
const fraction = nominal.form / (nominal.form + nominal.other);
const maxMultiplier = 1 / fraction;
function split(params, share) {
  const total = params.form + params.other;
  return {...params,form:share*total,other:(1-share)*total};
}

// Independently verify proportionality for EVERY sample of the Hara oral/HD
// course, including time before, during and after drug absorption and during HD.
const h = hara.simulate(.0625);
const config = h.config;
const params = engine.drawParams(config)[0];
const schedule = engine.scheduleFor('Custom sequence',config);
const haraResults = [0,.5,fraction,1].map(share => {
  const out = engine.single(config,split(params,share),schedule,.0625);
  h.run.t.forEach((t,i) => {
    assert.ok(Math.abs(out.cols.plasma[i]-h.run.cols.plasma[i]) < 1e-9);
    assert.ok(Math.abs(out.cols.cmmg[i]-h.run.cols.cmmg[i]*share/fraction) < 1e-9);
  });
  return {share,peakMgL:Math.max(...out.cols.cmmg.filter((_,i) => out.t[i]<=48))};
});

// The original #46 stress scenario. Report absolute peak by hour 96.
const stress = {...structuredClone(engine.DEFAULTS), weight:70, dose:700, every:8,
  doseCount:12, horizon:96, crcl:0, crclSource:'manual', renalMode:'constant',
  draws:1, variability:0, observations:[], schedule:[]};
assert.deepEqual(engine.validate(stress,'No dialysis'),[]);
const stressParams = engine.drawParams(stress)[0];
const stressResults = [.5, fraction, 1].map(share => {
  const run = engine.single(stress,split(stressParams,share),[],.0625);
  return {share, peakParent:Math.max(...run.cols.plasma), peakCmmg:Math.max(...run.cols.cmmg)};
});
const hd = groups.find(g => g.group === 'HD');
const measured = summarize(hd.parent,hd.cmmg);
const profiles=[];
for (const crcl of hd.crcls) for (const duration of [.25,1]) {
  const baseline = calculate(hd,crcl,duration,2,.0625);
  const maximum = calculate(hd,crcl,duration,2,.0625,p => split(p,1));
  assert.ok(Math.abs(maximum.parentAuc - baseline.parentAuc) < 1e-9);
  assert.ok(Math.abs(maximum.cmmgAuc - baseline.cmmgAuc*maxMultiplier) < 1e-9);
  profiles.push({crcl,duration,baseline:baseline.cmmgAuc,maximum:maximum.cmmgAuc,
    ratioAtMaximum:maximum.ratio,requiredShare:fraction*measured.cmmgAuc/baseline.cmmgAuc});
}
console.log(JSON.stringify({fraction,maxMultiplier,haraObservedPeak:h.observed.cmmgPeak,haraResults,
  helldenObserved:measured,profiles,stressResults},null,2));
