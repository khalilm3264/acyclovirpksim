'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const pk=require('../public/assets/pk-engine.js');
const {tablets,dwell,dialysisTablet}=require('../public/research/routes/model.js');
test('medicated fills conserve mass and converge under step refinement',()=>{
 for(const h of [2,4,6]){
  const run=dwell(pk,h),fine=dwell(pk,h,1/32);
  assert.ok(run.residual<1e-7);
  assert.ok(run.drained>0 && run.drained<1000);
  assert.ok(Math.abs(run.relativeAuc-fine.relativeAuc)<1e-4);
 }
 assert.equal(dwell(pk,6).relativeAuc.toFixed(3),'0.728');
});
test('tablet carryover is positive, converged, and dose absorption scales linearly at fixed tablet strength',()=>{
 const a=tablets(pk,.15,1,6,true),b=tablets(pk,.15,1,6,false),fine=tablets(pk,.15,1,6,true,1/48);
 a.forEach((v,i)=>{assert.ok(v>b[i]);assert.ok(Math.abs(v-fine[i])<1e-5)});
 for(const hd of [false,true])assert.equal(dialysisTablet(pk,hd,.2,1).peak,2*dialysisTablet(pk,hd,.1,1).peak);
});
