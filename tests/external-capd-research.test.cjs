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
