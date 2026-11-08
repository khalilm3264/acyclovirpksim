'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const pk=require('../public/assets/pk-engine.js');
const lite=require('../public/lite/lite.js');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const demo=()=>lite.compute(pk);

test('Lite stays tiny and ships no Plotly or backend dependency',()=>{
 const page=read('public/lite/index.html');
 const app=read('public/lite/lite.js');
 const engine=read('public/assets/pk-engine.js');
 assert.match(page,/<title>AyFlux Lite — Fast renal PK simulator<\/title>/);
 assert.ok(page.includes('<script defer src="/assets/pk-engine.js"></script>'));
 assert.ok(page.includes('<script defer src="/lite/lite.js"></script>'));
 assert.doesNotMatch(page,/plotly|chart\.js|echarts|cdn\./i);
 assert.doesNotMatch(page,/famciclovir|urea Kt\/V/i);
 assert.equal((page.match(/<canvas\b/g)||[]).length,3);
 assert.ok(page.includes('Educational model only.'));
 assert.ok(page.includes('href="/learn/model-methods/#equations"'));
 assert.ok(page.includes('id="liteExport"'));
 assert.ok(page.includes('id="liteReset"'));
 for(const field of Object.keys(lite.DEFAULT_INPUTS)){
  assert.ok(page.includes('id="lite_'+field+'"'),field+' must have user control');
 }
 assert.ok(page.length+app.length+engine.length<80000,'HTML + UI + engine must stay below 80 KB uncompressed');
});

test('v2-like defaults provide repeated IV doses and five independent scenarios',()=>{
 const cfg=lite.fixedConfiguration(pk);
 assert.equal(cfg.weight,70);assert.equal(cfg.crcl,5);
 assert.equal(cfg.dose,350);assert.equal(cfg.every,24);assert.equal(cfg.horizon,96);
 assert.equal(cfg.doseCount,4);
 assert.equal(cfg.hdStart,24);assert.equal(cfg.hdDuration,4);
 assert.equal(cfg.hdRepeat,48);assert.equal(cfg.hdCl,81.8);
 assert.equal(cfg.draws,1);assert.equal(cfg.variability,0);
 const results=demo();
 assert.deepEqual(results.map(s=>s.label),[
  'No dialysis','Hemodialysis','CAPD','APD','CRRT'
 ]);
 assert.equal(results.length,5);
 for(const s of results){
  assert.equal(s.time.at(-1),96);
  assert.equal(s.plasma.length,s.time.length);
  assert.equal(s.cmmg.length,s.time.length);
  assert.equal(s.clearance.length,s.time.length);
  assert.equal(s.dialRate.length,s.time.length);
  assert.ok(s.plasma.every(Number.isFinite));
  assert.ok(s.cmmg.every(Number.isFinite));
  assert.ok(s.summary.peak>0&&s.summary.auc>0);
  const expected=pk.simulate({...cfg,pdMethod:s.pdMethod},s.mode);
  assert.equal(s.summary.peak,expected.summary.peak.median);
  assert.equal(s.summary.auc,expected.summary.auc.median);
  assert.equal(s.summary.cmmgPeak,expected.summary.mPeak.median);
  assert.equal(s.summary.mass,expected.summary.mass.median);
 }
});

test('CAPD and APD are genuine distinct current-engine schedules',()=>{
 const r=demo();
 const capd=r.find(s=>s.id==='capd'),apd=r.find(s=>s.id==='apd');
 assert.ok(capd.rows.some(row=>row.type==='CAPD'));
 assert.ok(apd.rows.some(row=>row.type==='APD'));
 assert.notEqual(capd.summary.auc,apd.summary.auc);
 for(const label of ['hd','capd','apd','crrt']){
  assert.ok(r.find(s=>s.id===label).summary.auc<r[0].summary.auc);
 }
});

test('changing regimen and dialysis inputs changes outputs and dose count',()=>{
 const overrides={
  weight:85,crcl:60,dose:1200,every:12,horizon:168,
  hdStart:0,hdDuration:6,hdRepeat:48,hdCl:120,effluent:45,pdVolume:2.5
 };
 const cfg=lite.fixedConfiguration(pk,overrides);
 assert.equal(cfg.doseCount,14);
 const old=demo(),now=lite.compute(pk,overrides);
 assert.equal(now.length,5);
 assert.equal(now[0].time.at(-1),168);
 assert.notEqual(now[0].summary.auc,old[0].summary.auc);
 assert.notEqual(now[1].summary.auc,old[1].summary.auc);
 assert.notEqual(now[4].summary.auc,old[4].summary.auc);
 const reset=lite.fixedConfiguration(pk);
 assert.equal(reset.hdCl,81.8);
 assert.equal(reset.effluent,25);
});

test('oral route works through canonical valacyclovir model; invalid inputs are rejected',()=>{
 const config=lite.fixedConfiguration(pk,{route:'Valacyclovir oral',dose:1000});
 assert.equal(config.route,'Valacyclovir oral');
 assert.equal(lite.compute(pk,{route:'Valacyclovir oral',dose:1000}).length,5);
 assert.throws(()=>lite.compute(pk,{route:'Famciclovir oral',dose:1000}),/route/i);
 assert.throws(()=>lite.compute(pk,{dose:3000}),/IV demonstration dose/);
 assert.throws(()=>lite.compute(pk,{weight:10}),/weight must/);
 assert.throws(()=>lite.compute(pk,{crcl:-5}),/crcl must/);
 assert.throws(()=>lite.compute(pk,{dose:7000}),/dose must/);
 assert.throws(()=>lite.compute(pk,{unknown:1}),/Unsupported Lite input/);
});

test('CSV export is complete, unit-labeled and generated locally',()=>{
 const r=demo();
 const csv=lite.exportCSV(r);
 const lines=csv.trim().split('\r\n');
 assert.equal(lines.length,1+r.reduce((n,s)=>n+s.time.length,0));
 assert.equal(lines[0],'time_hours,scenario,plasma_acyclovir_mg_L,plasma_cmmg_mg_L,total_acyclovir_clearance_mL_min,dialytic_transfer_mg_h');
 assert.ok(lines.some(s=>s.includes('CAPD')));
 assert.ok(lines.some(s=>s.includes('APD')));
 assert.doesNotMatch(csv,/\b(?:NaN|Infinity|undefined)\b/);
});

test('pointer interaction and nice-axis ticks are implemented without a chart library',()=>{
 assert.equal(lite.closest([0,1,2,3],2.7),3);
 assert.equal(lite.closest([0,1,2,3],1.3),1);
 assert.ok(lite.ticks(0.01).max>0);
 assert.ok(lite.ticks(40).step>0);
 const js=read('public/lite/lite.js');
 assert.ok(js.includes('pointermove'));
 assert.ok(js.includes('requestAnimationFrame'));
 assert.ok(js.includes('clearTimeout(pending);pending=setTimeout(update,180)'));
});

test('slow-load fallback still offers Lite from nested main-site menu',()=>{
 const main=read('public/index.html'),helper=read('public/assets/lite-fallback.js');
 const ui=read('public/assets/simulator-ui.js');
 assert.ok(main.includes('<details class="ay-head-menu">'));
 assert.ok(main.includes('href="/lite/"'));
 assert.ok(main.includes('src="/assets/lite-fallback.js"'));
 assert.ok(helper.includes('setTimeout(offerLite,9500)'));
 assert.ok(helper.includes('window.addEventListener("ayflux:charts-ready",clearPrompt)'));
 assert.ok(ui.includes("document.documentElement.dataset.ayfluxReady='true'"));
});

test('Lite route is indexed and service worker caches only small first-load assets',()=>{
 const sw=read('public/sw.js'),site=read('public/sitemap.xml');
 for(const file of ['/lite/','/lite/lite.js','/assets/pk-engine.js']){
  assert.ok(sw.includes('"'+file+'"'),file);
 }
 assert.ok(site.includes('https://ayflux.org/lite/'));
 assert.ok(read('README.md').includes('https://ayflux.org/lite/'));
});
