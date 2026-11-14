// Boosman et al., J Clin Med 2025, Table 1 and section 3: population TDM summary.
'use strict';
const assert = require('node:assert/strict');
const engine=require('../../public/assets/pk-engine.js');
const source={treated:259,sampled:254,collected:787,excluded:6,trough:1.59,
  troughInterval:[.87,3.25],baselineEgfr:[34.3,56.8,92.8],doseRangeMgKg:[5,10],
  treatmentDaysMedian:5.5,cumulativeDoseMedian:5500};
function trajectory(crcl,weight,mgKg,dt) {
  const c={...structuredClone(engine.DEFAULTS),weight,crcl,crclSource:'manual',
    renalMode:'constant',dose:mgKg*weight,every:8,infusion:1,doseCount:16,horizon:128,
    draws:1,variability:0,observations:[],schedule:[]};
  assert.deepEqual(engine.validate(c,'No dialysis'),[]);
  const out=engine.single(c,engine.drawParams(c)[0],[],dt);
  return [24,48,96,128].map(t=>out.cols.plasma[out.t.indexOf(t)]);
}
const rows=[];
for(const egfr of source.baselineEgfr) for(const weight of [55,70,90])
  for(const bsa of [1.50,1.73,2.1]) for(const dose of source.doseRangeMgKg) {
    const crcl=egfr*bsa/1.73;
    const curve=trajectory(crcl,weight,dose,1/16), fine=trajectory(crcl,weight,dose,1/32);
    fine.forEach((c,i)=>assert.ok(Math.abs(c-curve[i])<.00001));
    rows.push({egfr,weight,bsa,crcl,dose,at24:fine[0],at48:fine[1],at96:fine[2],at128:fine[3]});
  }
console.log(JSON.stringify({source,eligibleSamples:source.collected-source.excluded,rows},null,2));
