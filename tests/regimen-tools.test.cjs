'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const E=require('../public/assets/pk-engine.js');
const R=require('../public/assets/regimen-tools.js');
const S=require('../public/assets/study-library.js');
const ui=fs.readFileSync(path.join(__dirname,'../public/assets/simulator-ui.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
const plan=over=>{const c=E.effectiveConfig({...E.DEFAULTS,crcl:5,...over});return {c,p:R.postHdPlan(c,E.scheduleFor(over.mode||'Intermittent HD',c),E.buildDoses(c))};};

test('regimen metrics use one window, a defined pre-dose trough and plasma CMMG',()=>{
 const data={time:[0,1,8,9,16],plasma:{median:[0,10,2,10,2]},cmmg:{median:[0,1,1,1,1]}};
 const doses=[{time:0},{time:8},{time:16}];
 const m=R.metrics(data,doses,16);
 assert.equal(m.window,16);assert.equal(m.peak,10);
 assert.equal(m.troughTime,8,'last dose starting after 0 and before T');assert.equal(m.trough,2);
 assert.ok(Math.abs(m.auc-(5+42+6+42))<1e-12);
 assert.ok(Math.abs(m.cmmgAuc-15.5)<1e-12);assert.equal(m.cmmgPeak,1);
 assert.ok(Math.abs(R.aucTo([0,10],[0,10],5)-12.5)<1e-12,'AUC is cut at T by interpolation');
 assert.equal(R.metrics(data,[{time:0}],16).trough,null,'single dose has no trough');
 assert.equal(R.MAX_SAVED,4);
});

test('IV acyclovir: the label adds one dose after each HD session and keeps scheduled doses',()=>{
 const {c,p}=plan({route:'Acyclovir IV',dose:350,every:24,doseCount:4});
 assert.equal(p.rule,'add');assert.equal(p.cite,'[10]');assert.ok(p.apply);
 const added=p.rows.filter(r=>r.change==='added').map(r=>r.proposed);
 assert.deepEqual(added,E.scheduleFor('Intermittent HD',c).filter(s=>s.type==='HD').map(s=>s.end));
 assert.equal(p.rows.filter(r=>r.change==='unchanged').length,E.buildDoses(c).length,'no scheduled dose dropped');
 assert.deepEqual(E.validate({...c,dosingMode:'custom',customDoses:p.customDoses},'Intermittent HD'),[]);
 // An added dose landing on a scheduled one is flagged.
 const clash=plan({route:'Acyclovir IV',dose:350,every:4,doseCount:30}).p;
 assert.ok(clash.flags.some(f=>f.kind==='duplicate'));
});

test('oral valacyclovir: the label moves the HD-day dose to after the session, other days unchanged',()=>{
 const {c,p}=plan({route:'Valacyclovir oral',dose:500,every:24,doseCount:4});
 assert.equal(p.rule,'move');assert.equal(p.cite,'[8]');assert.ok(p.apply);
 const doses=E.buildDoses(c),hd=E.scheduleFor('Intermittent HD',c).filter(s=>s.type==='HD');
 assert.equal(p.customDoses.length,doses.length,'nothing added or dropped');
 for(const r of p.rows){
  if(r.change==='moved')assert.ok(hd.some(s=>r.proposed===s.end&&r.original>=s.start&&r.original<s.end));
  else assert.equal(r.proposed,r.original);
 }
 // A moved dose landing within CROWDING_H of the next one blocks applying.
 // Every 4 h, HD 23–27.5 h: the 24 h dose moves to 27.5 h, 0.5 h before the 28 h dose.
 const crowded=plan({route:'Valacyclovir oral',dose:500,every:4,doseCount:20,hdDuration:4.5,hdStart:23,hdRepeat:48}).p;
 assert.ok(crowded.flags.some(f=>f.kind==='duplicate'&&/interface rule, not a label rule/.test(f.text)),'crowding is flagged and labelled as an interface rule');
 assert.equal(crowded.apply,false,'and blocks applying');
 assert.equal(R.CROWDING_H,1);
 // Exactly CROWDING_H apart is allowed: HD 23–27 h moves the 24 h dose to 27 h, 1 h before 28 h.
 const spaced=plan({route:'Valacyclovir oral',dose:500,every:4,doseCount:20,hdDuration:4,hdStart:23,hdRepeat:48}).p;
 assert.ok(!spaced.flags.some(f=>f.kind==='duplicate'));assert.equal(spaced.apply,true);
});

test('post-HD timing is unavailable without HD sessions or a repeat regimen',()=>{
 assert.equal(plan({route:'Acyclovir IV',mode:'Peritoneal dialysis'}).p.ok,false);
 assert.match(plan({route:'Acyclovir IV',mode:'No dialysis'}).p.reason,/peritoneal dialysis/);
 assert.equal(plan({dosingMode:'custom'}).p.ok,false);
});

test('residuals: each published value carries a sample type and hours since its dose',()=>{
 const kinds=new Set(['peak','trough','post-infusion','hd-start','hd-end','serial']);
 for(const study of S.STUDIES){
  const r=S.score(study,E,{draws:5});
  for(const row of r.rows){assert.ok(kinds.has(row.kind),study.id);assert.ok(row.sinceDose>=0,study.id);}
 }
 // A trough taken as the next dose starts counts from the previous dose.
 assert.deepEqual(S.score(S.find('label-10'),E,{draws:5}).rows.map(r=>[r.kind,r.sinceDose]),[['peak',1],['trough',8]]);
 assert.deepEqual(S.score(S.find('boelaert-4'),E,{draws:5}).rows.map(r=>r.sinceDose),[1,24,1,24]);
 assert.match(html,/id="residualFigure"/);assert.match(ui,/drawScorecardFigure\(\);drawResidualFigure\(\);/);
});

test('regimen comparison and post-HD panels are wired without entering saved settings',()=>{
 for(const id of ['regimenPanel','saveRegimen','regimenRows','postHdPanel','applyPostHd','postHdRows'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.ok(html.indexOf('assets/regimen-tools.js')<html.indexOf('assets/simulator-ui.js'));
 assert.doesNotMatch(ui,/c\.savedRegimens/);
 assert.match(ui,/rememberVersion\('Before post-dialysis dose timing'\)/);
 assert.match(ui,/config:structuredClone\(c\),data:\{time:d\.time\.slice\(\)/,'saved regimens are frozen copies');
});

test('provenance: every recorded input has a valid status, what the paper reports, what AyFlux uses and a source; counts add up',()=>{
 const recorded=S.STUDIES.filter(s=>s.provenance);
 assert.deepEqual(recorded.map(s=>s.id).sort(),['boelaert-1','boelaert-4','boelaert-5','vasquez']);
 for(const study of recorded){
  const n=S.provenanceCounts(study);
  assert.equal(Object.values(n).reduce((a,b)=>a+b,0),study.provenance.length);
  for(const row of study.provenance){assert.ok(S.STATUSES.includes(row.status),row.input);assert.ok(row.input&&row.reported&&row.used&&row.source,study.id+' '+row.input);}
 }
 // Inputs AyFlux had to supply are not labelled as reported.
 const status=(id,input)=>S.find(id).provenance.find(r=>r.input===input).status;
 assert.equal(status('vasquez','Time from last dose to admission'),'unknown');
 assert.equal(status('vasquez','HD drug clearance'),'assumed');
 assert.equal(status('boelaert-4','Residual kidney function'),'assumed');
 assert.equal(status('boelaert-4','Plasma values compared'),'calculated');
 // Recorded values agree with the configuration actually simulated.
 assert.match(S.find('boelaert-4').provenance[0].used,new RegExp('^'+S.find('boelaert-4').config.dose+' mg'));
 assert.match(S.find('vasquez').provenance.find(r=>r.input==='Weight').reported,new RegExp(S.find('vasquez').config.weight+' kg'));
 assert.equal(S.provenanceCounts(S.find('laskin-normal')),null);
});

test('prediction exercise hides results until revealed',()=>{
 assert.match(html,/id="predictMode"/);assert.match(html,/id="revealPrediction"/);
 assert.match(html,/main\.predicting \.chart,/);
 assert.match(ui,/\(current&&!hidden\?regimenRow/,'current row hidden while predicting');
 assert.match(ui,/f=v=>hidden\?'\?'/,'metric cells hidden while predicting');
 assert.match(ui,/\$\('predictMode'\)\.checked=false;renderRegimens\(\);/,'reveal ends the exercise');
});

test('regimen-tools interpolation and AUC handle empty, singleton and zero inputs safely',()=>{
 assert.equal(R.interp([],[],5),null);
 assert.equal(R.interp(null,null,5),null);
 assert.equal(R.interp([0],[10],5),10);
 assert.equal(R.interp([0,10],[0,0],5),0);
 assert.equal(R.aucTo([],[],10),null);
 assert.equal(R.aucTo(null,null,10),null);
 assert.equal(R.aucTo([0],[10],10),0);
 assert.equal(R.aucTo([0,10],[0,0],10),0);
});

test('comparison metrics distinguish empty series from genuine zero series and handle curves independently',()=>{
 const empty=R.metrics({time:[],plasma:{median:[]},cmmg:{median:[]}},[{time:12}],24);
 assert.equal(empty.auc,null);
 assert.equal(empty.peak,null);
 assert.equal(empty.trough,null);
 assert.equal(empty.cmmgAuc,null);
 assert.equal(empty.cmmgPeak,null);

 const zeroSeries=R.metrics({time:[0,12,24],plasma:{median:[0,0,0]},cmmg:{median:[0,0,0]}},[{time:12}],24);
 assert.equal(zeroSeries.auc,0);
 assert.equal(zeroSeries.peak,0);
 assert.equal(zeroSeries.trough,0);
 assert.equal(zeroSeries.cmmgAuc,0);
 assert.equal(zeroSeries.cmmgPeak,0);

 const cmmgOnly=R.metrics({time:[0,12,24],plasma:{median:[]},cmmg:{median:[1,3,2]}},[{time:12}],24);
 assert.equal(cmmgOnly.auc,null);
 assert.equal(cmmgOnly.peak,null);
 assert.equal(cmmgOnly.trough,null);
 assert.equal(cmmgOnly.cmmgPeak,3);
 assert.ok(typeof cmmgOnly.cmmgAuc==='number'&&cmmgOnly.cmmgAuc>0);

 const plasmaOnly=R.metrics({time:[0,12,24],plasma:{median:[5,2,1]},cmmg:{median:[]}},[{time:12}],24);
 assert.ok(typeof plasmaOnly.auc==='number'&&plasmaOnly.auc>0);
 assert.equal(plasmaOnly.peak,5);
 assert.equal(plasmaOnly.trough,2);
 assert.equal(plasmaOnly.cmmgAuc,null);
 assert.equal(plasmaOnly.cmmgPeak,null);
});
