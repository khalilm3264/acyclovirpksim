// Maximova et al., Front Pharmacol 2022, Tables 1/3 and Figure 2.
// Apply the independent Abdalla model to aggregate covariates and sample clocks.
'use strict';
const assert = require('node:assert/strict');
const model=require('../../public/research/pediatric/model.js');
const source={n:120,age:9.5,weight:27.8,egfr:209.4,medianDose:350,
  mgKgDay:40.7,pooledPost:{mean:7.6,sd:5.4},trough6:{mean:1.0,sd:1.1},
  trough8:{mean:.85,sd:1.3},fitted:{medianCL:14.6,medianV:26.1,medianAuc:23.3}};
const rows=[];
for (const interval of [6,8]) for (const dosing of ['medianDaily','medianPerDose']) {
  const dose=dosing==='medianDaily' ? source.mgKgDay*interval/24 : source.medianDose/source.weight;
  const cfg={...model.defaults,age:source.age,weight:source.weight,egfr:source.egfr,
    dose,interval,infusion:1};
  const p=model.parameters(cfg), ss=model.summary(cfg,p);
  const k=p.cl/p.v, post=ss.ssPeak*Math.exp(-k*.5);
  const pre=ss.ssTrough*Math.exp(k/6);
  // After four completed days, compare exact superposition with the steady-state expression.
  const day5={...cfg,doses:1+96/interval};
  assert.ok(Math.abs(model.concentration(97.5,day5,p)-post)<1e-7);
  assert.ok(Math.abs(model.concentration(96+interval-1/6,day5,p)-pre)<1e-7);
  rows.push({dosing,interval,doseMg:source.weight*dose,...ss,postAt1_5:post,preAtTenMin:pre});
}
console.log(JSON.stringify({source,rows},null,2));
