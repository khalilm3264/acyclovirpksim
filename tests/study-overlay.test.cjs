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
  assert.ok(!S.matches(study,{...config,weight:config.weight+1},study.mode),'changed weight hides the overlay');
  if(study.config.customDoses)assert.ok(!S.matches(study,{...config,customDoses:config.customDoses.slice(1)},study.mode),'changed dose list hides the overlay');
  assert.ok(!S.matches(study,config,'Intermittent HD'),'changed scenario hides the overlay');
 }
 assert.equal(S.find('nope'),null);
 for(const study of S.STUDIES)for(const [t,v] of study.cmmgPoints||[])assert.ok(v>0&&t>=0);
 assert.ok(S.STUDIES.some(s=>s.mode==='Peritoneal dialysis')&&S.STUDIES.some(s=>s.mode==='Custom sequence'),'dialysis studies included');
});

test('dialysis and single-patient studies reproduce the research/validation reconstructions',()=>{
 // Boelaert: same configuration as research/validation/boelaert-capd.cjs, whose outputs are recorded in JSON.
 const reference=JSON.parse(read('research/validation/boelaert-v026-reference-results.json'));
 for(const subject of reference.subjects){
  const study=S.find('boelaert-'+subject.subject),score=S.score(study,E,{draws:20});
  subject.checkpoints.forEach((point,i)=>{
   assert.ok(Math.abs(score.rows[i].predicted-point.ayflux_mg_L)<2e-3,study.id+' '+point.metric);
   assert.ok(Math.abs(score.rows[i].observed-point.source_fitted_mg_L)<1e-3,study.id+' observed '+point.metric);
  });
 }
 // Vasquez: the 4-hour admission assumption of research/validation/vasquez-hd.cjs.
 const vasquez=require('../research/validation/vasquez-hd.cjs').simulate(4,0.125),v=S.score(S.find('vasquez'),E,{draws:20});
 assert.deepEqual(v.rows.map(r=>r.observed),[vasquez[0][1],vasquez[1][1]]);
 v.rows.forEach((r,i)=>assert.ok(Math.abs(r.predicted-vasquez[i][2])<0.02,'Vasquez '+i));
 // Kacirova: the reference reconstruction (creatinine 87 µmol/L, ninth infusion, 1-hour infusions).
 // The 25-minute sample is between grid points here, so allow 3%.
 const kacirova=require('../research/validation/kacirova-paired.cjs').predict(87,8,1,1/12),k=S.score(S.find('kacirova'),E,{draws:20});
 const byOrder=[k.rows[0],k.rows[1],k.rows[2],k.rows[3]].map(r=>r.predicted);
 byOrder.forEach((value,i)=>assert.ok(Math.abs(value/kacirova[i]-1)<0.03,'Kacirova endpoint '+i+': '+value+' vs '+kacirova[i]));
 assert.deepEqual(k.rows.map(r=>r.analyte),['plasma','plasma','cmmg','cmmg']);
});

test('scorecard CSV has one row per published point and quotes text safely',()=>{
 const scores=['laskin-anuric','kacirova'].map(id=>S.score(S.find(id),E,{draws:20}));
 const lines=S.csv(scores,{vcScale:1.1,clearanceScale:0.9}).trim().split('\n');
 assert.equal(lines[0],'study_id,citation,analyte,time_h,observed_mg_L,predicted_nominal_mg_L,interval_lower_mg_L,interval_upper_mg_L,inside_interval,point_type,central_volume_multiplier,clearance_multiplier');
 assert.equal(lines.length,1+3+4);
 assert.match(lines[1],/^laskin-anuric,"Laskin 1982 \(anuric, before dialysis\) \[1\]",plasma,1,/);
 assert.match(lines.at(-1),/^kacirova,.*,cmmg,65\.4167,0\.64,.*,measured concentrations,1\.1,0\.9$/);
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
 assert.match(ui,/function chartSignature\(key\)\{return JSON\.stringify\(\[key==='plasma'\|\|key==='cmmg'\?overlayStudy\(\)/);
 assert.match(html,/id="scorecardFigure"/);assert.match(html,/id="scorecardCsv" disabled/);
 // Readouts are rendered only from current results.
 const render=ui.slice(ui.indexOf('function renderTimeAbove('),ui.indexOf('function tableOpen('));
 assert.match(render,/run=dataIsCurrent&&results\?results\[primary\]:null/);
 assert.match(render,/cmmgAucRatio\(run\.time/);
 assert.match(ui,/if\(tab==='method'\)renderScorecard\(\)/);
});

test('bias cancellation does not hide error magnitude, and analytes remain separate',()=>{
 const row=(observed,predicted,analyte='plasma')=>({observed,predicted,analyte,inside:true});
 const s=S.summarize([{id:'laskin-normal',rows:[row(1,2),row(2,1)]},{id:'kacirova',rows:[row(1,1,'cmmg')]}]);
 assert.ok(Math.abs(s.overall.gmr-1)<1e-12);
 assert.ok(Math.abs(s.groups[0].absoluteFoldError-2)<1e-12);
 assert.equal(s.groups[0].total,2);assert.equal(s.groups[2].total,1);
 assert.equal(s.sources,2);assert.equal(s.scenarios,2);
});
test('case observations cite the case publication and mass endpoints remain separate',()=>{
 assert.equal(S.find('kacirova').ref,'ref42');
 assert.match(html,/id="ref42"/);assert.match(html,/mass-recovery/);
 assert.equal(S.STUDIES.flatMap(S.pointsOf).length,37);
 const scores=S.STUDIES.map(s=>({id:s.id,rows:S.pointsOf(s).map(r=>({...r,predicted:r.observed,inside:true}))}));
 const summary=S.summarize(scores);assert.equal(summary.scenarios,9);assert.equal(summary.sources,6);
});

test('component ablation reuses the scorecard predictions and moves bias in the expected directions',()=>{
 const A=require('../research/validation/ablation-study.cjs'),results=A.run(),by=Object.fromEntries(results.map(r=>[r.variant.id,r]));
 // The reference variant reproduces the scorecard's nominal predictions exactly.
 let i=0;for(const study of S.STUDIES)for(const row of S.score(study,E,{draws:5}).rows)assert.ok(Math.abs(row.predicted/by.full.rows[i++].predicted-1)<1e-12);
 assert.equal(i,by.full.rows.length);
 // Less clearance means higher predictions; more renal clearance assumed means lower.
 assert.ok(by['no-dialysis'].groups['plasma-dialysis'].bias>by.full.groups['plasma-dialysis'].bias);
 assert.equal(by['no-dialysis'].groups['plasma-no-dialysis'].bias,by.full.groups['plasma-no-dialysis'].bias);
 assert.ok(by['gfr-only'].groups['plasma-no-dialysis'].bias>by.full.groups['plasma-no-dialysis'].bias);
 assert.equal(by['no-cmmg'].groups.cmmg,null,'zero CMMG predictions have no fold error');
 assert.ok(results.every(r=>r.rows.length===37));
});

test('exploring source assumptions preserves the original study and validates hypothetical inputs',()=>{
 const studies=require('../public/assets/study-library.js');
 const engine=require('../public/assets/pk-engine.js');
 const hd=studies.find('vasquez');
 const before=JSON.stringify(hd);
 const changed=studies.exploreConfig(hd,engine,8);
 assert.equal(changed.schedule[0].start,48);
 assert.equal(changed.horizon,hd.config.horizon+4);
 assert.equal(JSON.stringify(hd),before);
 assert.deepEqual(engine.validate(changed,hd.mode),[]);
 for(const study of studies.STUDIES.filter(s=>s.id.startsWith('boelaert-'))){
  const config=studies.exploreConfig(study,engine,5);
  assert.equal(config.crcl,5);
  assert.equal(study.config.crcl,0);
  assert.deepEqual(engine.validate(config,study.mode),[]);
  assert.ok(studies.inputsFor(study).some(row=>row[1]==='Unknown'));
 }
 assert.throws(()=>studies.exploreConfig(hd,engine,-1));
 assert.throws(()=>studies.exploreConfig(hd,engine,NaN));
});
