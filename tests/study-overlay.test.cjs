'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const ui=read('public/assets/simulator-ui.js'),html=read('public/index.html');
const E=require('../public/assets/pk-engine.js'),S=require('../public/assets/study-library.js');
const fn=(start,end,name)=>{const i=ui.indexOf(start),j=ui.indexOf(end,i);assert.ok(i>=0&&j>i,start);const c={};vm.runInNewContext(ui.slice(i,j)+';this.f='+name+';',c);return c.f;};

test('every published study loads as a valid regimen with positive, time-ordered points',()=>{
 assert.ok(S.STUDIES.length>=4);
 assert.equal(new Set(S.STUDIES.map(s=>s.id)).size,S.STUDIES.length);
 for(const study of S.STUDIES){
  const config=S.configFor(study,E);
  assert.deepEqual(E.validate(config,study.mode),[],study.id);
  assert.ok(study.points.length>=2);
  for(let i=0;i<study.points.length;i++){
   const [t,v]=study.points[i];
   assert.ok(v>0&&t>=0&&t<=config.horizon,study.id+' point '+i);
   if(i)assert.ok(t>study.points[i-1][0],study.id+' times increase');
  }
  assert.match(html,new RegExp('<li id="'+study.ref+'">'),'citation anchor for '+study.id);
  assert.equal(S.find(study.id),study);
  assert.ok(study.legend.length<=26,'legend label stays short: '+study.legend);
  assert.ok(S.matches(study,config,study.mode));
  assert.ok(!S.matches(study,{...config,dose:config.dose+1},study.mode),'changed dose hides the overlay');
  assert.ok(!S.matches(study,config,'Intermittent HD'),'changed scenario hides the overlay');
 }
 assert.equal(S.find('nope'),null);
});

test('study data agree with the existing benchmark tables instead of duplicating different numbers',()=>{
 const label=E.benchmark(E.DEFAULTS);
 for(const row of label){
  const study=S.find('label-'+row.mgkg);
  assert.deepEqual(study.points.map(p=>p[1]),[row.peak,row.trough]);
  assert.equal(study.n,row.n);
 }
 const anuric=E.anuricBenchmark(E.DEFAULTS),study=S.find('laskin-anuric');
 assert.deepEqual(study.points.map(p=>p[0]),anuric.map(r=>r.hour));
 study.points.forEach((p,i)=>assert.ok(Math.abs(p[1]-anuric[i].meanMg)<1e-12));
 // Laskin 1982 AAC Table 1: 12 means; end of infusion (1 h) is the maximum.
 const normal=S.find('laskin-normal');
 assert.equal(normal.points.length,12);
 assert.equal(Math.max(...normal.points.map(p=>p[1])),11.4);
});

test('scorecard reproduces the documented Laskin 1982 comparison and is deterministic',()=>{
 const study=S.find('laskin-normal'),a=S.score(study,E,{draws:400}),b=S.score(study,E,{draws:400});
 assert.deepEqual(a,b);
 assert.ok(Math.abs(a.gmr-0.774)<0.01,'nominal predicted/observed ratio '+a.gmr);
 assert.ok(a.inside>=10&&a.inside<=a.total);
 for(const row of a.rows)assert.ok(row.lower<=row.predicted*1.5&&row.upper>=row.lower);
 // Calibration multipliers carry over: larger clearance lowers predictions.
 const faster=S.score(study,E,{draws:50,calibration:{vcScale:1,clearanceScale:1.5}});
 assert.ok(faster.gmr<a.gmr);
});

test('CMMG/acyclovir AUC ratio uses the last 24 hours and rises as kidney function falls',()=>{
 const ratio=fn('function cmmgAucRatio(','function renderStudyStatus','cmmgAucRatio');
 // Constant curves: ratio is the concentration ratio, window clipped to 24 h.
 const r=ratio([0,10,30,50],[2,2,2,2],[1,1,1,1]);
 assert.deepEqual([r.from,r.to],[26,50]);assert.ok(Math.abs(r.ratio-.5)<1e-12);
 assert.deepEqual({...ratio([0,6],[1,1],[3,3])},{from:0,to:6,ratio:3});
 assert.equal(ratio([0,6],[0,0],[1,1]),null);
 assert.equal(ratio([],[],[]),null);
 // Engine: valacyclovir 2000 mg q8h for 11 days, as in Kably 2025.
 const run=crcl=>{const d=E.simulateMany({...E.DEFAULTS,route:'Valacyclovir oral',dose:2000,every:8,doseCount:33,horizon:264,crcl,crclSource:'manual',draws:1,variability:0,requestedModes:['No dialysis'],observations:[]})['No dialysis'];return ratio(d.time,d.plasma.median,d.cmmg.median).ratio;};
 const values=[120,60,15].map(run);
 assert.ok(values[0]<values[1]&&values[1]<values[2],values.join());
 assert.ok(values[0]>0.05&&values[0]<0.5);
});

test('overlay, scorecard and ratio are wired into the page without entering saved settings',()=>{
 assert.match(html,/<select id="studySelect"><option value="">None<\/option><\/select>/);
 assert.match(html,/id="scorecardRows"/);
 assert.match(html,/id="cmmgRatioResult"/);
 assert.ok(html.indexOf('assets/study-library.js')<html.indexOf('assets/simulator-ui.js'));
 assert.match(read('public/sw.js'),/"\/assets\/study-library\.js"/);
 // Overlay state lives outside the configuration object, so files and links never carry it.
 assert.doesNotMatch(ui,/c\.studyOverlay|studyOverlay:/);
 assert.match(ui,/function chartSignature\(key\)\{return JSON\.stringify\(\[key==='plasma'\?overlayStudy\(\)/);
 // Readouts are rendered only from current results.
 const render=ui.slice(ui.indexOf('function renderTimeAbove('),ui.indexOf('function tableOpen('));
 assert.match(render,/run=dataIsCurrent&&results\?results\[primary\]:null/);
 assert.match(render,/cmmgAucRatio\(run\.time/);
 assert.match(ui,/if\(tab==='method'\)renderScorecard\(\)/);
});
