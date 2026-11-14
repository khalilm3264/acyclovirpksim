'use strict';
const fs=require('node:fs'),path=require('node:path');
const {subjects,runOne}=require('./boelaert-capd.cjs');
const MW=225.21/1000;
// Exploratory grid chosen after reviewing the published endpoints.
// Scale other and CMMG-formation clearance together, preserving their default ratio.
const systemicScales=[0.75,1,1.25,1.5,2,2.5,3];
const transportScales=[0.5,0.75,1,1.5,2,3,4];
function evaluate(s,systemic,transport,dt=0.25){
 const m=runOne(s,{clearanceScale:systemic,formFactor:systemic,pdTransport:transport},'Peritoneal dialysis',dt).metrics;
 const troughRatio=m.day5TroughMgL/(s.day5[1]*MW);
 const recoveryRatio=m.day5DrainedPdPctDailyDose/s.pdRecoveryPct;
 return {subject:s.id,systemic,transport,day5TroughMgL:m.day5TroughMgL,
  day5RecoveryPct:m.day5DrainedPdPctDailyDose,troughRatio,recoveryRatio,
  day5PeakRatio:m.day5PeakMgL/(s.day5[0]*MW),
  score:Math.log(troughRatio)**2+Math.log(recoveryRatio)**2,
  massResidualMg:m.maxMassBalanceResidualMg};
}
function report(){
 const rows=[];
 for(const systemic of systemicScales)for(const transport of transportScales){
  for(const s of subjects)rows.push(evaluate(s,systemic,transport));
 }
 const shared=[];
 for(const systemic of systemicScales)for(const transport of transportScales){
  const selected=rows.filter(r=>r.systemic===systemic&&r.transport===transport);
  shared.push({systemic,transport,score:selected.reduce((sum,r)=>sum+r.score,0)/subjects.length});
 }
 shared.sort((a,b)=>a.score-b.score);
 const best=shared[0];
 return {protocol:{source:'Boelaert 1987 Tables I–II',recoveryWindowHours:[96,120],
  engineSha256:require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../../public/assets/pk-engine.js'))).digest('hex'),
  systemicScales,transportScales,residualCrcl:0,objective:'Mean sum of squared log ratios for day-5 trough and daily dialysate recovery',
  interpretation:'Exploratory calibration against known data; systemic multiplier scales both other and CMMG-formation clearance'},
  baseline:rows.filter(r=>r.systemic===1&&r.transport===1),
  bestShared:best,
  sharedPredictions:rows.filter(r=>r.systemic===best.systemic&&r.transport===best.transport),
  perSubject:subjects.map(s=>rows.filter(r=>r.subject===s.id).sort((a,b)=>a.score-b.score)[0]),
  convergence:subjects.map(s=>evaluate(s,best.systemic,best.transport,0.125)),
  rows,shared};
}
if(require.main===module){
 const result=report();
 const {rows,shared,...summary}=result;
 fs.writeFileSync(path.join(__dirname,'boelaert-joint-results.json'),JSON.stringify({...summary,shared},null,2)+'\n');
 const keys=Object.keys(result.rows[0]);
 fs.writeFileSync(path.join(__dirname,'boelaert-joint-grid.csv'),keys.join(',')+'\n'+result.rows.map(r=>keys.map(k=>r[k]).join(',')).join('\n')+'\n');
 console.log(JSON.stringify({baseline:result.baseline,bestShared:result.bestShared,sharedPredictions:result.sharedPredictions,perSubject:result.perSubject,convergence:result.convergence},null,2));
}
module.exports={evaluate,report};
