// Helldén et al., NDT 2003, pp. 1135–39: Table 2 and Figure 4.
'use strict';
const assert = require('node:assert/strict');
const engine = require('../../public/assets/pk-engine.js');

const serumCutoffUmolL = 10.8;
const roc = {symptomatic:33,asymptomatic:44,sensitivityPct:90.9,specificityPct:93.2};
const all = {symptomatic:49,asymptomatic:44,symptomaticAbove:35,asymptomaticAbove:3};
const counts = {
  rocSymptomaticAbove:Math.round(roc.sensitivityPct/100 * roc.symptomatic),
  rocAsymptomaticBelowOrAt:Math.round(roc.specificityPct/100 * roc.asymptomatic),
  fullSymptomaticAbovePct:100*all.symptomaticAbove/all.symptomatic,
  fullAsymptomaticAbovePct:100*all.asymptomaticAbove/all.asymptomatic
};
const serumCutoffMgL = serumCutoffUmolL*239.19/1000;
assert.equal(serumCutoffMgL,engine.MARKER);
assert.equal(counts.rocSymptomaticAbove,30);
assert.equal(counts.rocAsymptomaticBelowOrAt,41);

// With nonnegative formation, C_end/C_start >= exp(-CL_m * T / V_m)
// at constant clearance/volume. A mean decline is only a comparison target.
const observed = {n:9,parentMeanDropPct:57,parentSd:9,cmmgMeanDropPct:64,cmmgSd:9};
const hdBounds = [];
for (const weight of [50,70,90]) for (const crcl of [0,5,15]) {
  const config = {...engine.DEFAULTS,weight,crcl,crclSource:'manual',
    renalMode:'constant',draws:1,variability:0};
  const p = engine.drawParams(config)[0];
  for (const duration of [3,4]) {
    const retain = 1-observed.cmmgMeanDropPct/100;
    const minimumTotal = -p.vm*Math.log(retain)/duration;
    const minimumHdMlMin = Math.max(0,(minimumTotal-p.mn-p.mr)/.06);
    const maximumDefaultDrop = 100*(1-Math.exp(-(p.mn+p.mr+p.hd*config.metDial)*duration/p.vm));
    assert.ok(Math.abs(Math.exp(-(p.mn+p.mr+minimumHdMlMin*.06)*duration/p.vm)-retain)<1e-12);
    hdBounds.push({weight,crcl,duration,minimumHdMlMin,maximumDefaultDrop});
  }
}
console.log(JSON.stringify({all,roc,counts,serumCutoffUmolL,serumCutoffMgL,observed,hdBounds},null,2));
