'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {run}=require('../research/verification/parameter-recovery.cjs');
test('ensemble likelihood recovers two known scale factors from noisy synthetic observations',()=>{
 const result=run();
 for(const key of ['clearance','volume']) {
  const errors=result.cases.map(r=>Math.abs(r[key].median/r.truth[key]-1));
  const mean=errors.reduce((a,b)=>a+b,0)/errors.length;
  assert.ok(mean<0.10,`${key} mean relative error ${mean}`);
  assert.ok(Math.max(...errors)<0.25,`${key} maximum relative error ${Math.max(...errors)}`);
 }
 assert.ok(result.cases.every(r=>r.holdoutRMSE<0.5),'Latent holdout RMSE must remain below 0.5 mg/L');
 assert.ok(result.cases.every(r=>Number.isFinite(r.ess)&&r.ess>=1&&r.ess<=result.gridSize));
});
