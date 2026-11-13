'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../public/assets/pk-engine.js');
const R=require('../public/assets/regimen-tools.js');

const run=(config,mode='No dialysis')=>E.simulateMany({...E.DEFAULTS,...config,draws:1,variability:0,requestedModes:[mode]})[mode];
const snap=(name,config,mode='No dialysis')=>{
 const full={...E.DEFAULTS,...config,draws:1,variability:0};
 return R.snapshotRegimen({id:name,name,primary:mode,config:full,data:run(config,mode),doseTimes:E.buildDoses(full).map(d=>d.time)});
};

test('a saved regimen is frozen: later edits to the live settings or results leave it intact',()=>{
 const config={...E.DEFAULTS,draws:1},data=structuredClone(run({}));
 const s=R.snapshotRegimen({id:1,name:'Regimen A',primary:'No dialysis',config,data,doseTimes:[0,8]});
 const before=s.data.plasma.median[10];
 config.dose=1400;data.plasma.median[10]+=5;data.time.length=3;
 assert.equal(s.config.dose,700);assert.equal(s.data.plasma.median[10],before);assert.ok(s.data.time.length>3);
 assert.ok(Object.isFrozen(s)&&Object.isFrozen(s.config)&&Object.isFrozen(s.data.plasma.median));
 assert.throws(()=>{s.data.plasma.median[10]=0;},TypeError);
 assert.throws(()=>{s.config.dose=1;},TypeError);
 assert.deepEqual(Object.keys(s.data).sort(),['cmmg','csf','csfCmmg','plasma','summary','time']);
});

test('regimen names are cleaned for legends and default to the next free letter',()=>{
 assert.equal(R.cleanName('  <b>High</b> "dose" ','x'),'bHigh/b dose');
 assert.equal(R.cleanName('   ','Regimen A'),'Regimen A');
 assert.equal(R.cleanName('a'.repeat(80),'x').length,40);
 assert.equal(R.nextName([{name:'Regimen A'},{name:'Mine'}]),'Regimen B');
 assert.equal(R.nextName([]),'Regimen A');
});

test('area, peak and value helpers integrate exactly up to the window end',()=>{
 const time=[0,1,2,4],values=[0,2,2,6];
 assert.equal(R.areaTo(time,values,4),1+2+8);
 assert.equal(R.areaTo(time,values,3),1+2+(2+4)/2);
 assert.equal(R.areaTo(time,values,0),0);
 assert.equal(R.peakTo(time,values,3),4);
 assert.equal(R.valueAt(time,values,3),4);assert.equal(R.valueAt(time,values,9),6);
});

test('comparison metrics use one shared window, a defined pre-dose trough and peak plasma CMMG',()=>{
 const a=snap('A',{horizon:96}),b=snap('B',{horizon:48,dose:350});
 const window=R.commonWindow([a.data,b.data]);
 assert.equal(window,Math.min(a.data.time.at(-1),b.data.time.at(-1)));
 assert.ok(window<=48);
 const ma=R.regimenMetrics(a.data,a.doseTimes,window),mb=R.regimenMetrics(b.data,b.doseTimes,window);
 // Same window for both; half the dose gives about half the AUC in this linear model.
 assert.ok(Math.abs(mb.plasmaAuc/ma.plasmaAuc-0.5)<1e-9);
 // Trough: last dose start after 0 and before the window end, read from the median curve.
 const last=a.doseTimes.filter(t=>t>0&&t<window).at(-1);
 assert.equal(ma.trough.time,last);
 assert.equal(ma.trough.value,R.valueAt(a.data.time,a.data.plasma.median,last));
 assert.ok(ma.trough.value<R.peakTo(a.data.time,a.data.plasma.median,window));
 assert.equal(ma.cmmgPeak,Math.max(...a.data.cmmg.median.filter((_,i)=>a.data.time[i]<=window)));
 // A single dose at hour 0 has no trough inside the window.
 const one=snap('One',{doseCount:1});
 assert.equal(R.regimenMetrics(one.data,one.doseTimes,window).trough,null);
});

test('AUC over the full run matches the engine summary for a single nominal draw',()=>{
 const a=snap('A',{});
 const auc=R.areaTo(a.data.time,a.data.plasma.median,a.data.time.at(-1));
 assert.ok(Math.abs(auc-a.data.summary.auc.median)/a.data.summary.auc.median<0.01,auc+' vs '+a.data.summary.auc.median);
});

const ivDefaults={...E.DEFAULTS};
const plan=(config,mode='Intermittent HD')=>R.postHdPlan({doses:E.buildDoses(config),sessions:R.hdSessions(E.scheduleFor(mode,config)),horizon:config.horizon});

test('acyclovir IV: every scheduled dose is kept and one dose is added after each session',()=>{
 const p=plan(ivDefaults);
 assert.equal(p.applicable,true);
 assert.deepEqual(p.sessions,[{start:24,end:28},{start:72,end:76}]);
 assert.equal(p.originalCount,12);assert.equal(p.proposedCount,14);
 assert.deepEqual(p.rows.filter(r=>r.change==='added').map(r=>[r.proposed,r.amount,r.infusion]),[[28,700,1],[76,700,1]]);
 assert.ok(p.rows.filter(r=>r.change==='unchanged').every(r=>r.proposed===r.original));
 assert.equal(p.flagCount,0);
 assert.ok(p.rows.find(r=>r.change==='added').reason.includes('[10]'));
 assert.deepEqual(E.validateDoses({...ivDefaults,dosingMode:'custom',customDoses:p.doses}),[]);
});

test('a change within 2 h of another dose is flagged as a possible duplicate',()=>{
 const p=R.postHdPlan({doses:E.buildDoses(ivDefaults),sessions:[{start:27,end:31}],horizon:96});
 const addedRow=p.rows.find(r=>r.change==='added'),next=p.rows.find(r=>r.original===32);
 assert.match(addedRow.flags.join(),/within 1 h .* 32 h: possible duplicate/);
 assert.match(next.flags.join(),/within 1 h .* 31 h: possible duplicate/);
 // Two unchanged doses close together are not this tool's change, so they are not flagged.
 const q=R.postHdPlan({doses:[{time:0,route:'Acyclovir IV',amount:500,infusion:1},{time:1,route:'Acyclovir IV',amount:500,infusion:1}],sessions:[{start:20,end:24}],horizon:48});
 assert.equal(q.rows.filter(r=>r.original!==null&&r.flags.length).length,0);
});

test('a dose that would start at or after the simulation end is flagged as dropped',()=>{
 const p=R.postHdPlan({doses:E.buildDoses(ivDefaults),sessions:[{start:92,end:96}],horizon:96});
 const row=p.rows.find(r=>r.original===null);
 assert.equal(row.change,'not added');assert.equal(row.proposed,null);
 assert.match(row.flags[0],/dropped/);assert.equal(p.proposedCount,p.originalCount);
});

test('valacyclovir: the dose since the previous session moves to the session end; other days are kept',()=>{
 const config={...E.DEFAULTS,route:'Valacyclovir oral',dose:500,every:24,doseCount:4};
 const p=plan(config);
 assert.deepEqual(p.rows.map(r=>[r.original,r.proposed,r.change]),[[0,0,'unchanged'],[24,28,'moved'],[48,48,'unchanged'],[72,76,'moved']]);
 assert.equal(p.proposedCount,4);assert.equal(p.flagCount,0);
 assert.ok(p.rows[1].reason.includes('[8]'));
 assert.deepEqual(E.validateDoses({...config,dosingMode:'custom',customDoses:p.doses}),[]);
});

test('valacyclovir: a session with no dose since the previous one gets the label dose added',()=>{
 const doses=[{time:0,route:'Valacyclovir oral',amount:500}];
 const p=R.postHdPlan({doses,sessions:[{start:2,end:6},{start:24,end:28}],horizon:48});
 assert.deepEqual(p.rows.map(r=>[r.original,r.proposed,r.change]),[[0,6,'moved'],[null,28,'added']]);
});

test('valacyclovir: a move past the simulation end is not made and is flagged',()=>{
 const doses=[{time:0,route:'Valacyclovir oral',amount:500},{time:44,route:'Valacyclovir oral',amount:500}];
 const p=R.postHdPlan({doses,sessions:[{start:44,end:48}],horizon:48});
 const row=p.rows.find(r=>r.original===44);
 assert.equal(row.change,'unchanged');assert.equal(row.proposed,44);assert.match(row.flags[0],/dropped/);
});

test('no HD sessions or no doses: the preview explains why nothing is proposed',()=>{
 assert.equal(plan(ivDefaults,'No dialysis').applicable,false);
 assert.match(plan(ivDefaults,'No dialysis').message,/no intermittent hemodialysis/);
 assert.equal(R.postHdPlan({doses:[],sessions:[{start:1,end:2}],horizon:10}).applicable,false);
 assert.deepEqual(R.hdSessions([{type:'PD',start:0,end:4},{type:'HD',start:10,end:14},{type:'HD',start:2,end:6}]),[{start:2,end:6},{start:10,end:14}]);
});

test('the applied schedule simulates without errors in every scenario',()=>{
 const p=plan(ivDefaults);
 const config={...ivDefaults,dosingMode:'custom',customDoses:p.doses};
 for(const mode of E.MODES)assert.deepEqual(E.validate(config,mode),[],mode);
 const out=run({dosingMode:'custom',customDoses:p.doses},'Intermittent HD');
 assert.ok(out.plasma.median.every(Number.isFinite));
});
