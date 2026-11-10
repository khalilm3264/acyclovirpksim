'use strict';
/**
 * Source-anchored CSF acyclovir experiments in oral valacyclovir-treated
 * individuals. NOT a treatment-effectiveness study, and NOT a model fit.
 * Lycke et al. 2003: doi:10.1128/AAC.47.8.2438-2441.2003
 * Pouplin et al. 2011: doi:10.1128/AAC.01023-10
 * All output generated with the unchanged AyFlux v0.26 canonical engine.
 */
const fs=require('node:fs');
const path=require('node:path');
const pk=require('../../public/assets/pk-engine.js');
const MW=225.21;
const round=x=>Math.round(x*1e5)/1e5;
const sources={
 lycke2003:{
  condition:'Multiple sclerosis, no documented damaged blood-CSF barrier',
  n:10,dose_mg:1000,every_hours:8,days_pretreatment:6,
  published:{plasma_cmax_uM:27.1,plasma_2h_uM:23.5,plasma_8h_uM:3.1,
   csf_2h_uM:2.5,csf_8h_uM:2.3,reported_csf_plasma_auc_ratio:.19},
  source_population:{mean_weight_kg:69,mean_crcl_mL_min:110,mean_age_years:31}
 },
 pouplin2011:{
  condition:'Clinically suspected/confirmed HSV encephalitis, variable inflammation and BBB status',
  enrolled:9,published_2h_postdose:[
   {day:0,plasma_uM:23.7,csf_uM:3.6},
   {day:2,plasma_uM:28.1,csf_uM:6.5},
   {day:10,plasma_uM:29.1,csf_uM:4.2},
   {day:20,plasma_uM:29.5,csf_uM:3.5}],
  published_albumin_association:{pearson_r:.53,p:.02},
  caution:'Repeated sampled individuals and attrition; do not interpret time-series group means as paired patient-level model performance or clinical efficacy.'
 }
};
function config(horizon,doseCount,overrides={}){
 return {...pk.DEFAULTS,age:31,sex:'female',weight:69,crclSource:'manual',crcl:110,
  route:'Valacyclovir oral',dosingMode:'repeat',dose:1000,every:8,doseCount,
  horizon,draws:1,variability:0,renalMode:'constant',
  ...overrides};
}
function sim(c){
 const errs=pk.validate(c,'No dialysis');
 if(errs.length)throw Error('Invalid reference simulation: '+errs.join('; '));
 const out=pk.single(c,pk.drawParams(c)[0],pk.scheduleFor('No dialysis',c),.25,pk.buildDoses(c));
 return out;
}
function point(out,t){
 const i=out.t.findIndex(x=>Math.abs(x-t)<1e-8);
 if(i<0)throw Error('Missing event checkpoint at '+t);
 const plasma=out.cols.plasma[i]*1000/MW,csf=out.cols.csf[i]*1000/MW;
 return {time_hour:t,plasma_acyclovir_uM:round(plasma),csf_acyclovir_uM:round(csf),
  csf_plasma_concentration_ratio:round(plasma>0?csf/plasma:0)};
}
function aucRatio(out,lo,hi){
 let x=0,y=0;
 for(let i=1;i<out.t.length;i++){
  if(out.t[i-1]<lo-1e-8||out.t[i]>hi+1e-8)continue;
  const dt=out.t[i]-out.t[i-1];
  x+=(out.cols.plasma[i]+out.cols.plasma[i-1])*dt/2;
  y+=(out.cols.csf[i]+out.cols.csf[i-1])*dt/2;
 }
 return round(y/x);
}
function runLycke(csfRatio=.3,csfLag=4){
 // 6 days of treatment and a 19th 1-g oral dose at t=144h.
 const c=config(152,19,{csfRatio,csfLag});
 const out=sim(c);
 const baseline=144;
 const profile=Array.from({length:33},(_,i)=>point(out,baseline+i*.25));
 const maxPlasma=Math.max(...profile.map(p=>p.plasma_acyclovir_uM));
 const p2=point(out,146),p8=point(out,152);
 return {experiment:'Lycke 2003 reference versus nominal fixed-cohort AyFlux',
   assumptions:{weight_kg:c.weight,crcl_mL_min:c.crcl,age_years:c.age,
    model_csf_partition:csfRatio,model_csf_equilibration_hours:csfLag,
    note:'Group mean demographics as a single fixed representative simulation, not observed individual matching'},
   observed:sources.lycke2003.published,model:{
    plasma_peak_uM:round(maxPlasma),plasma_2h_uM:p2.plasma_acyclovir_uM,plasma_8h_uM:p8.plasma_acyclovir_uM,
    csf_2h_uM:p2.csf_acyclovir_uM,csf_8h_uM:p8.csf_acyclovir_uM,
    csf_plasma_auc_ratio:aucRatio(out,144,152),
    observed_steady_csf_2h_versus_8h_difference_uM:round(sources.lycke2003.published.csf_2h_uM-sources.lycke2003.published.csf_8h_uM),
    modeled_steady_csf_2h_versus_8h_difference_uM:round(p2.csf_acyclovir_uM-p8.csf_acyclovir_uM)}
  };
}
function runPouplin(csfRatio=.3,csfLag=4){
 // Day 0, 2, 10 samples after their own 1-g q8h doses. Day 20 is
 // deliberately NOT simulated because the engine horizon is max 336h.
 const c=config(250,31,{csfRatio,csfLag});
 const out=sim(c);
 const obs=sources.pouplin2011.published_2h_postdose;
 const comparisons=obs.filter(x=>x.day<=10).map(x=>{
  const predicted=point(out,x.day*24+2);
  return {day:x.day,published_plasma_uM:x.plasma_uM,published_csf_uM:x.csf_uM,
   ayflux_plasma_uM:predicted.plasma_acyclovir_uM,
   ayflux_csf_uM:predicted.csf_acyclovir_uM,
   published_single_timepoint_csf_plasma_ratio:round(x.csf_uM/x.plasma_uM),
   ayflux_single_timepoint_csf_plasma_ratio:predicted.csf_plasma_concentration_ratio};
 });
 const a=comparisons.find(x=>x.day===2),b=comparisons.find(x=>x.day===10);
 return {experiment:'Pouplin 2011 CNS infection time trend versus time-invariant model assumptions',
  assumptions:{weight_kg:c.weight,crcl_mL_min:c.crcl,age_years:c.age,
   model_csf_partition:csfRatio,model_csf_equilibration_hours:csfLag,
   note:'Study group patient weights and individual renal profiles not matched; constant CSF parameters'},
  comparisons,source_day20_not_simulated:obs.find(x=>x.day===20),
  day2_to_day10_change:{observed_csf_percent:round(100*(b.published_csf_uM/a.published_csf_uM-1)),
   model_csf_percent:round(100*(b.ayflux_csf_uM/a.ayflux_csf_uM-1))},
  caution:'Study estimates are 2-hour point ratios, NOT AUC CSF/plasma ratios. No causal inference about barrier repair or HSV efficacy.'};
}
function report(output){
 const results={title:'AyFlux unchanged-engine acyclovir CSF source comparison',
  status:'research only / not a clinical validation',
  reference_sources:sources,
  lycke_sensitivity:[runLycke(.2,4),runLycke(.3,4),runLycke(.3,8)],
  pouplin_sensitivity:[runPouplin(.2,4),runPouplin(.3,4),runPouplin(.3,8)],
  constraints:[
   'Cannot run the observed day-20 timepoint because public AyFlux validates horizons <=336 hours.',
   'Lycke has non-infected participants; Pouplin involves HSV encephalitis, attrition and changing inflammation.',
   'The two studies share nominal oral dosing frequency but are not interchangeable cohorts.',
   'Reproducing point CSF concentrations does not establish drug effectiveness or toxicity safety.',
   'Future dynamic barrier model would require longitudinal data and independent validation before inclusion in production.' ]};
 if(output){fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(results,null,2)+'\n');}
 return results;
}
if(require.main===module)console.log(JSON.stringify(report(process.argv[2])));
module.exports={sources,config,point,aucRatio,runLycke,runPouplin,report};
