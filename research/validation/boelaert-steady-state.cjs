'use strict';
const fs=require('node:fs'),path=require('node:path');
const engine=require('../../public/assets/pk-engine.js');
const {subjects,configFor}=require('./boelaert-capd.cjs');
const candidates=[
 {name:'baseline',overrides:{}},
 {name:'shared-grid minimum',overrides:{clearanceScale:1.625,formFactor:1.625,pdTransport:2}},
 {name:'patient-4 minimum',overrides:{clearanceScale:1.875,formFactor:1.875,pdTransport:6}}
];
function report(){
 const records=[];
 for(const subject of subjects)for(const candidate of candidates){
  const c=configFor(subject,{...candidate.overrides,doseCount:20,horizon:480});
  const output=engine.single(c,engine.drawParams(c)[0],engine.scheduleFor('Peritoneal dialysis',c),0.125,engine.buildDoses(c));
  const at=hour=>{
   const i=output.t.findIndex(t=>Math.abs(t-hour)<1e-8);
   if(i<0)throw Error('Missing event at '+hour);
   return {plasma:output.cols.plasma[i],drained:output.accounting[i].parts.pdDrained};
  };
  const windows=[3,5,10,20].map(day=>{
   const end=at(day*24),start=at((day-1)*24);
   return {day,troughMgL:end.plasma,recoveryPct:100*(end.drained-start.drained)/subject.dose};
  });
  const fifth=windows.find(w=>w.day===5),last=windows.at(-1);
  records.push({subject:subject.id,candidate:candidate.name,windows,
   day5vsDay20TroughPercent:100*(fifth.troughMgL/last.troughMgL-1),
   day5vsDay20RecoveryPercent:100*(fifth.recoveryPct/last.recoveryPct-1),
   massResidualMg:Math.max(...output.accounting.map(r=>Math.abs(r.residual)))});
 }
 return {protocol:{days:20,stepHours:0.125,interpretation:'Numerical approach to a repeating regimen under fixed assumptions; measured source steady state is a separate observation'},records};
}
if(require.main===module){
 const out=process.argv[2] || __dirname;
 fs.mkdirSync(out,{recursive:true});
 const r=report();fs.writeFileSync(path.join(out,'boelaert-steady-state-results.json'),JSON.stringify(r,null,2)+'\n');
 console.log(JSON.stringify(r.records.map(x=>({subject:x.subject,candidate:x.candidate,troughPct:x.day5vsDay20TroughPercent,recoveryPct:x.day5vsDay20RecoveryPercent})),null,2));
}
module.exports={report};
