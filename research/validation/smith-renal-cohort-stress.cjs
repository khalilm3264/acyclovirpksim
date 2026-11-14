'use strict';
/**
 * Nominal renal-cohort transfer stress test against Smith et al. (2010).
 * The study CKD group has observed CrCl 17, 30, 31 mL/min (n=3).
 * We hold unknown covariates at 70 kg and compare averaged simulations
 * against published GROUP averages, never claiming individual-level validation.
 * Exploratory in-sample fit diagnostics, no automatic model changes.
 */
const fs=require('node:fs'),path=require('node:path');
const mechanism=require('./mechanism-sensitivity.cjs');
const REF=mechanism.csf();
const round=x=>Math.round(x*1e5)/1e5;
const names=[
 ['plasma_acv_auc_mghL','reference_acyclovir_plasma_auc_mghL'],
 ['csf_acv_auc_mghL','reference_acyclovir_csf_auc_mghL'],
 ['plasma_cmmg_auc_mghL','reference_cmmg_plasma_auc_mghL'],
 ['csf_cmmg_auc_mghL','reference_cmmg_csf_auc_mghL']
];
function summaryProfile(crcl,mg,q,opts){
 return mechanism.simulateCSF(crcl,mg,q,5,opts.csfMetRatio,opts.csfMetLag??6,
  {formFactor:opts.formFactor,metRenal:opts.metRenal});
}
function aggregate(scenarios){
 return Object.fromEntries(names.map(([modelName])=>[modelName,
  scenarios.reduce((acc,s)=>acc+s[modelName],0)/scenarios.length]));
}
function compare(obs,ref){
 const errors=Object.fromEntries(names.map(([model,source])=>[model,{
  observed:round(ref[source]),simulated:round(obs[model]),
  signed_relative_error_pct:round(100*(obs[model]/ref[source]-1)),
  absolute_log_error:round(Math.abs(Math.log(obs[model]/ref[source])))
 }]));
 return {errors,mean_abs_log_error:round(
  Object.values(errors).reduce((s,x)=>s+x.absolute_log_error,0)/names.length)};
}
function runOne(options){
 const healthy=summaryProfile(100,2000,6,options);
 const chronic=[17,30,31].map(crcl=>summaryProfile(crcl,1500,12,options));
 const normal=compare(healthy,REF.normal.reference);
 const ckd=compare(aggregate(chronic),REF.ckd.reference);
 return {options,normal,ckd,average_both_groups_abs_log_error:
  round((normal.mean_abs_log_error+ckd.mean_abs_log_error)/2),
  ckd_patient_crcl_mL_min:[17,30,31],
  chronic_individual_illustrative:chronic.map((v,i)=>({crcl_mL_min:[17,30,31][i],
   plasma_acyclovir_auc_mghL:v.plasma_acv_auc_mghL,
   plasma_cmmg_auc_mghL:v.plasma_cmmg_auc_mghL,
   csf_cmmg_auc_mghL:v.csf_cmmg_auc_mghL}))};
}
function report(output){
 const baseline=runOne({csfMetRatio:.25,formFactor:1,metRenal:1,csfMetLag:6});
 const lowPartition=runOne({csfMetRatio:.025,formFactor:1,metRenal:1,csfMetLag:6});
 const grid=[];
 for(const ff of [.5,.75,1,1.25])for(const renal of [.75,1,1.25,1.5])
  grid.push(runOne({csfMetRatio:.025,formFactor:ff,metRenal:renal,csfMetLag:6}));
 const rank=field=>grid.slice().sort((a,b)=>a[field].mean_abs_log_error-b[field].mean_abs_log_error).slice(0,3)
  .map(x=>({options:x.options,normal_score:x.normal.mean_abs_log_error,
   ckd_score:x.ckd.mean_abs_log_error,combined_score:x.average_both_groups_abs_log_error}));
 const combined=grid.slice().sort((a,b)=>a.average_both_groups_abs_log_error-b.average_both_groups_abs_log_error).slice(0,3)
  .map(x=>({options:x.options,normal_score:x.normal.mean_abs_log_error,
   ckd_score:x.ckd.mean_abs_log_error,combined_score:x.average_both_groups_abs_log_error}));
 const result={title:'Smith 2010 renal cohort consistency stress test (not validation)',
  source:'doi:10.1128/AAC.00729-09, CKD CrCl 17,30,31 mL/min; reported AUC group means',
  approximations:'70kg body weight for everyone; normal-group CrCl100 illustrative; 5 oral valacyclovir doses; constant F despite >1g doses; group-level comparison only',
  baseline,lowPartition,
  diagnostic_top3_by_normal_group:rank('normal'),
  diagnostic_top3_by_ckd_group:rank('ckd'),
  diagnostic_top3_by_pooled_in_sample_score:combined,
  candidate_grid:grid.map(x=>({options:x.options,normal_score:x.normal.mean_abs_log_error,ckd_score:x.ckd.mean_abs_log_error,combined_score:x.average_both_groups_abs_log_error})),
  clinical_note:'Candidate rankings depend on study group means and arbitrary equally weighted log errors, not identifiable clinical parameters. No clinical dosing or neurotoxicity predictions.'
 };
 if(output){fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');}
 return result;
}
if(require.main===module)console.log(JSON.stringify(report(process.argv[2])));
module.exports={report,runOne};
