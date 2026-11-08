'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const pk=require('../public/assets/pk-engine.js');
const lite=require('../public/lite/lite.js');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('AyFlux Lite uses the full scientific engine but skips heavy rendering dependencies',()=>{
 const page=read('public/lite/index.html');
 assert.match(page,/AyFlux Lite — Quick Dialysis Comparison/);
 assert.match(page,/<script defer src="\/assets\/pk-engine\.js"><\/script>/);
 assert.match(page,/<script defer src="\/lite\/lite\.js"><\/script>/);
 assert.doesNotMatch(page,/plotly|chart\.js|echarts|cdn\./i);
 assert.equal((page.match(/<input\b/g)||[]).length,3);
 assert.doesNotMatch(page,/<select\b|<button\b/i);
 for(const id of ['liteWeight','liteCrcl','liteDose'])assert.ok(page.includes('id="'+id+'"'));
 assert.doesNotMatch(page,/Four dialysis scenarios\. Two concentration charts\.|A quick, fixed-assumption comparison using/i);
 assert.equal((page.match(/<canvas\b/g)||[]).length,2);
 assert.ok(page.includes('Educational demonstration only'));
 assert.ok(page.includes('href="/learn/model-methods/#equations"'));
});

test('AyFlux Lite four scenarios reproduce direct fixed-input AyFlux runs',()=>{
 const c=lite.fixedConfiguration(pk);
 assert.equal(c.draws,1);assert.equal(c.variability,0);
 assert.equal(c.crcl,0);assert.equal(c.doseCount,1);
 assert.equal(c.dose,700);assert.equal(c.horizon,48);
 const runs=lite.compute(pk);
 assert.deepEqual(runs.map(r=>r.mode),[
  'No dialysis','Intermittent HD','Peritoneal dialysis','CRRT'
 ]);
 for(const run of runs){
  const x=pk.simulate(c,run.mode);
  assert.equal(run.time.at(-1),48);
  assert.equal(run.time.length,run.plasma.length);
  assert.equal(run.time.length,run.cmmg.length);
  assert.ok(run.plasma.every(v=>Number.isFinite(v)&&v>=0));
  assert.ok(run.cmmg.every(v=>Number.isFinite(v)&&v>=0));
  assert.equal(run.peak,x.summary.peak.median);
  assert.equal(run.auc,x.summary.auc.median);
  assert.equal(run.cmmgPeak,x.summary.mPeak.median);
  assert.ok(run.peak>0);
  assert.ok(run.auc>0);
 }
});

test('Lite inputs update nominal model outputs without changing dialysis schedules',()=>{
 const initial=lite.compute(pk);
 const custom=lite.compute(pk,{weight:80,crcl:35,dose:500});
 assert.equal(custom.length,4);
 const cfg=lite.fixedConfiguration(pk,{weight:80,crcl:35,dose:500});
 assert.equal(cfg.doseCount,1);
 assert.equal(cfg.draws,1);
 assert.equal(cfg.variability,0);
 assert.equal(cfg.weight,80);
 assert.equal(cfg.crcl,35);
 assert.equal(cfg.dose,500);
 assert.notEqual(custom[0].auc,initial[0].auc);
 for(const run of custom){
  const expected=pk.simulate(cfg,run.mode);
  assert.equal(run.peak,expected.summary.peak.median);
  assert.equal(run.auc,expected.summary.auc.median);
 }
 for(const value of [-1,NaN,200]){
  assert.throws(()=>lite.compute(pk,{crcl:value}),/crcl must be/);
 }
 assert.throws(()=>lite.compute(pk,{dose:1600}),/dose must be/);
 assert.throws(()=>lite.compute(pk,{unsupported:1}),/Unsupported Lite input/);
});

test('AyFlux Lite presets distinguish the anticipated illustrative dialysis exposure',()=>{
 const runs=lite.compute(pk);
 const byName=Object.fromEntries(runs.map(r=>[r.mode,r]));
 const no=byName['No dialysis'];
 for(const name of ['Intermittent HD','Peritoneal dialysis','CRRT']){
  assert.ok(byName[name].auc < no.auc,name+': expected lower modeled acyclovir AUC');
 }
 assert.ok(byName['CRRT'].auc<no.auc);
 assert.ok(lite.ticks(0.01).max>0);
 assert.ok(lite.ticks(40).step>0);
});

test('slow-loading message is optional, non-redirecting and removed at model readiness',()=>{
 const main=read('public/index.html');
 const helper=read('public/assets/lite-fallback.js');
 const ui=read('public/assets/simulator-ui.js');
 assert.ok(main.includes('href="/lite/"'));
 assert.ok(main.includes('src="/assets/lite-fallback.js"'));
 assert.ok(helper.includes('setTimeout(offerLite,9500)'));
 assert.ok(helper.includes("link.href=\"/lite/\""));
 assert.ok(helper.includes('window.addEventListener("ayflux:charts-ready",clearPrompt)'));
 assert.ok(main.includes('<details class="ay-head-menu">'));
 assert.ok(!main.includes('class="ay-guide-link ay-lite-link"'));
 assert.ok(!/location\.replace\(|location\.assign\(|location\.href\s*=/.test(helper));
 assert.ok(ui.includes("document.documentElement.dataset.ayfluxReady='true'"));
});

test('lite route and scripts are included in offline shell and sitemap',()=>{
 const sw=read('public/sw.js'),site=read('public/sitemap.xml');
 for(const file of ['/lite/','/lite/lite.js','/assets/lite-fallback.js']){
  assert.ok(sw.includes('"'+file+'"'),file);
 }
 assert.ok(site.includes('https://ayflux.org/lite/'));
 const readme=read('README.md');
 assert.ok(readme.includes('https://ayflux.org/lite/'));
});
