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
