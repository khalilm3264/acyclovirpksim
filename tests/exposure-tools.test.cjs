'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const ui=read('public/assets/simulator-ui.js');
const E=require('../public/assets/pk-engine.js');
const fn=(start,end,name)=>{const i=ui.indexOf(start),j=ui.indexOf(end,i);assert.ok(i>=0&&j>i,start);const c={};vm.runInNewContext(ui.slice(i,j)+';this.f='+name+';',c);return c.f;};

test('time above a level interpolates crossings and handles edge cases',()=>{
 const timeAbove=fn('function timeAbove(','let aboveLevelMg','timeAbove');
 // Triangle 0 → 10 → 0 over 0–10 h: above 5 between hours 2.5 and 7.5.
 assert.ok(Math.abs(timeAbove([0,5,10],[0,10,0],5)-5)<1e-12);
 assert.equal(timeAbove([0,5,10],[0,10,0],10),0,'touching the level is not above it');
 assert.equal(timeAbove([0,5,10],[3,3,3],2),10);
 assert.equal(timeAbove([0,5,10],[3,3,3],3),0);
 assert.equal(timeAbove([0,5,10],[3,3,3],0),10);
 assert.equal(timeAbove([0],[9],1),0);
 assert.equal(timeAbove([0,1,2],[4,NaN,4],1),0,'nonfinite values contribute nothing');
 // Against a real simulation: never longer than the window, and monotone in the level.
 const d=E.simulateMany({...E.DEFAULTS,draws:1,horizon:48,requestedModes:['No dialysis']})['No dialysis'];
 const span=d.time.at(-1)-d.time[0];let last=Infinity;
 for(const level of [0,.5,2,5,20,1000]){const h=timeAbove(d.time,d.plasma.median,level);assert.ok(h>=0&&h<=span+1e-9&&h<=last+1e-9);last=h;}
 assert.equal(timeAbove(d.time,d.plasma.median,1000),0);
});

test('kidney injury example is a valid CrCl trajectory at every supported horizon',()=>{
 const example=fn('function kidneyInjuryExample(','function addRenalPoint(','kidneyInjuryExample');
 for(const horizon of [24,48,96,168,240])for(const start of [0,10,95,140]){
  const profile=JSON.parse(JSON.stringify(example(start,horizon)));
  assert.equal(profile[0].time,0);assert.equal(profile.at(-1).time,horizon);
  assert.equal(profile[1].crcl,profile[0].crcl);assert.ok(profile[2].crcl<=profile[1].crcl);
  assert.deepEqual(E.validateRenalProfile({...E.DEFAULTS,horizon,renalMode:'profile',crclSource:'manual',renalProfile:profile}),[]);
 }
});

test('exposure tools stay descriptive and the measurement pixel is off',()=>{
 const html=read('public/index.html');
 assert.match(html,/id="timeAboveLevel"[^>]*placeholder="Enter a level"/,'no default level is suggested');
 assert.match(html,/no established therapeutic or toxic cutoff/);
 assert.match(ui,/id="renalExample"/);
 const pixel=read('public/assets/measurement-pixel.js');
 assert.match(pixel,/const ENABLED = false;/);
 // With the flag off the script must return before creating any element or queue.
 const calls=[],w={},d={createElement:t=>{calls.push(t);return {};},head:{appendChild:()=>calls.push('append')}};
 vm.runInNewContext(pixel,{window:w,document:d});
 assert.deepEqual(calls,[]);assert.equal(w.oaiq,undefined);
});

test('every guided scenario passes engine validation for each curve it shows, and carries no measurements',()=>{
 const context={E,structuredClone};
 const i=ui.indexOf('function kidneyInjuryExample('),j=ui.indexOf('function addRenalPoint(',i),k=ui.indexOf('function guidedScenarios('),l=ui.indexOf('function showScenarioNote(',k);
 vm.runInNewContext(ui.slice(i,j)+ui.slice(k,l)+';this.list=guidedScenarios();',context);
 const list=JSON.parse(JSON.stringify(context.list));
 assert.equal(list.length,3);
 assert.equal(new Set(list.map(s=>s.id)).size,3);
 for(const scenario of list){
  assert.deepEqual(Object.keys(scenario.config).sort(),Object.keys(E.DEFAULTS).sort(),scenario.id+' has exactly the default keys');
  assert.deepEqual(scenario.config.observations,[]);
  assert.ok(scenario.visible.includes(scenario.primary));
  for(const mode of scenario.visible){assert.ok(E.MODES.includes(mode));assert.deepEqual(E.validate(scenario.config,mode),[],scenario.id+' / '+mode);}
  // Notes describe what to look at; they must not read as dosing advice.
  assert.doesNotMatch(scenario.note,/\b(should|recommend|must|safe dose|target)\b/i,scenario.id);
  const sim=E.simulateMany({...scenario.config,draws:1,requestedModes:[scenario.primary]})[scenario.primary];
  assert.ok(sim.plasma.median.every(v=>Number.isFinite(v)&&v>=0));
 }
 assert.match(read('public/index.html'),/deliberately unadjusted illustrations, not recommendations/);
});

test('HD timing sweep keeps the full simulation and places exactly one session in the first 96 hours',()=>{
 const workspace=read('public/assets/research-workspace.js');
 const i=workspace.indexOf('function hdTimingPlan('),j=workspace.indexOf("$('runHdTiming')",i),context={};
 vm.runInNewContext(workspace.slice(i,j)+';this.plan=hdTimingPlan;this.config=hdTimingConfig;',context);
 const plain=value=>JSON.parse(JSON.stringify(value));
 for(const [horizon,hdDuration] of [[96,4],[24,4],[336,6],[48,24],[24,24],[168,4]]){
  const plan=plain(context.plan({horizon,hdDuration}));
  assert.equal(plan.horizon,horizon,'the simulation duration is never shortened');
  assert.equal(plan.window,Math.min(96,horizon));
  assert.equal(plan.starts[0],0);
  assert.ok(plan.starts.length>=1&&plan.starts.length<=193);
  if(plan.starts.length>1)assert.ok(plan.starts[1]-plan.starts[0]<=1,'no coarser than hourly');
  for(const start of plan.starts){
   assert.ok(start+plan.duration<=plan.window+1e-9);assert.equal(start*2,Math.round(start*2));
   const config=plain(context.config({...E.DEFAULTS,horizon,hdDuration},plan,start));
   assert.equal(config.schedule.length,1);assert.equal(config.horizon,horizon);
  }
  for(const start of [plan.starts[0],plan.starts.at(-1)])assert.deepEqual(E.validate(plain(context.config({...E.DEFAULTS,horizon,hdDuration},plan,start)),'Custom sequence'),[]);
 }
 // Regression: time-dependent inputs after hour 96 must survive. These two cases failed when the horizon was capped.
 const injury={...E.DEFAULTS,route:'Valacyclovir oral',dose:1000,every:8,doseCount:21,horizon:168,renalMode:'profile',crclSource:'manual',
  renalProfile:[{time:0,crcl:95},{time:84,crcl:95},{time:126,crcl:19},{time:168,crcl:19}]};
 const lateDoses={...E.DEFAULTS,horizon:168,dosingMode:'custom',customDoses:[{time:0,route:'Acyclovir IV',amount:500,infusion:1},{time:120,route:'Acyclovir IV',amount:250,infusion:1},{time:160,route:'Valacyclovir oral',amount:1000}]};
 for(const source of [injury,lateDoses]){
  const plan=plain(context.plan(source));
  assert.equal(plan.horizon,168);assert.equal(plan.starts.at(-1)+plan.duration,96);
  for(const start of [0,plan.starts[Math.floor(plan.starts.length/2)],plan.starts.at(-1)]){
   const config=plain(context.config(source,plan,start));
   assert.deepEqual(E.validate(config,'Custom sequence'),[]);
   assert.deepEqual(config.renalProfile,source.renalProfile);assert.deepEqual(config.customDoses,source.customDoses);
   const summary=E.simulate(config,'Custom sequence').summary;
   assert.ok(Number.isFinite(summary.mass.median)&&summary.mass.median>=0&&Number.isFinite(summary.auc.median));
  }
  // The old approach (shortening the horizon) is what the engine rejects.
  assert.notDeepEqual(E.validate({...source,horizon:96},'Intermittent HD'),[]);
 }
 // One custom-sequence session is numerically the same as one intermittent HD session.
 const base={...E.DEFAULTS,draws:1,variability:0,crclSource:'manual'},plan96=plain(context.plan(base));
 const single=E.simulate(plain(context.config(base,plan96,30)),'Custom sequence').summary,repeat=E.simulate({...base,hdStart:30,hdRepeat:168},'Intermittent HD').summary;
 assert.equal(single.mass.median,repeat.mass.median);assert.equal(single.auc.median,repeat.auc.median);
 // In a long simulation the sweep still has one session, where repeating HD would add a second.
 const long={...base,horizon:336};
 assert.ok(E.simulate(plain(context.config(long,plain(context.plan(long)),30)),'Custom sequence').summary.mass.median<E.simulate({...long,hdStart:30,hdRepeat:168},'Intermittent HD').summary.mass.median);
 assert.doesNotMatch(workspace,/horizon:Math\.min\(96/,'no tool shortens the simulation');
 const base0={...base,crcl:0};
 const removed=start=>E.simulate(plain(context.config(base0,plan96,start)),'Custom sequence').summary.mass.median;
 assert.ok(removed(0)<removed(44));
});

test('summary readouts never show values from stale results',()=>{
 const elements={};
 for(const id of ['timeAboveResult','timeAboveLevel','timeAboveUnit','scenarioWords','accumulationResult','calculationState','csv','saveBaseline','status'])elements[id]={textContent:'',value:'',disabled:false,classList:{toggle(){}}};
 const run=E.simulateMany({...E.DEFAULTS,draws:1,requestedModes:['No dialysis']});
 const context={E,results:run,primary:'No dialysis',c:{...E.DEFAULTS},dataIsCurrent:true,$:id=>elements[id],
  document:{activeElement:null,getElementById:id=>elements[id]||null,querySelector:()=>({setAttribute(){}})}};
 const a=ui.indexOf('const MOLAR_MASS='),b=ui.indexOf('function tableOpen(',a),s1=ui.indexOf('function setBusy('),s2=ui.indexOf('function calculationError(',s1);
 vm.runInNewContext(ui.slice(a,b)+ui.slice(s1,s2)+';aboveLevelMg=2;this.render=renderTimeAbove;this.busy=setBusy;',context);
 const shown=()=>[elements.timeAboveResult.textContent,elements.accumulationResult.textContent,elements.scenarioWords.textContent];
 context.render();
 assert.match(shown()[0],/^\d+\.\d of 96 hours \(\d+%\) for the median No dialysis curve\.$/);
 assert.match(shown()[1],/^Accumulation:/);assert.match(shown()[2],/^70 kg/);
 // A calculation starts: inputs changed, results are stale.
 context.dataIsCurrent=false;context.c.dose=2000;context.busy(true);
 assert.deepEqual(shown(),['','',''],'cleared while a calculation is pending');
 // Typing a level while stale must not bring a value back.
 context.render();assert.deepEqual(shown(),['','','']);
 // The calculation fails: still stale, still blank.
 context.busy(false);assert.deepEqual(shown(),['','','']);
 // New results arrive.
 context.dataIsCurrent=true;context.busy(false);
 assert.match(shown()[0],/of 96 hours/);assert.match(shown()[2],/2000 mg/);
 // Results exist but not for the selected scenario.
 context.primary='CRRT';context.render();assert.deepEqual(shown(),['','','']);
 // Every path that starts, fails or finishes a calculation goes through setBusy.
 assert.match(ui,/function defer\(\)\{[^\n]*dataIsCurrent=false;setBusy\(true\)/);
 assert.match(ui.slice(ui.indexOf('function calculationError('),ui.indexOf('function calculationError(')+400),/dataIsCurrent=false;setBusy\(false\)/);
 assert.match(ui.slice(ui.indexOf('function calculate(forceAll'),ui.indexOf('function defer()')),/dataIsCurrent=false;[\s\S]*setBusy\(true\);startNextJob\(\);[\s\S]*calculationError\(error\)/);
});

test('accumulation ratio compares last-dose and first-dose peaks and needs two dose times',()=>{
 const ratio=fn('function accumulationRatio(','// One-line plain-language','accumulationRatio');
 const time=[0,1,2,3,4,5,6,7],values=[0,4,2,1,6,3,2,1];
 assert.equal(ratio(time,values,[0,4]),1.5);
 assert.equal(ratio(time,values,[4,0,4]),1.5,'order and duplicates do not matter');
 assert.equal(ratio(time,values,[0]),null);
 assert.equal(ratio(time,values,[]),null);
 assert.equal(ratio(time,[0,0,0,0,0,0,0,0],[0,4]),null,'no division by a zero first peak');
 // Real regimen: repeated IV doses with no kidney function accumulate; a single dose has no ratio.
 const run=E.simulateMany({...E.DEFAULTS,draws:1,crcl:0,horizon:96,requestedModes:['No dialysis']})['No dialysis'];
 assert.ok(ratio(run.time,run.plasma.median,run.doses.filter(d=>d.amount>0).map(d=>d.time))>1.5);
 const single=E.simulateMany({...E.DEFAULTS,draws:1,doseCount:1,requestedModes:['No dialysis']})['No dialysis'];
 assert.equal(ratio(single.time,single.plasma.median,single.doses.filter(d=>d.amount>0).map(d=>d.time)),null);
});

test('scenario description states dose per kg and never invents a recommendation',()=>{
 const describe=fn('function describeScenario(','let aboveLevelMg','describeScenario');
 assert.equal(describe(E.DEFAULTS,'No dialysis'),'70 kg · CrCl 95 mL/min · acyclovir IV 700 mg (10 mg/kg) every 8 h, up to 12 doses, 1-h infusion · 96 h simulated · no dialysis');
 const oral=describe({...E.DEFAULTS,route:'Valacyclovir oral',dose:1000,weight:49.9,doseCount:1},'Intermittent HD');
 assert.match(oral,/valacyclovir oral 1000 mg \(20\.04 mg\/kg\) every 8 h, up to 1 dose ·/);
 assert.doesNotMatch(oral,/infusion/);
 assert.match(oral,/intermittent HD: 4 h every 48 h from hour 24$/);
 assert.match(describe({...E.DEFAULTS,dosingMode:'custom'},'CRRT'),/custom schedule of 3 doses · 96 h simulated · CRRT at 25 mL\/kg\/h effluent$/);
 assert.match(describe({...E.DEFAULTS,renalMode:'profile',renalProfile:[{time:0,crcl:95},{time:96,crcl:19}]},'Peritoneal dialysis'),/CrCl 95 → 19 mL\/min \(custom trajectory\).*peritoneal dialysis$/);
 const html=read('public/index.html');
 for(const id of ['scenarioWords','accumulationResult','resetDefaults'])assert.ok(html.includes('id="'+id+'"'),id);
 // Reset goes through version history like every other bulk change.
 const reset=ui.slice(ui.indexOf("$('resetDefaults')"),ui.indexOf("$('scenarioNoteClose')"));
 assert.ok(reset.indexOf('rememberVersion(')<reset.indexOf('applyVersion('));
});

test('HD timing stops after a settings change during a yielded sweep',async()=>{
 const workspace=read('public/assets/research-workspace.js');
 const begin=workspace.indexOf('function hdTimingPlan(');
 const end=workspace.indexOf("$('runIntegrity')",begin);
 for(const change of [{updated:false,revision:1,primary:'No dialysis'},
   {updated:true,revision:2,primary:'No dialysis'},
   {updated:true,revision:1,primary:'CRRT'}]){
  const elements={};
  let handler,calls=0,current={updated:true,revision:1,primary:'No dialysis'};
  for(const id of ['runHdTiming','hdTimingArea','hdTimingPlot','hdTimingStatus']){
   elements[id]={disabled:false,textContent:'',replaceChildren(){this.cleared=true;},
    classList:{add(){}},addEventListener(type,callback){handler=callback;}};
  }
  const snapshot={...current,config:{...E.DEFAULTS}};
  const context={
   performance, researchRunner:()=>({summary:async()=>{calls++;return {auc:{median:100}};},close(){}}),
   $:id=>elements[id],bridge:{snapshot:()=>current},getSnapshot:()=>snapshot,
   updateText:(id,text)=>{elements[id].textContent=text;},
   pause:async()=>{current=change;},
   pk:{validate:()=>[],simulate:()=>{calls++;return {summary:{auc:{median:100}}};}}
  };
  vm.runInNewContext(workspace.slice(begin,end),context);
  await handler();
  assert.equal(calls,1,'only the reference ran before the source scenario changed');
  assert.match(elements.hdTimingStatus.textContent,/Settings changed/);
  assert.equal(elements.hdTimingArea.cleared,true);
  assert.equal(elements.runHdTiming.disabled,false);
 }
});
