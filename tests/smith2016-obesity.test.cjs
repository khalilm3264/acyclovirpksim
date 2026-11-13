'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {report}=require('../research/validation/smith2016-obesity.cjs');

test('Smith reconstruction separates renal estimation from weight scaling without fitting',()=>{
 const r=report(); // Includes step-size, burn-in and dose/AUC mass-balance checks.
 const rows=r.renalComparison;
 assert.ok(rows.every(x=>x.inputs.weight===106.7&&x.inputs.dose===1000&&x.inputs.every===8));
 const actual=rows.find(x=>x.name==='cg-actual'),measured=rows.find(x=>x.name==='measured');
 assert.ok(actual.inputs.crcl>50&&actual.inputs.crcl<60);
 assert.ok(measured.predicted.auc8>actual.predicted.auc8,
   'Lower measured clearance must increase exposure at fixed dose and PK weight');
 for(const x of r.weightSensitivity){
  assert.equal(x.inputs.crcl,19.4);assert.equal(x.inputs.dose,1000);
  for(const value of Object.values(x.predicted))assert.ok(Number.isFinite(value)&&value>0);
 }
 assert.match(r.source.endpointStatus.trough,/not a measured trough/);
});
