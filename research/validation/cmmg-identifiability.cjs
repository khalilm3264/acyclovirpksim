// Scale symmetry of the current linear metabolite model. All changes are local.
'use strict';
const assert = require('node:assert/strict');
const engine = require('../../public/assets/pk-engine.js');
const hara = require('./hara-hd.cjs');
const {table} = require('./de-miranda-iv-recovery.cjs');

const factors = [0.5,1,1.05];
function checkedFamily(config, mode, dt) {
  assert.deepEqual(engine.validate(config,mode),[]);
  const params = engine.drawParams(config)[0];
  const schedule = engine.scheduleFor(mode,config);
  const baseline = engine.single(config,params,schedule,dt);
  return factors.map(k => {
    const form = k*params.form;
    const p = {...params,form,other:params.other+params.form-form,
      vm:k*params.vm, mr:k*params.mr, mn:k*params.mn};
    assert.ok(p.other >= 0 && p.vm > 0);
    const run = engine.single({...config,metDial:k*config.metDial},p,schedule,dt);
    assert.deepEqual(run.t,baseline.t);
    let maxConcentrationDifference = 0, urineMg = 0;
    const flux = i => run.cols.cmmgKidneyClear[i]*0.06*run.cols.cmmg[i];
    for (let i=0; i<run.t.length; i++) {
      for (const col of ['plasma','cmmg','csf','csfCmmg','pdDialConc']) {
        maxConcentrationDifference = Math.max(maxConcentrationDifference,
          Math.abs(run.cols[col][i]-baseline.cols[col][i]));
      }
      if (i>0) urineMg += (run.t[i]-run.t[i-1])*(flux(i)+flux(i-1))/2;
    }
    assert.ok(maxConcentrationDifference<1e-9);
    assert.ok(Math.abs(run.summary.massBalanceErrorMg)<1e-7);
    return {k,nTimes:run.t.length,maxConcentrationDifference,urineMg};
  });
}
const baseline = {...structuredClone(engine.DEFAULTS), draws:1, variability:0,
  crclSource:'manual', trackMassBalance:true, observations:[]};
const oralHd = checkedFamily({...hara.simulate().config,trackMassBalance:true},'Custom sequence',1/16);
const mixed = {...baseline,horizon:48,renalMode:'profile',
  renalProfile:[{time:0,crcl:65},{time:16,crcl:0},{time:48,crcl:30}],
  dosingMode:'custom',customDoses:[{time:0,route:'Valacyclovir oral',amount:1000},
    {time:16.3,route:'Acyclovir IV',amount:500,infusion:1.7}],
  schedule:[{type:'CRRT',start:0,end:12},{type:'HD',start:18,end:22},{type:'PD',start:24,end:48}]};
const mixedDialysis = checkedFamily(mixed,'Custom sequence',1/32);

// Reuse the five original Table IV rows and time horizon. At 120 h, the
// integrated renal flux should approach the separately derived infinite-time fraction.
const recovery = table.map(row => {
  const [id,mgPerKg,crcl] = row;
  const observedCmmgPct = row[6];
  const config = {...baseline,horizon:120,doseCount:1,dose:mgPerKg*70,weight:70,crcl,schedule:[]};
  const p = engine.drawParams(config)[0];
  const baselineFraction = p.form/(p.renal+p.other+p.form)*p.mr/(p.mr+p.mn);
  const scenarios = checkedFamily(config,'No dialysis',1/16).map(row => {
    const dosePct = 100*row.urineMg*(225.21/239.19)/config.dose;
    assert.ok(Math.abs(dosePct-100*row.k*baselineFraction)<0.005);
    return {...row,dosePct};
  });
  return {id,observedCmmgPct,scenarios};
});
const mean = xs => xs.reduce((a,b)=>a+b,0)/xs.length;
const meanRecovery = factors.map((k,i) => ({k,dosePct:mean(recovery.map(row=>row.scenarios[i].dosePct))}));
console.log(JSON.stringify({oralHd,mixedDialysis,recovery,meanRecovery,
  observedMeanPct:mean(recovery.map(row=>row.observedCmmgPct))},null,2));
