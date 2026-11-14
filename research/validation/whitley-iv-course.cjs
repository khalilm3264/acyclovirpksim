// Whitley et al., Am J Med 1982, pp. 166–169 (multiday cohort, Table II).
'use strict';
const assert = require('node:assert/strict');
const engine = require('../../public/assets/pk-engine.js');
const groups = [
  {mgKg:2.5,n:3,first:22.5,sdFirst:12.0,steady:30.1,sdSteady:12.6},
  {mgKg:5,n:6,first:36.2,sdFirst:5.5,steady:43.2,sdSteady:4.3},
  {mgKg:10,n:7,first:66.6,sdFirst:16.1,steady:66.9,sdSteady:5.5},
  {mgKg:15,n:4,first:94.6,sdFirst:30,steady:91.7,sdSteady:11.1}
];
const arms = [
  {name:'single',n:14,crcl:57,renal:125},
  {name:'single-day',n:9,crcl:62.9,renal:177},
  {name:'multiday',n:20,crcl:70.2,renal:184}
];
function simulate(group, bsa, weight, dt) {
  const config = {...structuredClone(engine.DEFAULTS),dose:weight*group.mgKg,every:8,
    doseCount:16,infusion:1,weight,crcl:arms[2].crcl*bsa/1.73,crclSource:'manual',
    renalMode:'constant',horizon:128,schedule:[],draws:1,variability:0};
  assert.deepEqual(engine.validate(config,'No dialysis'),[]);
  const p = engine.drawParams(config)[0], run=engine.single(config,p,[],dt);
  const at = (key,h) => run.cols[key][run.t.indexOf(h)];
  const first=at('plasma',1)/.22521, last=at('plasma',121)/.22521;
  return {first,last,peakRatio:last/first,csfPlasmaAt3:at('csf',3)/at('plasma',3),
    csfPlasmaAt123:at('csf',123)/at('plasma',123),
    percentRenal:100*p.renal/(p.renal+p.form+p.other)};
}
const results = groups.map(group => {
  const scenarios=[];
  for (const bsa of [1.5,1.73,2.1]) for (const weight of [50,70,90]) {
    const report=simulate(group,bsa,weight,1/64), fine=simulate(group,bsa,weight,1/128);
    for (const key of Object.keys(fine)) assert.ok(Math.abs(report[key]-fine[key])<0.001,key);
    scenarios.push({bsa,weight,...fine});
  }
  return {...group,observedRatio:group.steady/group.first,scenarios};
});
const renalComparisons = arms.map(arm => {
  const config = {...engine.DEFAULTS,weight:70,crcl:arm.crcl,variability:0,draws:1};
  const p=engine.drawParams(config)[0];
  return {...arm,observedRatio:arm.renal/arm.crcl,
    predictedRenal:p.renal/.06,predictedRatio:p.renal/.06/arm.crcl};
});
console.log(JSON.stringify({results,renalComparisons,
  csfSamples:[{measuredCsf:16.6,sourcePredictedPlasma:35.0},{measuredCsf:17.8,sourcePredictedPlasma:36.1}]},null,2));
