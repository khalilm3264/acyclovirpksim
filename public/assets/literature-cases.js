/* SPDX-License-Identifier: AGPL-3.0-only */
(function(root){
'use strict';
const pk=root.RenalPKV7||(typeof require==='function'?require('./pk-engine.js'):null);
function cases(){
 const base={...structuredClone(pk.DEFAULTS),draws:1,variability:0,observations:[],schedule:[],crclSource:'manual',renalMode:'constant',dosingMode:'repeat'};
 const smith=(id,label,crcl,dose,every,auc)=>({
  id,label,doi:'10.1128/AAC.00729-09',mode:'No dialysis',analyte:'csfCmmg',
  note:'Smith Table 1 group mean CSF CMMG AUC after dose five. Nominal 70 kg reconstruction with group-average CrCl. The default CMMG CSF coefficient (0.025) is informed by this same study, so agreement here is not independent; the comparison column shows the previous default, 0.25, and Lindström 2019 is the independent check.',
  config:{...structuredClone(base),weight:70,route:'Valacyclovir oral',crcl,dose,every,doseCount:5,horizon:every*5},
  interval:[every*4,every*5],observedAuc:auc*239.19/1000,points:[],alternative:.25
 });
 return [
  {id:'laskin',label:'Laskin 1982 anuric cohort',doi:'10.1038/clpt.1982.83',mode:'No dialysis',analyte:'plasma',
   note:'Published six-participant plasma means. This nominal 70 kg reconstruction uses one 2.5 mg/kg IV dose. The 1–24 h comparison precedes dialysis and does not reproduce individual participants.',
   config:{...structuredClone(base),weight:70,crcl:0,route:'Acyclovir IV',dose:175,every:24,doseCount:1,infusion:1,horizon:24},
   points:[{time:1,value:37.5*.22521,sd:23.3*.22521},{time:8,value:10.3*.22521,sd:2.9*.22521},{time:24,value:6.4*.22521,sd:2.4*.22521}]},
  smith('smith-normal','Smith 2010 normal kidney function',111,2000,6,.42),
  smith('smith-ckd','Smith 2010 renal impairment',26,1500,12,3.8)
 ];
}
function runCase(id,dt=.125,calibration=null){
 const study=cases().find(s=>s.id===id);
 if(!study)throw Error('Unknown literature case.');
 const config=study.config,errors=pk.validate(config,study.mode);
 if(errors.length)throw Error(errors.join('; '));
 const simulate=c=>pk.single(c,pk.drawParams(c)[0],[],dt,pk.buildDoses(c));
 const run=simulate(config);
 function area(sim){
  const [start,end]=study.interval;
  let sum=0;
  for(let i=1;i<sim.t.length;i++)if(sim.t[i-1]>=start-1e-8&&sim.t[i]<=end+1e-8)
   sum+=(sim.t[i]-sim.t[i-1])*(sim.cols[study.analyte][i-1]+sim.cols[study.analyte][i])/2;
  return sum;
 }
 let alternative=null,alternativeLabel=null;
 if(study.alternative){
  alternative=simulate({...config,csfMetRatio:study.alternative});
  alternativeLabel='Previous CSF coefficient 0.25';
 }else if(study.id==='laskin'&&calibration){
  const comparison={...config,vcScale:calibration.vcScale,clearanceScale:calibration.clearanceScale};
  const errors=pk.validate(comparison,study.mode);
  if(errors.length)throw Error(errors.join('; '));
  alternative=simulate(comparison);
  alternativeLabel='Calibration (volume ×'+comparison.vcScale+', clearance ×'+comparison.clearanceScale+')';
 }
 return {study,alternativeLabel,time:run.t,values:run.cols[study.analyte],alternative:alternative?.cols[study.analyte],
  auc:study.interval?area(run):null,alternativeAuc:alternative&&study.interval?area(alternative):null};
}
function configuration(id){
 const study=cases().find(s=>s.id===id);
 if(!study)throw Error('Unknown literature case.');
 return {format:'acyclovir-pk-simulator',schemaVersion:2,appVersion:(typeof window!=='undefined'&&window.AyFluxVersion?.version)||'unknown',
  config:{...study.config,draws:30},primary:study.mode,visibleScenarios:[study.mode],appearance:{palette:'standard'},
  literature:{id:study.id,doi:study.doi,note:study.note}};
}
const api={cases,runCase,configuration};
if(typeof module==='object'&&module.exports)module.exports=api;
root.AyFluxLiterature=api;
})(typeof self!=='undefined'?self:globalThis);
