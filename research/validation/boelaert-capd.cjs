'use strict';
// Reproducible, explicitly uncalibrated full-engine comparison against
// Boelaert et al. J Antimicrob Chemother 1987;20:69-76.
// Source: doi:10.1093/jac/20.1.69. For research; never patient dosing.
const fs=require('node:fs');
const path=require('node:path');
const engine=require('../../public/assets/pk-engine.js');
const SOURCE='Boelaert et al. (1987), Tables I-II, pp. 70 and 73';
const MW_ACV=225.21; // g/mol; 1 micromol/L = 0.22521 mg/L
// Fitted published Cmax/Cmin are NOT original independent concentration samples.
// Only subjects without reported urinary recovery enter the prespecified anuric subset.
const subjects=[
 {id:1,sex:'male',age:22,weight:46.5,dose:110,day1:[22,4.1],day5:[27.6,6.3],pdRecoveryPct:10.6,reportedPdClMlMin:3.25,urineRecoveryPct:0},
 {id:4,sex:'male',age:49,weight:59,dose:142,day1:[19.3,2.3],day5:[22,3.0],pdRecoveryPct:13.6,reportedPdClMlMin:7.3833333333,urineRecoveryPct:0},
 {id:5,sex:'female',age:39,weight:48,dose:122,day1:[26.2,2.5],day5:[28.8,2.9],pdRecoveryPct:12.3,reportedPdClMlMin:5.05,urineRecoveryPct:0}
];
const exchangeTemplate=[
 {sessionStart:null,start:0,dwell:4,fill:2,glucose:1.36,uf:null},
 {sessionStart:null,start:4,dwell:4,fill:2,glucose:1.36,uf:null},
 {sessionStart:null,start:8,dwell:4,fill:2,glucose:1.36,uf:null},
 {sessionStart:null,start:12,dwell:12,fill:2,glucose:1.36,uf:null}
];
function configFor(s,overrides={}){
 return {...engine.DEFAULTS,age:s.age,sex:s.sex,weight:s.weight,
  crcl:0,crclSource:'manual',renalMode:'constant',
  route:'Acyclovir IV',dosingMode:'repeat',dose:s.dose,
  infusion:1,every:24,doseCount:5,horizon:120,
  pdMethod:'manual',pdRxEnabled:true,pdRxRows:exchangeTemplate.map(r=>({...r})),
  pdVolume:2,pdGlucose:1.36,draws:1,variability:0,trackMassBalance:true,
  ...overrides};
}
function valueAt(run,t,key){
 const i=run.t.findIndex(x=>Math.abs(x-t)<1e-9);
 if(i<0)throw Error('Missing simulation event at '+t);
 return key==='plasma'?run.cols.plasma[i]:run.accounting[i];
}
function runOne(s,overrides={},mode='Peritoneal dialysis',dt=.25){
 const c=configFor(s,overrides);
 const err=engine.validate(c,mode);
 if(err.length)throw Error('Invalid '+mode+' protocol: '+err.join('; '));
 const events=engine.buildDoses(c),schedule=engine.scheduleFor(mode,c);
 const output=engine.single(c,engine.drawParams(c)[0],schedule,dt,events);
 const maxResidual=Math.max(...output.accounting.map(a=>Math.abs(a.residual)));
 const input=output.accounting.at(-1).input;
 const drainedAt=hour=>valueAt(output,hour,'accounting').parts.pdDrained;
 const allDrained=drainedAt(120);
 const day5Drained=allDrained-drainedAt(96);
 const endpoints=[valueAt(output,1,'plasma'),valueAt(output,24,'plasma'),
  valueAt(output,97,'plasma'),valueAt(output,120,'plasma')];
 return {id:s.id,config:c,simulation:output,metrics:{
  day1PeakMgL:endpoints[0],day1TroughMgL:endpoints[1],
  day5PeakMgL:endpoints[2],day5TroughMgL:endpoints[3],
  fiveDayAucMgHL:output.summary.auc,
  actualInputAcyclovirMg:input,
  drainedPdMg:allDrained,
  drainedPdPctTotalDose:100*allDrained/(s.dose*5),
  day5DrainedPdMg:day5Drained,day5DrainedPdPctDailyDose:100*day5Drained/s.dose,
  maxMassBalanceResidualMg:maxResidual,
  pendingDialysateAtEndMg:valueAt(output,120,'accounting').parts.pdFluid
 }};
}
const r4=x=>Math.round(x*10000)/10000;
function summarize(s){
 const main=runOne(s);
 const none=runOne(s,{},'No dialysis');
 const standard=runOne(s,{pdRxRows:[
  {sessionStart:null,start:0,dwell:6,fill:2,glucose:1.36,uf:null},
  {sessionStart:null,start:6,dwell:6,fill:2,glucose:1.36,uf:null},
  {sessionStart:null,start:12,dwell:6,fill:2,glucose:1.36,uf:null},
  {sessionStart:null,start:18,dwell:6,fill:2,glucose:1.36,uf:null}
 ]});
 const weak=runOne(s,{pdTransport:.7});
 const strong=runOne(s,{pdTransport:1.3});
 const finer=runOne(s,{},'Peritoneal dialysis',.125);
 const diffNames=['day1PeakMgL','day1TroughMgL','day5PeakMgL','day5TroughMgL'];
 const reference=[...s.day1,...s.day5].map(x=>x*MW_ACV/1000);
 const model=diffNames.map(k=>main.metrics[k]);
 const detailed={
  study:SOURCE,subject:s.id,weight_kg:s.weight,dose_mg_daily:s.dose,
  route:'IV acyclovir',start_hours:[0,24,48,72,96],
  exchange_dwells_hours:[4,4,4,12],exchange_fill_liters:2,glucose_percent:1.36,
  residual_crcl_ml_min:0,reference_class:'author-fitted plasma endpoints',
  observed_pd_recovery_percent:s.pdRecoveryPct,observed_pd_clearance_ml_min:s.reportedPdClMlMin,
  checkpoints:diffNames.map((metric,i)=>({metric,
   source_fitted_mg_L:r4(reference[i]),ayflux_mg_L:r4(model[i]),
   percent_error:r4(100*(model[i]-reference[i])/reference[i])})),
  ayflux_pd_drained_percent_total_5d:r4(main.metrics.drainedPdPctTotalDose),
  ayflux_pd_drained_percent_day5:r4(main.metrics.day5DrainedPdPctDailyDose),
  ayflux_pd_drained_mass_total_mg:r4(main.metrics.drainedPdMg),
  day5_plasma_auc_mg_h_L:r4(main.metrics.fiveDayAucMgHL),
  no_pd_auc_mg_h_L:r4(none.metrics.fiveDayAucMgHL),
  exchange_timing_ablation_auc_mg_h_L:r4(standard.metrics.fiveDayAucMgHL),
  transport_low_auc_mg_h_L:r4(weak.metrics.fiveDayAucMgHL),
  transport_high_auc_mg_h_L:r4(strong.metrics.fiveDayAucMgHL),
  max_mass_balance_residual_mg:r4(main.metrics.maxMassBalanceResidualMg),
  finer_timestep_auc_rel_error_pct:r4(100*(finer.metrics.fiveDayAucMgHL/main.metrics.fiveDayAucMgHL-1)),
  finer_timestep_drained_pct_abs_diff:r4(finer.metrics.drainedPdPctTotalDose-main.metrics.drainedPdPctTotalDose),
  timing_caveat:'CAPD starts at t=0; published effluent volume by exchange not fully available',
  interpretive_caveat:'Model assumptions are not fitted to these subjects; published plasma endpoints are author-fitted, not independent raw measurements'
 };
 return {main,none,detailed};
}
function report(outputDir){
 const done=subjects.map(s=>summarize(s));
 const records=done.map(x=>x.detailed);
 const final={title:'AyFlux full JavaScript-engine Boelaert 1987 CAPD benchmark',
  validation:'Exploratory agreement assessment, not patient-level clinical validation',
  publishedMeanPdRecoveryPct:12.1,
  publishedSdPdRecoveryPct:2.1,
  software:'public/assets/pk-engine.js',runtime:process.version,
  solver:'canonical event-grid RK4; finer .125-h repeat for convergence check',
  subjects:records};
 if(outputDir){
  fs.mkdirSync(outputDir,{recursive:true});
  fs.writeFileSync(path.join(outputDir,'boelaert-capd-engine-results.json'),JSON.stringify(final,null,2)+'\n');
  const header=['subject','source_pd_recovery_pct','ayflux_5d_pd_recovery_pct',
   'ayflux_day5_pd_recovery_pct','day1_peak_mg_L','day1_trough_mg_L',
   'day5_peak_mg_L','day5_trough_mg_L','max_mass_balance_residual_mg'];
  const lines=[header.join(',')];
  for(const r of records)lines.push([r.subject,r.observed_pd_recovery_percent,
   r.ayflux_pd_drained_percent_total_5d,r.ayflux_pd_drained_percent_day5,
   ...r.checkpoints.map(x=>x.ayflux_mg_L),r.max_mass_balance_residual_mg].join(','));
  fs.writeFileSync(path.join(outputDir,'boelaert-capd-engine-results.csv'),lines.join('\n')+'\n');
 }
 return final;
}
if(require.main===module){
 const outputDir=process.argv[2]||path.resolve(__dirname,'../../research/validation/results');
 const outcome=report(outputDir);
 console.log(JSON.stringify(outcome,null,2));
}
module.exports={SOURCE,subjects,exchangeTemplate,configFor,runOne,summarize,report};
