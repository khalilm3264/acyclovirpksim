'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const pk=require('../public/assets/pk-engine.js');
test('next-level forecast uses only eligible observations and retains simultaneous targets',()=>{
 const run=pk.createSimulator();
 const c={...pk.DEFAULTS,horizon:16,draws:20,requestedModes:['No dialysis'],forecastCutoff:4};
 const row=(time,value,role='fit',analyte='plasma')=>({time,value,role,analyte});
 const forecast=observations=>run({...c,observations})._validation.forecast;
 const first=forecast([row(4,4),row(8,2),row(8,1,'holdout','csf'),row(10,9)]);
 const changed=forecast([row(4,4),row(3,20,'holdout'),row(8,200),row(8,50,'fit','csf'),row(10,900)]);
 assert.equal(first.fitted,1);
 assert.equal(first.targets.length,2);
 for(const [i,target] of first.targets.entries()){
   assert.equal(target.time,8);
   assert.deepEqual(target.updated,changed.targets[i].updated);
   assert.deepEqual(target.population,changed.targets[i].population);
 }
 const unconditioned=forecast([row(8,3)]).targets[0];
 assert.deepEqual(unconditioned.population,unconditioned.updated);
 assert.notDeepEqual(first.targets[0].updated,unconditioned.updated);
 assert.deepEqual(forecast([row(4,4)]).targets,[]);
});
