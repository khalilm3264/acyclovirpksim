'use strict';
/** Mechanistic hypothesis experiments, not clinical validation.
 * All concentrations computed by the AyFlux canonical JavaScript engine.
 * Observed source values from Boelaert JAC 1987 and Smith AAC 2010.
 */
const fs=require('node:fs');
const pk=require('../../public/assets/pk-engine.js');
const capd=require('./boelaert-capd.cjs');
const ACV_MW=225.21, CMMG_MW=239.19;
const r4=x=>Math.round(x*10000)/10000;
const src={
  // Boelaert Table II fitted central V1 and nonperitoneal K10; K13/K31 describe peritoneal exchange.
  1:{V1:16.4,k10:.097,k13:.037,k31:.434},
  4:{V1:28.2,k10:.099,k13:.057,k31:.647},
  5:{V1:17.4,k10:.126,k13:.045,k31:.421},
};
function pctDiff(x,y){return 100*(x/y-1);}
function endpoints(s,override={}){
 const r=capd.runOne(s,override).metrics;
 return {peak:r.day5PeakMgL,trough:r.day5TroughMgL,
  pd_recovery_5d_pct:r.drainedPdPctTotalDose,
  auc_120h:r.fiveDayAucMgHL};
}
function pd(){
 return capd.subjects.map(s=>{
  const ref=src[s.id],nonperipheralRef=ref.V1*ref.k10;
  const assumedVc=.32*s.weight;
  const nominalNonPdCl=.12+1.6; // L/h at 0 mL/min CrCl, 1 draw, default fixed weight allometry
  const fittedFactor=(nonperipheralRef-.12)/1.6 * Math.pow(s.weight/70,-.75); // form parameter incorporates body-weight scale
  // In drawParams, form=1.6*weightscale*formFactor and other=.12*weightscale.
  const weightScale=Math.pow(s.weight/70,.75),correctedFactor=((nonperipheralRef/weightScale)-.12)/1.6;
  const variants={
   baseline:endpoints(s),
   noPD:capd.runOne(s,{},'No dialysis').metrics,
   nominalV1Source:endpoints(s,{vcScale:ref.V1/assumedVc}),
   PD_transport_0_7:endpoints(s,{pdTransport:.7}),
   PD_transport_1_3:endpoints(s,{pdTransport:1.3}),
   PD_PS_up_2_8x:endpoints(s,{pdCl:16.7}),
   source_K10_total_clearance:endpoints(s,{formFactor:correctedFactor}),
   source_K10_and_V1:endpoints(s,{formFactor:correctedFactor,vcScale:ref.V1/assumedVc}),
   source_K10_V1_PS:endpoints(s,{formFactor:correctedFactor,vcScale:ref.V1/assumedVc,pdCl:16.7})
  };
  const refPeak=s.day5[0]*ACV_MW/1000,refTrough=s.day5[1]*ACV_MW/1000;
  const concise={subject:s.id,reference_fitted_day5:{peak_mgL:r4(refPeak),trough_mgL:r4(refTrough)},
    source_author_fitted:{V1_L:ref.V1,K10_per_h:ref.k10,
    non_pd_clearance_Lh:r4(nonperipheralRef),K13_per_h:ref.k13,K31_per_h:ref.k31,
    peritoneal_forward_Lh:r4(ref.k13*ref.V1),peritoneal_reverse_Lh:r4(ref.k31*2)},
    ayflux_fixed_baseline:{VC_L:r4(assumedVc),non_pd_clearance_Lh:r4((.12+1.6)*weightScale),
    initial_bidirectional_PD_PS_Lh:.36,
    return_rate_per_h:.18},
    source_assisted_cl_factor:r4(correctedFactor),
    source_assisted_vc_factor:r4(ref.V1/assumedVc),
    // Source-derived parameters are partly fitted to the SAME plasma data; improving agreement is NOT out-of-sample validation.
    variants:Object.fromEntries(Object.entries(variants).map(([k,v])=>{
       const peak=v.peak??v.day5PeakMgL,trough=v.trough??v.day5TroughMgL;
       return [k,{day5_peak_mgL:r4(peak),day5_trough_mgL:r4(trough),
         day5_trough_error_pct:r4(pctDiff(trough,refTrough)),
         five_day_auc_mghL:r4(v.auc_120h??v.fiveDayAucMgHL),
         pd_recovery_5day_pct:r4(v.pd_recovery_5d_pct??v.drainedPdPctTotalDose)}];
    }))
  };
  return concise;
 });
}
function simulateCSF(crcl,mg,interval,totalCount,ratio,lag,overrides={}){
 const c={...pk.DEFAULTS,route:'Valacyclovir oral',dosingMode:'repeat',
  dose:mg,every:interval,doseCount:totalCount,horizon:interval*totalCount,
  crcl,crclSource:'manual',renalMode:'constant',draws:1,variability:0,
  csfMetRatio:ratio,csfMetLag:lag,weight:70,trackMassBalance:false,...overrides};
 const o=pk.single(c,pk.drawParams(c)[0],pk.scheduleFor('No dialysis',c),.125);
 const start=(totalCount-1)*interval;
 let area={plasma_acyclovir:0,csf_acyclovir:0,plasma_cmmg:0,csf_cmmg:0};
 for(let i=1;i<o.t.length;i++){
  const a=o.t[i-1],b=o.t[i],dt=b-a;if(a<start-1e-9)continue;
  for(const [name,col] of [['plasma_acyclovir','plasma'],['csf_acyclovir','csf'],['plasma_cmmg','cmmg'],['csf_cmmg','csfCmmg']])
   area[name]+=dt*(o.cols[col][i-1]+o.cols[col][i])/2;
 }
 const ratioObserved=area.csf_cmmg/area.plasma_cmmg;
 return {cmmg_ratio_setting:ratio,lag_hours:lag,crcl_mLmin:crcl,
    plasma_acv_auc_mghL:r4(area.plasma_acyclovir),csf_acv_auc_mghL:r4(area.csf_acyclovir),
    plasma_cmmg_auc_mghL:r4(area.plasma_cmmg),
    csf_cmmg_auc_mghL:r4(area.csf_cmmg),
    acv_csf_plasma_ratio:r4(area.csf_acyclovir/area.plasma_acyclovir),
    cmmg_csf_plasma_ratio:r4(ratioObserved)};
}
function csf(){
 const empirical={
    normal:{oral_mg:2000,interval_h:6,n:6,reference_acyclovir_plasma_auc_mghL:r4(137*ACV_MW/1000),
     reference_acyclovir_csf_auc_mghL:r4(37*ACV_MW/1000),
     reference_cmmg_plasma_auc_mghL:r4(17*CMMG_MW/1000),
     reference_cmmg_csf_auc_mghL:r4(.42*CMMG_MW/1000)},
    ckd:{oral_mg:1500,interval_h:12,n:3,reference_acyclovir_plasma_auc_mghL:r4(577*ACV_MW/1000),
     reference_acyclovir_csf_auc_mghL:r4(159*ACV_MW/1000),
     reference_cmmg_plasma_auc_mghL:r4(148*CMMG_MW/1000),
     reference_cmmg_csf_auc_mghL:r4(3.8*CMMG_MW/1000)}
  };
 const panels={};
 for(const [name,info] of Object.entries(empirical)){
  const crcl=name==='normal'?100:20;
  panels[name]={reference:info,source_ratios:{
   acv:r4(info.reference_acyclovir_csf_auc_mghL/info.reference_acyclovir_plasma_auc_mghL),
   cmmg:r4(info.reference_cmmg_csf_auc_mghL/info.reference_cmmg_plasma_auc_mghL)},
   experiments:[],formation_sensitivity:[]};
  for(const [ratio,lag] of [[.25,6],[.025,6],[.0125,6],[.05,6],[.025,2],[.025,12],[.025,24]]){
    const x=simulateCSF(crcl,info.oral_mg,info.interval_h,5,ratio,lag);
    x.cmmg_csf_auc_error_vs_published_pct=r4(pctDiff(x.csf_cmmg_auc_mghL,info.reference_cmmg_csf_auc_mghL));
    x.cmmg_plasma_auc_error_vs_published_pct=r4(pctDiff(x.plasma_cmmg_auc_mghL,info.reference_cmmg_plasma_auc_mghL));
    panels[name].experiments.push(x);
  }
  for(const ff of [.5,.75,1,1.25])for(const mr of [1,1.5]){
   const x=simulateCSF(crcl,info.oral_mg,info.interval_h,5,.025,6,{formFactor:ff,metRenal:mr});
   panels[name].formation_sensitivity.push({formFactor:ff,metRenal:mr,
    acv_plasma_auc_mghL:x.plasma_acv_auc_mghL,
    cmmg_plasma_auc_mghL:x.plasma_cmmg_auc_mghL,
    cmmg_csf_auc_mghL:x.csf_cmmg_auc_mghL,
    source_acyclovir_plasma_auc_mghL:info.reference_acyclovir_plasma_auc_mghL,
    source_cmmg_plasma_auc_mghL:info.reference_cmmg_plasma_auc_mghL});
  }
 }
 return panels;
}
const all={version:'0.26.0',date:'2026-11-09',scope:'sensitivity studies using frozen canonical AyFlux engine; NOT prospective predictive validation',
 capd:pd(),csf:csf(),important_caveats:[
  'Boelaert three compartments = central plasma + peripheral systemic + peritoneal dialysate, so AyFlux also has those states (though different kinetics).',
  'Boelaert K10 and V1 are author-fitted; using them in AyFlux is an in-sample source-assisted sensitivity exercise, NOT independent external validation.',
  'The measured CSF/plasma CMMG AUC ratios are about 0.025; AyFlux default .25 is an exploratory coefficient, not validated.',
  'CSF concentrations are not measurements of brain interstitial tissue or proof of blood brain barrier transport mechanism.',
  'Lindstrom 2019 albumin quotient relationships are observational association in 21 infected patients; they cannot provide a causal multiplier.',
  'Mass balance and solver agreement do not establish clinical accuracy.'
 ]};
if(require.main===module){
 const output=process.argv[2]||'';
 if(output)fs.writeFileSync(output,JSON.stringify(all,null,2)+'\n');
 console.log(JSON.stringify(all));
}
module.exports={pd,csf,simulateCSF};
