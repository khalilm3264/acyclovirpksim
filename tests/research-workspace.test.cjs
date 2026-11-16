'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const pk=require('../public/assets/pk-engine.js');
const integrity=require('../public/assets/model-integrity.js');
const csv=require('../public/assets/osp-import.js');
function cfg(overrides={}){return {...pk.DEFAULTS,draws:1,variability:0,horizon:24,doseCount:1,...overrides};}

test('numerical and mass-balance diagnostics are finite across major model modes',()=>{
 for(const mode of ['No dialysis','Intermittent HD','Peritoneal dialysis','CRRT']){
  const sample=pk.simulate(cfg(),mode);
  const report=integrity.checkSimulation(sample,cfg());
  assert.deepEqual(report.issues,[],mode);
  const d=sample.summary;
  assert.ok(Number.isFinite(d.massBalanceErrorMg.median),mode);
  assert.ok(Math.abs(d.massBalanceErrorMg.median)<0.02*d.administeredAcyclovirEqMg.median,mode);
 }
});

test('acyclovir oral depot and zero renal clearance retain mass consistency',()=>{
 const c=cfg({route:'Valacyclovir oral',dose:1000,crcl:0,crclSource:'manual'});
 const data=pk.simulate(c,'No dialysis');
 assert.ok(data.summary.administeredAcyclovirEqMg.median>100);
 assert.ok(data.summary.administeredAcyclovirEqMg.median<1000);
 assert.ok(Math.abs(data.summary.massBalanceErrorMg.median)<0.02*data.summary.administeredAcyclovirEqMg.median);
 assert.equal(data.kidneyClear.median[0],0);
});

test('time-step convergence is measurable without changing input state',()=>{
 const c=cfg({horizon:12});
 const result=integrity.checkConvergence(pk,c,'No dialysis');
 assert.ok(result.aucRelativeDifference<0.02);
 assert.ok(result.peakRelativeDifference<0.02);
 assert.ok(Number.isFinite(result.massBalanceErrorMg));
});

test('CSV parser handles quoted headers and delimited formats safely',()=>{
 const t=csv.parseCSV('Time (h),"Drug, plasma"\r\n0,0\r\n1,2\r\n');
 assert.equal(t.headers[1],'Drug, plasma');
 const v=csv.selectSeries(t,{timeColumn:'Time (h)',concentrationColumn:'Drug, plasma'});
 assert.deepEqual(v.time,[0,1]);assert.deepEqual(v.concentration,[0,2]);
 const semi=csv.parseCSV('time;drug\n0;0\n1;2');
 assert.equal(semi.delimiter,';');
 assert.throws(()=>csv.parseCSV('time,conc\n0,1\n1'),/inconsistent/);
});

test('time and concentration units are explicitly converted, not guessed',()=>{
 const table=csv.parseCSV('minute,conc\n0,0\n60,10');
 const v=csv.selectSeries(table,{timeColumn:'minute',concentrationColumn:'conc',timeUnit:'min',concentrationUnit:'umol/L',analyte:'acyclovir'});
 assert.deepEqual(v.time,[0,1]);
 assert.ok(Math.abs(v.concentration[1]-2.2521)<1e-9);
 assert.throws(()=>csv.selectSeries(table,{timeColumn:'minute',concentrationColumn:'conc',concentrationUnit:'ng/L'}),/Unsupported concentration/);
});

test('curve-to-curve comparisons calculate error only in overlapping time span',()=>{
 const source={time:[0,1,2],concentration:[0,2,4]};
 const imported={time:[1,2,3],concentration:[1,4,6]};
 const compared=csv.compareCurves(source,imported);
 assert.equal(compared.points.length,2);
 assert.equal(compared.rmse,Math.sqrt(0.5));
 assert.equal(compared.mae,0.5);
 assert.equal(compared.bias,0.5);
});

test('service worker only caches public static files and no user uploads',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const root=path.resolve(__dirname,'..');
 const sw=fs.readFileSync(path.join(root,'public/sw.js'),'utf8');
 assert.match(sw,/request\.method !== "GET"/);
 assert.match(sw,/const CACHE = "ayflux-static-v[^"]+"/);
 assert.match(sw,/assets\/research-workspace\.js/);
 assert.doesNotMatch(sw,/indexedDB|POST|localStorage\.setItem/);
});

test('research heatmap is interactive when ECharts is staged and still has numeric fallback',()=>{
 const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
 const source=fs.readFileSync(path.join(root,'public/assets/research-workspace.js'),'utf8');
 const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
 const workflow=fs.readFileSync(path.join(root,'.github/workflows/pages.yml'),'utf8');
 assert.match(html,/id="heatmapPlot"/);
 assert.match(html,/id="heatmapArea"/);
 assert.match(source,/window\.AyFluxCharts\.ensure/);
 assert.match(source,/type:'heatmap'/);
 assert.match(source,/Interactive plot unavailable; numeric table shown/);
 assert.ok(workflow.includes('npm ci --ignore-scripts'));
 assert.equal(JSON.parse(fs.readFileSync(path.join(root,'package-lock.json'),'utf8')).packages['node_modules/echarts'].version,'6.1.0');
});
test('research report protects PNG charts from printing across pages',()=>{
 const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
 const script=fs.readFileSync(path.resolve(__dirname,'../public/assets/research-workspace.js'),'utf8');
 const from=script.indexOf('function buildResearchReportHtml(');
 const to=script.indexOf("$('printResearchReport').addEventListener",from);
 assert.ok(from>=0&&to>from);
 const out={escapeHtml:t=>String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;'),window:{AyFluxVersion:{version:'0.25.0'}}};
 vm.runInNewContext(script.slice(from,to)+'; this.build=buildResearchReportHtml;',out);
 const html=out.build({date:'2026-11-07',values:[['Route','Acyclovir IV']],metrics:[['AUC',10]],
  charts:[{name:'Plasma acyclovir',image:'data:image/png;base64,AAAA'},
   {name:'CSF acyclovir',image:'data:image/png;base64,AAAA'},
   {name:'Plasma CMMG',image:'data:image/png;base64,AAAA'}],
  diagnostic:'AUC check',scenario:'No dialysis'});
 assert.match(html,/\.report-charts\{break-before:page;page-break-before:always\}/);
 assert.match(html,/page-break-inside:avoid/);
 assert.equal((html.match(/class="report-figure"/g)||[]).length,3);
 assert.match(script,/await Promise\.all\(Array\.from\(popup\.document\.images/);
 assert.match(script,/charts\.draw\(target,/);
 assert.match(script,/chart\.getDataURL/);
});


test('held-out predictions interpolate each PK draw before weighting and exclude Fit rows',()=>{
 const engine=require('../public/assets/pk-engine.js');
 const raw=[{t:[0,4],cols:{plasma:[0,12]}},{t:[0,4],cols:{plasma:[8,4]}}];
 const row={role:'holdout',time:1,analyte:'plasma',value:4};
 const config={observations:[{...row,role:'fit'},row],assayCV:.1};
 const first=engine.evaluateHoldouts(raw,config,[.8,.2]);
 assert.equal(first.lines.length,1);
 assert.equal(first.lines[0].predicted,3);
 assert.equal(engine.evaluateHoldouts(raw,config,[.2,.8]).lines[0].predicted,7);
 assert.equal(engine.evaluateHoldouts(raw,{...config,observations:[]},[.2,.8]).n,0);
});

test('CSV duplicate headings, including whitespace-normalized names, are rejected',()=>{
 for(const text of ['time,conc,conc\n0,1,9\n1,2,8','time; time ;conc\n0;1;9\n1;2;8']){
  assert.throws(()=>csv.parseCSV(text),/headings must be unique/);
 }
});

function importWorkspace(){
 const fs=require('node:fs'),vm=require('node:vm');
 const source=fs.readFileSync(require('node:path').resolve(__dirname,'../public/assets/research-workspace.js'),'utf8');
 const elements=new Map(),listeners={},draws=[];
 const el=id=>{
  if(!elements.has(id))elements.set(id,{value:'',textContent:'',files:[],selectedIndex:0,
   classList:{hidden:true,add(){this.hidden=true;},remove(){this.hidden=false;}},
   addEventListener(type,fn){this[type]=fn;},replaceChildren(){},append(){}});
  return elements.get(id);
 };
 let finish,fail;
 const charts={ensure:()=>new Promise((resolve,reject)=>{finish=resolve;fail=reject;}),
  dispose(){},line(){return {};},options(){return {};},draw(target){draws.push(target);}};
 const snapshot={updated:true,primary:'No dialysis',results:{'No dialysis':{time:[0,1],plasma:{median:[0,2]}}}};
 const context={$:el,importer:csv,bridge:{snapshot:()=>snapshot},
  document:{createElement:()=>({})},window:{AyFluxCharts:charts,addEventListener:(name,fn)=>{listeners[name]=fn;}}};
 vm.runInNewContext(source.slice(source.indexOf('let externalTable='),source.indexOf('// One worker per research operation')),context);
 async function load(text='time,conc\n0,0\n1,1'){
  await el('ospFile').change({target:{files:[{size:text.length,text:async()=>text}]}});
  for(const [id,value] of Object.entries({ospTimeColumn:'time',ospValueColumn:'conc',ospTimeUnit:'h',ospConcUnit:'mg/L',ospTarget:'plasma'}))el(id).value=value;
 }
 return {el,draws,load,listeners,resolve:()=>finish(),reject:()=>fail(Error('chart failure'))};
}

for(const reject of [false,true])test('Clear cancels pending CSV comparison '+(reject?'failure':'success'),async()=>{
 const w=importWorkspace();await w.load();
 const pending=w.el('ospCompare').click();w.el('ospClear').click();
 reject?w.reject():w.resolve();await pending;
 assert.equal(w.draws.length,0);
 assert.equal(w.el('ospPlot').classList.hidden,true);
 assert.equal(w.el('ospDifference').classList.hidden,true);
 assert.equal(w.el('ospMetrics').textContent,'');
 assert.match(w.el('ospStatus').textContent,/Import cleared/);
 w.listeners['ayflux:results-updated']();
 assert.match(w.el('ospStatus').textContent,/Import cleared/);
});

test('Clear cancels a pending CSV file read and allows a fresh comparison',async()=>{
 const w=importWorkspace();let finish;
 const pending=w.el('ospFile').change({target:{files:[{size:30,text:()=>new Promise(resolve=>{finish=resolve;})}]}});
 w.el('ospClear').click();finish('time,conc\n0,0\n1,1');await pending;
 assert.match(w.el('ospStatus').textContent,/Import cleared/);
 await w.el('ospCompare').click();
 assert.match(w.el('ospStatus').textContent,/Select a CSV/);
 await w.load();const compare=w.el('ospCompare').click();w.resolve();await compare;
 assert.equal(w.draws.length,2);
 assert.match(w.el('ospStatus').textContent,/Compared with AyFlux/);
});

test('new CSV selection invalidates an older pending comparison',async()=>{
 const w=importWorkspace();await w.load();
 const pending=w.el('ospCompare').click(),resolveOld=w.resolve;
 // Capture the pending chart loader before loading the replacement file.
 await w.load('time,conc\n0,0\n1,9');
 resolveOld();await pending;
 assert.equal(w.draws.length,0);
 assert.match(w.el('ospStatus').textContent,/rows loaded locally/);
 const fresh=w.el('ospCompare').click();w.resolve();await fresh;
 assert.equal(w.draws.length,2);
});

test('Compare during file loading does not cancel the pending import',async()=>{
 const w=importWorkspace();let finish;
 const loading=w.el('ospFile').change({target:{files:[{size:30,text:()=>new Promise(resolve=>{finish=resolve;})}]}});
 await w.el('ospCompare').click();
 assert.match(w.el('ospStatus').textContent,/Select a CSV/);
 finish('time,conc\n0,0\n1,1');await loading;
 assert.match(w.el('ospStatus').textContent,/rows loaded locally/);
 for(const [id,value] of Object.entries({ospTimeColumn:'time',ospValueColumn:'conc',ospTimeUnit:'h',ospConcUnit:'mg/L',ospTarget:'plasma'}))w.el(id).value=value;
 const compare=w.el('ospCompare').click();w.resolve();await compare;
 assert.equal(w.draws.length,2);
});
