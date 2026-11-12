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
 assert.match(html,/id="timeAboveLevel"[^>]*placeholder="level"/,'no default level is suggested');
 assert.match(html,/no therapeutic or toxic level is established/);
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

test('HD timing sweep covers the window on a half-hour grid with one session inside it',()=>{
 const workspace=read('public/assets/research-workspace.js');
 const i=workspace.indexOf('function hdTimingPlan('),j=workspace.indexOf("$('runHdTiming')",i),context={};
 vm.runInNewContext(workspace.slice(i,j)+';this.plan=hdTimingPlan;',context);
 for(const [horizon,hdDuration] of [[96,4],[24,4],[336,6],[48,24],[24,24]]){
  const plan=JSON.parse(JSON.stringify(context.plan({horizon,hdDuration})));
  assert.equal(plan.horizon,Math.min(96,horizon));
  assert.equal(plan.starts[0],0);
  assert.ok(plan.starts.length>=1&&plan.starts.length<=193);
  if(plan.starts.length>1)assert.ok(plan.starts[1]-plan.starts[0]<=1,'no coarser than hourly');
  for(const start of plan.starts){assert.ok(start+plan.duration<=plan.horizon+1e-9);assert.equal(start*2,Math.round(start*2));}
  // The sweep's own settings must be valid for the engine at both ends.
  for(const hdStart of [plan.starts[0],plan.starts.at(-1)])assert.deepEqual(E.validate({...E.DEFAULTS,horizon:plan.horizon,hdDuration:plan.duration,hdRepeat:168,hdStart,draws:1,variability:0},'Intermittent HD'),[]);
 }
 assert.match(workspace,/hdRepeat:168/);
 // A later session can only remove drug that is there: removal at hour 0 (before any dose is absorbed) is the minimum for the default regimen.
 const base={...E.DEFAULTS,draws:1,variability:0,horizon:96,hdRepeat:168,crcl:0};
 const removed=start=>E.simulate({...base,hdStart:start},'Intermittent HD').summary.mass.median;
 assert.ok(removed(0)<removed(44));
});
