'use strict';
const fs=require('node:fs'),path=require('node:path');
const {subjects,runOne}=require('./boelaert-capd.cjs');
const MW=225.21/1000;
// Exploratory grid chosen after reviewing the published endpoints.
// Scale other and CMMG-formation clearance together, preserving their default ratio.
const systemicScales=Array.from({length:19},(_,i)=>0.75+i*0.125);
const transportScales=[0.5,0.75,1,1.5,2,3,4,6,8,12,16,24,32];
const sourceAucUmolHL={1:265,4:194,5:218};
function evaluate(s,systemic,transport,dt=0.25){
 const run=runOne(s,{clearanceScale:systemic,formFactor:systemic,pdTransport:transport},'Peritoneal dialysis',dt);
 const m=run.metrics,t=run.simulation.t,plasma=run.simulation.cols.plasma;
 let day5AucMgHL=0;
 for(let i=1;i<t.length;i++)if(t[i-1]>=96)day5AucMgHL+=(t[i]-t[i-1])*(plasma[i]+plasma[i-1])/2;
 const troughRatio=m.day5TroughMgL/(s.day5[1]*MW);
 const recoveryRatio=m.day5DrainedPdPctDailyDose/s.pdRecoveryPct;
 return {subject:s.id,systemic,transport,day5TroughMgL:m.day5TroughMgL,
  day5RecoveryPct:m.day5DrainedPdPctDailyDose,troughRatio,recoveryRatio,
  day5PeakRatio:m.day5PeakMgL/(s.day5[0]*MW),
  day5AucMgHL,day5AucRatio:day5AucMgHL/(sourceAucUmolHL[s.id]*MW),
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
 const individual=subjects.map(s=>{
  const ordered=rows.filter(r=>r.subject===s.id).sort((a,b)=>a.score-b.score);
  const minimum=ordered[0],near=ordered.filter(r=>r.score<=minimum.score+0.01);
  return {minimum,nearMinimumCount:near.length,
   nearMinimumSystemicRange:[Math.min(...near.map(r=>r.systemic)),Math.max(...near.map(r=>r.systemic))],
   nearMinimumTransportRange:[Math.min(...near.map(r=>r.transport)),Math.max(...near.map(r=>r.transport))]};
 });
 return {protocol:{source:'Boelaert 1987 Tables I–II',recoveryWindowHours:[96,120],
  engineSha256:require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../../public/assets/pk-engine.js'))).digest('hex'),
  systemicScales,transportScales,sourceAucUmolHL,residualCrcl:0,objective:'Mean sum of squared log ratios for day-5 trough and daily dialysate recovery',
  interpretation:'Exploratory calibration against known data; systemic multiplier scales both other and CMMG-formation clearance'},
  baseline:rows.filter(r=>r.systemic===1&&r.transport===1),
  bestShared:best,
  sharedPredictions:rows.filter(r=>r.systemic===best.systemic&&r.transport===best.transport),
  perSubject:individual.map(r=>r.minimum),profile:individual,
  individualConvergence:individual.map(r=>evaluate(subjects.find(s=>s.id===r.minimum.subject),r.minimum.systemic,r.minimum.transport,0.125)),
  convergence:subjects.map(s=>evaluate(s,best.systemic,best.transport,0.125)),
  rows,shared};
}
if(require.main===module){
 const out=process.argv[2] || __dirname;
 fs.mkdirSync(out,{recursive:true});
 const result=report();
 const {rows,shared,...summary}=result;
 fs.writeFileSync(path.join(out,'boelaert-joint-results.json'),JSON.stringify({...summary,shared},null,2)+'\n');
 const keys=Object.keys(result.rows[0]);
 fs.writeFileSync(path.join(out,'boelaert-joint-grid.csv'),keys.join(',')+'\n'+result.rows.map(r=>keys.map(k=>r[k]).join(',')).join('\n')+'\n');
 console.log(JSON.stringify({baseline:result.baseline,bestShared:result.bestShared,sharedPredictions:result.sharedPredictions,perSubject:result.perSubject,convergence:result.convergence},null,2));
}
module.exports={evaluate,report};
