'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../public/assets/pk-engine.js');

// Closed central + dialysate system with constant volumes and a one-hour infusion.
// Integrating the exact impulse response over infusion time gives this expression.
// This oracle uses conservation and the analytical two-volume solution, independently
// of the engine's RK4 stages, accounting accumulator and event scheduler.
function fixture(horizon){
 const c={...structuredClone(E.DEFAULTS),dose:100,doseCount:1,every:24,
  infusion:1,route:'Acyclovir IV',dosingMode:'repeat',horizon,variability:0,draws:1,
  pdVolume:2,pdTransport:1,pdAbsorb:0,pdUfBase:0,trackMassBalance:true,
  pdRxEnabled:true,pdRxRows:[{start:0,dwell:4,fill:2,glucose:1.36,uf:0,sessionStart:null}]};
 const p={...E.drawParams(c)[0],vc:10,q:0,other:0,renal:0,form:0,pd:1};
 const rows=[{start:0,end:4,type:'CAPD'}];
 return E.single(c,p,rows,.01,E.buildDoses(c));
}
function exact(t){const k=1/10+1/2;return 100*2/12*(1-(Math.exp(-k*(t-1))-Math.exp(-k*t))/k);}
test('analytical infusion/exchange solution matches drained mass and concentration',()=>{
 const r=fixture(4),expected=exact(4);
 assert.equal(r.drains.length,1);
 assert.ok(Math.abs(r.drains[0].mass-expected)<1e-7);
 assert.ok(Math.abs(r.drains[0].concentration-expected/2)<1e-7);
 assert.equal(r.drains[0].volume,2);
 assert.equal(r.summary.endPdFluidMg,0);
 assert.ok(Math.abs(r.summary.mass-expected)<1e-7);
 assert.ok(Math.abs(r.accounting.at(-1).residual)<1e-8);
});
test('ending inside a dwell retains analytical cavity mass and counts no drain',()=>{
 const r=fixture(3.5);
 assert.equal(r.drains.length,0);
 assert.equal(r.summary.mass,0);
 assert.ok(Math.abs(r.summary.endPdFluidMg-exact(3.5))<1e-7);
 assert.equal(r.accounting.at(-1).pdVolume,2);
});
