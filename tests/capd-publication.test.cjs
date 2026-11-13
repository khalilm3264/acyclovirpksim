'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const pk=require('../public/assets/pk-engine.js');
const bench=require('../research/validation/boelaert-capd.cjs');
test('Boelaert exchange schedule is explicitly prescribed, reproducible and valid',()=>{
 for(const s of bench.subjects){
  const c=bench.configFor(s);
  assert.deepEqual(pk.validate(c,'Peritoneal dialysis'),[]);
  assert.equal(pk.buildDoses(c).length,5);
  assert.deepEqual(pk.buildDoses(c).map(x=>x.time),[0,24,48,72,96]);
  assert.deepEqual(bench.exchangeTemplate.map(x=>x.dwell),[4,4,4,12]);
  assert.equal(c.crcl,0);
 }
});
test('canonical engine captures actual PD-drain mass and enforces conservation',()=>{
 for(const s of bench.subjects){
  const r=bench.runOne(s);
  assert.ok(r.metrics.drainedPdMg>0,'no drained acyclovir for subject '+s.id);
  assert.ok(r.metrics.drainedPdPctTotalDose>0,'missing cumulative PD removal');
  assert.equal(r.metrics.pendingDialysateAtEndMg,0);
  assert.ok(r.metrics.actualInputAcyclovirMg>0);
  assert.ok(r.metrics.maxMassBalanceResidualMg<Math.max(.001,s.dose*5*1e-6),
    'mass-accounting residual subject '+s.id+': '+r.metrics.maxMassBalanceResidualMg);
  for(const v of r.simulation.cols.plasma)assert.ok(v>=0 && Number.isFinite(v));
  for(const a of r.simulation.accounting)assert.ok(a.parts.pdDrained>=-1e-9);
  const none=bench.runOne(s,{},'No dialysis');
  assert.equal(none.metrics.drainedPdMg,0,'no PD mode must have zero PD drains');
  assert.ok(r.metrics.fiveDayAucMgHL<none.metrics.fiveDayAucMgHL,'dialysis should reduce modeled AUC');
 }
});
test('reported source endpoints remain labeled as author-fitted; comparisons do not imply validation',()=>{
 for(const s of bench.subjects){
  const res=bench.summarize(s).detailed;
  assert.equal(res.reference_class,'author-fitted plasma endpoints');
  assert.equal(res.checkpoints.length,4);
  assert.ok(Number.isFinite(res.ayflux_pd_drained_percent_total_5d));
  assert.ok(res.checkpoints.every(x=>Number.isFinite(x.percent_error)));
  assert.ok(Math.abs(res.finer_timestep_auc_rel_error_pct)<5,
    'RK4 time-step convergence exceeds 5% for patient '+s.id);
  assert.ok(Math.abs(res.finer_timestep_drained_pct_abs_diff)<2,
    'PD transfer time-step convergence exceeds 2 percentage points for patient '+s.id);
 }
});
