'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const model=require('../public/assets/pk-engine.js');
const quality=require('../public/assets/model-integrity.js');

function config(extra={}){
 return {...model.DEFAULTS,crclSource:'manual',variability:0,draws:1,
   horizon:48,doseCount:3,route:'Acyclovir IV',...extra};
}
const near=(a,b,epsilon=1e-8)=>Math.abs(a-b)<=epsilon*Math.max(1,Math.abs(b));

test('old scalar CrCl without new fields preserves legacy constant kinetics',()=>{
 const a=config({crcl:36});
 const old={...a};delete old.renalMode;delete old.renalProfile;
 const newPrediction=model.simulate(a,'No dialysis');
 const oldPrediction=model.simulate(old,'No dialysis');
 assert.ok(near(newPrediction.summary.auc.median,oldPrediction.summary.auc.median));
 assert.ok(near(newPrediction.summary.peak.median,oldPrediction.summary.peak.median));
 assert.deepEqual(newPrediction.kidneyClear.median,oldPrediction.kidneyClear.median);
});

test('a constant profile reproduces scalar CrCl within rounding error',()=>{
 const scalar=config({crcl:45});
 const profile=config({crcl:45,renalMode:'profile',renalProfile:[
  {time:0,crcl:45},{time:24,crcl:45},{time:48,crcl:45}
 ]});
 const a=model.simulate(scalar,'No dialysis'),b=model.simulate(profile,'No dialysis');
 assert.ok(near(a.summary.auc.median,b.summary.auc.median,1e-7));
 assert.ok(near(a.summary.peak.median,b.summary.peak.median,1e-7));
 assert.ok(near(a.summary.mPeak.median,b.summary.mPeak.median,1e-7));
});

test('time-varying kidney trajectory is interpolated, bounded and affects both renal terms',()=>{
 const cfg=config({crcl:0,renalMode:'profile',
  renalProfile:[{time:0,crcl:0},{time:24,crcl:90},{time:48,crcl:0}]
 });
 assert.deepEqual(model.validate(cfg,'No dialysis'),[]);
 assert.equal(model.renalCrClAt(cfg,-1),0);
 assert.equal(model.renalCrClAt(cfg,0),0);
 assert.equal(model.renalCrClAt(cfg,12),45);
 assert.equal(model.renalCrClAt(cfg,24),90);
 assert.equal(model.renalCrClAt(cfg,36),45);
 assert.equal(model.renalCrClAt(cfg,90),0);
 const result=model.simulate(cfg,'No dialysis');
 const at=t=>result.time.findIndex(x=>Math.abs(x-t)<1e-7);
 for(const t of [0,24,48])assert.ok(at(t)>=0,'required profile knot is on integration grid');
 assert.equal(result.kidneyClear.median[at(0)],0);
 assert.equal(result.cmmgKidneyClear.median[at(0)],0);
 assert.ok(result.kidneyClear.median[at(24)]>0);
 assert.ok(result.cmmgKidneyClear.median[at(24)]>0);
 assert.equal(result.kidneyClear.median[at(48)],0);
 assert.equal(result.cmmgKidneyClear.median[at(48)],0);
 assert.equal(quality.checkSimulation(result,cfg).passed,true);
 assert.ok(Math.abs(result.summary.massBalanceErrorMg.median)/result.summary.administeredAcyclovirEqMg.median<0.01);
});

test('renal recovery reduces exposure relative to anuria for otherwise identical settings',()=>{
 const base=config({crcl:0});
 const recovering=config({crcl:0,renalMode:'profile',renalProfile:[
  {time:0,crcl:0},{time:24,crcl:70},{time:48,crcl:70}
 ]});
 const noKidney=model.simulate(base,'No dialysis');
 const withRecovery=model.simulate(recovering,'No dialysis');
 assert.ok(withRecovery.summary.auc.median<noKidney.summary.auc.median);
});

test('profile validation rejects illegal times, concentrations and source',()=>{
 const base=config({renalMode:'profile',renalProfile:[{time:0,crcl:50},{time:20,crcl:30}]});
 assert.deepEqual(model.validateRenalProfile(base),[]);
 assert.ok(model.validateRenalProfile({...base,renalProfile:[{time:3,crcl:50},{time:20,crcl:30}]}).length);
 assert.ok(model.validateRenalProfile({...base,renalProfile:[{time:0,crcl:50},{time:0,crcl:30}]}).length);
 assert.ok(model.validateRenalProfile({...base,renalProfile:[{time:0,crcl:50},{time:20,crcl:141}]}).length);
 assert.ok(model.validateRenalProfile({...base,renalProfile:[{time:0,crcl:50},{time:52,crcl:30}]}).length);
 assert.ok(model.validateRenalProfile({...base,crclSource:'estimated'}).length);
});

test('kidney profile editor, CSV format selector and layout share consistent UI hooks',()=>{
 const root=path.resolve(__dirname,'..');
 const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
 const ui=fs.readFileSync(path.join(root,'public/assets/simulator-ui.js'),'utf8');
 assert.ok(html.includes('select id="csv"'));
 assert.ok(!html.includes('id="csvFormat"'));
 assert.ok(html.includes('id="csv"'));
 assert.ok(!html.includes('id="csvInterop"'));
 assert.ok(ui.includes('function renalProfileControls'));
 assert.ok(ui.includes('function applyRenalDraft'));
 assert.ok(ui.includes('function renderRenalProfileChart'));
 assert.ok(ui.includes('renalDraft=structuredClone(c.renalProfile)'));
 assert.ok(html.includes('id="enableRenalProfile"'));
 assert.ok(html.includes('Unified simulator spacing'));
 assert.ok(html.includes('--ui-space-3:14px'));
});

test('checkSimulation rejects duplicate profile times instead of silently passing invalid input',()=>{
 const sim={
  time:[0,1,2],
  plasma:{median:[0,1,0],lower:[0,0.5,0],upper:[0,1.5,0]},
  csf:{median:[0,0.1,0],lower:[0,0.05,0],upper:[0,0.2,0]},
  cmmg:{median:[0,0.2,0],lower:[0,0.1,0],upper:[0,0.3,0]},
  csfCmmg:{median:[0,0.02,0],lower:[0,0.01,0],upper:[0,0.03,0]},
  kidneyClear:{median:[0,10,0]}
 };
 const res=quality.checkSimulation(sim,{
  renalMode:'profile',
  renalProfile:[{time:0,crcl:20},{time:0,crcl:20},{time:2,crcl:0}]
 });
 assert.equal(res.passed,false);
 assert.ok(res.issues.some(issue=>issue.includes("Invalid renal profile")));
});

test('integrity diagnostics reject malformed trajectories and check valid zero clearance',()=>{
 const zero={median:[0,0,0],lower:[0,0,0],upper:[0,0,0]},sim={time:[0,1,2],plasma:zero,csf:zero,cmmg:zero,csfCmmg:zero,kidneyClear:{median:[0,0,0]}};
 for(const renalProfile of [[],[{time:0,crcl:0}], [{time:0,crcl:20},{time:1,crcl:NaN}], [{time:0,crcl:20},{time:-1,crcl:0}], [{time:1,crcl:20},{time:2,crcl:0}], [{time:0,crcl:20},{time:1,crcl:141}], [null,{time:1,crcl:0}]]){
  assert.equal(quality.checkSimulation(sim,{renalMode:'profile',renalProfile}).passed,false,JSON.stringify(renalProfile));
 }
 const cfg={renalMode:'profile',renalProfile:[{time:0,crcl:20},{time:2,crcl:0}]};
 assert.equal(quality.checkSimulation(sim,cfg).passed,true);
 const nonzero={...sim,kidneyClear:{median:[0,0,1]}};
 assert.ok(quality.checkSimulation(nonzero,cfg).issues.includes('Renal acyclovir clearance is nonzero at CrCl = 0'));
});

test('profile validation and integrity checks reject duplicate timestamps and nonfinite clearance',()=>{
 const base=config({renalMode:'profile',horizon:96,renalProfile:[{time:0,crcl:50},{time:24,crcl:30}]});
 // 1. Existing validator rejects duplicate timestamps and nonfinite clearance
 const atZero=model.validateRenalProfile({...base,renalProfile:[{time:0,crcl:50},{time:0,crcl:30},{time:24,crcl:30}]});
 assert.ok(atZero.some(e=>/increase/i.test(e)),'validator rejects duplicate timestamp at hour zero');
 const afterZero=model.validateRenalProfile({...base,renalProfile:[{time:0,crcl:50},{time:12,crcl:40},{time:12,crcl:30},{time:24,crcl:20}]});
 assert.ok(afterZero.some(e=>/increase/i.test(e)),'validator rejects duplicate timestamp after hour zero');
 const nonfiniteVal=model.validateRenalProfile({...base,renalProfile:[{time:0,crcl:NaN},{time:24,crcl:30}]});
 assert.ok(nonfiniteVal.some(e=>/within 0–140/i.test(e)),'validator rejects nonfinite clearance in profile');

 // 2. Model integrity check rejects duplicate timestamps and nonfinite clearance
 const validSim={
  time:[0,12,24],
  plasma:{median:[0,1,0],lower:[0,0.5,0],upper:[0,1.5,0]},
  csf:{median:[0,0.1,0],lower:[0,0.05,0],upper:[0,0.2,0]},
  cmmg:{median:[0,0.2,0],lower:[0,0.1,0],upper:[0,0.3,0]},
  csfCmmg:{median:[0,0.02,0],lower:[0,0.01,0],upper:[0,0.03,0]},
  kidneyClear:{median:[10,15,10]}
 };
 const validReport=quality.checkSimulation(validSim,base);
 assert.equal(validReport.passed,true);

 const startDupReport=quality.checkSimulation(validSim,{...base,renalProfile:[{time:0,crcl:50},{time:0,crcl:30},{time:24,crcl:30}]});
 assert.equal(startDupReport.passed,false,'integrity check fails on duplicate timestamp at start');
 assert.ok(startDupReport.issues.some(i=>/strictly increasing/i.test(i)));

 const laterDupReport=quality.checkSimulation(validSim,{...base,renalProfile:[{time:0,crcl:50},{time:12,crcl:40},{time:12,crcl:30},{time:24,crcl:20}]});
 assert.equal(laterDupReport.passed,false,'integrity check fails on duplicate timestamp later in profile');
 assert.ok(laterDupReport.issues.some(i=>/strictly increasing/i.test(i)));

 const nonfiniteProfileReport=quality.checkSimulation(validSim,{...base,renalProfile:[{time:0,crcl:NaN},{time:24,crcl:30}]});
 assert.equal(nonfiniteProfileReport.passed,false,'integrity check fails on nonfinite profile clearance');
 assert.ok(nonfiniteProfileReport.issues.some(i=>/finite/i.test(i)));

 const nonfiniteScalarReport=quality.checkSimulation(validSim,{...base,renalMode:'constant',crcl:NaN});
 assert.equal(nonfiniteScalarReport.passed,false,'integrity check fails on nonfinite scalar clearance');
 assert.ok(nonfiniteScalarReport.issues.some(i=>/finite/i.test(i)));

 const nonfiniteSimClearReport=quality.checkSimulation({...validSim,kidneyClear:{median:[10,NaN,10]}},base);
 assert.equal(nonfiniteSimClearReport.passed,false,'integrity check fails on nonfinite simulated clearance');
 assert.ok(nonfiniteSimClearReport.issues.some(i=>/finite/i.test(i)));
});
