// Descriptive comparison in six historical anuric subjects. All were used in
// prior research comparisons. No posterior fitting, inferred identities or new cohort.
'use strict';
const assert=require('node:assert/strict');
const engine=require('../../public/assets/pk-engine.js');
const {observed}=require('./laskin-individual-spread.cjs');
const {subjects,hours}=require('./laskin-fitted-distribution.cjs');
const sampling=hours.slice(0,6);
function atWeight(weight,draws) {
  const config={...structuredClone(engine.DEFAULTS),weight,crcl:0,crclSource:'manual',
    renalMode:'constant',dose:2.5*weight,infusion:1,doseCount:1,horizon:48,
    schedule:[],observations:[],variability:1,draws,coverage:.90};
  assert.deepEqual(engine.validate(config,'No dialysis'),[]);
  const run=engine.simulate(config,'No dialysis');
  return sampling.map((hour,j)=>{
    const i=run.time.indexOf(hour);
    assert.ok(i>=0);
    const lower=run.plasma.lower[i]/.22521,upper=run.plasma.upper[i]/.22521;
    const within=observed.map(row=>row[j]>=lower && row[j]<=upper);
    return {hour,lower,upper,within,count:within.filter(Boolean).length};
  });
}
const rows = [120,400].map(draws=>{
  const nominal=atWeight(57.5,draws);
  const counts=observed.map((_,i)=>nominal.filter(r=>r.within[i]).length);
  const weightSensitivity=subjects.map(([weight])=>({weight,
    counts:atWeight(weight,draws).map(w=>w.count)}));
  return {draws,nominal,perSubjectCounts:counts,contained:counts.reduce((a,b)=>a+b),
    completeProfiles:counts.filter(n=>n===sampling.length).length,weightSensitivity};
});
console.log(JSON.stringify({sampling,rows},null,2));
