'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const ext=require('../research/validation/external-capd-holdouts.cjs');
const mech=require('../research/validation/mechanism-sensitivity.cjs');

test('Shah seven-day IV regimen has correct dose transitions and seven-day 3-exchange CAPD prescription',()=>{
 const s=ext.shah();
 assert.equal(s.experiments.length,6);
 for(const x of s.experiments){
  assert.deepEqual(x.days.map(d=>d.day),[1,4,7]);
  assert.deepEqual(x.days.map(d=>d.dose_mg),[275,137.5,137.5]);
  assert.ok(Number.isFinite(x.max_mass_balance_residual_mg));
  assert.ok(x.max_mass_balance_residual_mg<0.002,'mass balance '+x.max_mass_balance_residual_mg);
  for(const d of x.days){
   assert.ok(d.pd_drained_mg>0);
   assert.ok(d.auc_mg_h_L>0);
   assert.ok(d.apparent_pd_clearance_mL_min>0);
   assert.ok(d.drained_mass_over_current_day_dose_pct>0);
  }
 }
});
test('Burgess 4-exchange IV protocol has normalized apparent PD clearance and preserves linear dose scaling',()=>{
 const b=ext.burgess();
 assert.equal(b.experiments.length,4);
 assert.equal(b.source.iv_capd_n,4);
 for(const crcl of [0,5]){
  const a=b.experiments.find(x=>x.assumed_crcl_mL_min===crcl&&x.nominal_iv_dose_mg===500);
  const c=b.experiments.find(x=>x.assumed_crcl_mL_min===crcl&&x.nominal_iv_dose_mg===1000);
  assert.ok(a&&c);
  assert.ok(Math.abs(a.apparent_pd_clearance_mL_min-c.apparent_pd_clearance_mL_min)<1e-3);
  assert.ok(Math.abs(a.pd_recovered_pct_dose-c.pd_recovered_pct_dose)<1e-3);
  assert.ok(Math.abs(c.pd_drained_mg/a.pd_drained_mg-2)<0.001);
  assert.ok(a.max_mass_balance_residual_mg<.001);
  assert.ok(c.max_mass_balance_residual_mg<.001);
 }
});
test('External studies are only study-level references; CMMG 0.025 remains a research-only alternative',()=>{
 const a=ext.report();
 assert.match(a.shah.evidence_type,/Single-patient/);
 assert.match(a.burgess.evidence_type,/group summary/);
 assert.ok(!a.note.includes('clinically validated'));
 const csf=mech.csf();
 for(const group of Object.values(csf)){
  assert.ok(Math.abs(group.source_ratios.cmmg-0.025)<0.003);
  assert.equal(group.experiments.find(x=>x.cmmg_ratio_setting===.25).cmmg_ratio_setting,.25);
  assert.ok(group.experiments.find(x=>x.cmmg_ratio_setting===.025).cmmg_csf_plasma_ratio<.03);
 }
});

test('Lindstrom source table uses one eligible sample per participant and preserves censor flags',()=>{
 const audit=require('../research/validation/lindstrom-albumin-audit.cjs');
 const records=audit.load();
 assert.equal(records.length,21);
 assert.equal(records.filter(x=>x.censored).length,10);
 assert.equal(records.find(x=>x.subject===1).source_row,'1b');
 assert.equal(records.find(x=>x.subject===19).qalb,162.4);
 const r=audit.report();
 assert.equal(r.analyses.length,6);
 assert.equal(r.analyses.find(x=>x.specification==='detected').patients,11);
 for(const s of r.analyses){
  assert.ok(s.qalb_to_csf_cmmg_spearman>=-1&&s.qalb_to_csf_cmmg_spearman<=1);
 }
});

test('Smith renal cohort grid uses each reported CKD CrCl and preserves observed group benchmarks',()=>{
 const transfer=require('../research/validation/smith-renal-cohort-stress.cjs');
 const d=transfer.report();
 assert.deepEqual(d.baseline.ckd_patient_crcl_mL_min,[17,30,31]);
 assert.equal(d.candidate_grid.length,16);
 assert.ok(d.baseline.ckd.errors.plasma_cmmg_auc_mghL.observed>0);
 assert.ok(d.lowPartition.ckd.errors.csf_cmmg_auc_mghL.simulated < d.baseline.ckd.errors.csf_cmmg_auc_mghL.simulated);
 for(const name of ['normal','ckd']){
  assert.ok(Number.isFinite(d.baseline[name].mean_abs_log_error));
  assert.ok(Number.isFinite(d.lowPartition[name].mean_abs_log_error));
 }
});

test('Lycke 2003 day-7 oral valacyclovir CSF study reference has paired plasma/CSF point values',()=>{
 const cns=require('../research/validation/csf-acyclovir-cohorts.cjs');
 const output=cns.runLycke();
 assert.equal(output.observed.csf_2h_uM,2.5);
 assert.equal(output.observed.csf_8h_uM,2.3);
 assert.equal(output.observed.reported_csf_plasma_auc_ratio,.19);
 for(const key of ['plasma_peak_uM','csf_2h_uM','csf_8h_uM','csf_plasma_auc_ratio'])
  assert.ok(Number.isFinite(output.model[key]));
 assert.ok(output.model.csf_plasma_auc_ratio>0);
});
test('Pouplin 2011 study day 20 is an explicit unsupported horizon, never silently extrapolated',()=>{
 const cns=require('../research/validation/csf-acyclovir-cohorts.cjs');
 const x=cns.runPouplin();
 assert.deepEqual(x.comparisons.map(y=>y.day),[0,2,10]);
 assert.equal(x.source_day20_not_simulated.day,20);
 assert.equal(x.source_day20_not_simulated.csf_uM,3.5);
 assert.ok(Number.isFinite(x.day2_to_day10_change.model_csf_percent));
 assert.ok(x.day2_to_day10_change.observed_csf_percent<0);
});
