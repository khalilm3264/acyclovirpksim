// Typical (fixed-effect) IV models from Sampson 2014 and D'Agate 2024.
// Both describe the same underlying trials. No population variability or dialysis.
'use strict';
const assert = require('node:assert/strict');
const iv = require('../../public/research/pediatric/model.js');
const profiles = [
  {weight:0.8, length:33, pma:26},
  {weight:1.37, length:40, pma:31.3},
  {weight:3.2, length:49, pma:40}
];
const indexedClearances = [9.4,15.8,40];
function gehanGeorge(weight,length) {
  return .02350*weight**.51456*length**.42246;
}
function compare(profile,indexed) {
  const {weight,length,pma} = profile;
  const bsa=gehanGeorge(weight,length);
  const renal=indexed*bsa/1.73*.06; // mL/min/1.73 m² -> absolute L/h
  const residual=.748*(weight/1.37)**.75*pma/(50+pma);
  const v=1.93*weight/1.37;
  const scenario={weight,dose:20,interval:8,infusion:1,doses:100};
  const models = {
    sampson:{cl:weight*.305*(pma/31.3)**3.02,v:2.8*weight},
    dagateBase:{cl:residual+renal,v},
    dagateLargeVolume:{cl:residual+renal,v:v*2.67}
  };
  const summaries = Object.fromEntries(Object.entries(models).map(([label,p]) => {
    const summary=iv.summary(scenario,p);
    const start=(scenario.doses-1)*scenario.interval, n=256, dt=scenario.interval/n;
    const conc=t=>iv.concentration(start+t,scenario,p);
    // Simpson integration of the last interval; the one-hour infusion boundary is on the grid.
    let integral=conc(0)+conc(8);
    for(let i=1;i<n;i++) integral+=(i%2 ? 4 : 2)*conc(i*dt);
    assert.ok(Math.abs(integral*dt/3-summary.aucPerInterval)<0.0001);
    assert.ok(Math.abs(conc(1)-summary.ssPeak)<1e-8);
    assert.ok(Math.abs(conc(8)-summary.ssTrough)<1e-8);
    return [label,summary];
  }));
  assert.equal(summaries.dagateBase.aucPerInterval,summaries.dagateLargeVolume.aucPerInterval);
  return {...profile,indexed,bsa,renalLh:renal,residualLh:residual,
    renalPct:100*renal/(residual+renal),summaries};
}
console.log(JSON.stringify(profiles.flatMap(p=>indexedClearances.map(i=>compare(p,i))),null,2));
