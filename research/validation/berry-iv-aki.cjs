// Berry & Venkatesan, J Clin Virol 2014, pp. 608–610, Fig 1 and Table 1.
'use strict';
const assert = require('node:assert/strict');
const engine = require('../../public/assets/pk-engine.js');
const observed={serumDay8:{parent:182.2,cmmg:57.3},csfDay5:{parent:.88,cmmg:1.6}};
const firstCrcl=78, initialScr=73, peakScr=224; // Fig 1 IV-start Scr ~73 µmol/L
const lateCrcl=firstCrcl*initialScr/peakScr; // same size under Cockcroft–Gault; approximate AKI proxy
function simulate(weight,doseCount,kidney,dt) {
  const lastStart=8*(doseCount-1), horizon=lastStart+8;
  const config={...structuredClone(engine.DEFAULTS),weight,crcl:78,route:'Acyclovir IV',
    crclSource:'manual',dose:10*weight,every:8,infusion:1,doseCount,horizon,draws:1,
    variability:0,schedule:[],renalMode:'profile',
    renalProfile:[{time:0,crcl:kidney==='low'?lateCrcl:firstCrcl},
      {time:horizon,crcl:kidney==='preserved'?firstCrcl:lateCrcl}]};
  assert.deepEqual(engine.validate(config,'No dialysis'),[]);
  const run=engine.single(config,engine.drawParams(config)[0],[],dt);
  return [1,4,8].map(lag=>{
    const i=run.t.indexOf(lastStart+lag); assert.ok(i>=0);
    return {lag,parent:run.cols.plasma[i]/.22521,cmmg:run.cols.cmmg[i]/.23919};
  });
}
const results=[];
for(const weight of [65,80,95]) for(const doses of [1,6,9])
  for(const kidney of ['preserved','linear','low']) {
    const rows=simulate(weight,doses,kidney,1/16), fine=simulate(weight,doses,kidney,1/32);
    for(let i=0;i<rows.length;i++) for(const key of ['parent','cmmg'])
      assert.ok(Math.abs(rows[i][key]-fine[i][key])<.0001);
    results.push({weight,doses,kidney,rows:fine});
  }
// Approximate systemic input from tablets using one-hour infusions of absorbed mass.
function priorCourse(absorbedMg, dt) {
  const startIv=12*24, weight=80, doseCount=6;
  const doses=[];
  for(let day=0;day<12;day++) for(const clock of [0,4,8,12,16])
    doses.push({time:24*day+clock,route:'Acyclovir IV',amount:absorbedMg,infusion:1});
  for(let n=0;n<doseCount;n++)
    doses.push({time:startIv+8*n,route:'Acyclovir IV',amount:800,infusion:1});
  const horizon=startIv+48;
  const config={...structuredClone(engine.DEFAULTS),weight,crcl:78,crclSource:'manual',
    horizon,dosingMode:'custom',customDoses:doses,renalMode:'profile',
    renalProfile:[{time:0,crcl:78},{time:startIv,crcl:78},{time:horizon,crcl:lateCrcl}],
    draws:1,variability:0,schedule:[]};
  assert.deepEqual(engine.validate(config,'No dialysis'),[]);
  const out=engine.single(config,engine.drawParams(config)[0],[],dt);
  return [0,41,44,48].map(t=>{
    const i=out.t.indexOf(startIv+t);
    return {t,parent:out.cols.plasma[i]/.22521,cmmg:out.cols.cmmg[i]/.23919};
  });
}
const oralCarryover=[20,40].map(absorbedMg=>{
  const rows=priorCourse(absorbedMg,1/16), fine=priorCourse(absorbedMg,1/32);
  for(let i=0;i<rows.length;i++) for(const key of ['parent','cmmg'])
    assert.ok(Math.abs(rows[i][key]-fine[i][key])<.0001);
  return {absorbedMg,rows:fine};
});
console.log(JSON.stringify({observed,firstCrcl,lateCrcl,results,oralCarryover},null,2));
