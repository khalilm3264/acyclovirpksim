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
