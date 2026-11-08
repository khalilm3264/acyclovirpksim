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
 assert.match(sw,/const CACHE = "ayflux-static-v0\.21\.0"/);
 assert.match(sw,/assets\/research-workspace\.js/);
 assert.doesNotMatch(sw,/indexedDB|POST|localStorage\.setItem/);
});

test('research heatmap is interactive when Cartesian is staged and still has numeric fallback',()=>{
 const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
 const source=fs.readFileSync(path.join(root,'public/assets/research-workspace.js'),'utf8');
 const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
 const workflow=fs.readFileSync(path.join(root,'.github/workflows/pages.yml'),'utf8');
 assert.match(html,/id="heatmapPlot"/);
 assert.match(html,/id="heatmapArea"/);
 assert.match(source,/loadCartesianForHeatmap/);
 assert.match(source,/type:'heatmap'/);
 assert.match(source,/Interactive plot unavailable; numeric table shown/);
 assert.match(workflow,/plotly.js-cartesian-dist-min@3\\.3\\.1/);
});
test('research report protects PNG charts from printing across pages',()=>{
 const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
 const script=fs.readFileSync(path.resolve(__dirname,'../public/assets/research-workspace.js'),'utf8');
 const from=script.indexOf('function buildResearchReportHtml(');
 const to=script.indexOf("$('printResearchReport').addEventListener",from);
 assert.ok(from>=0&&to>from);
 const out={escapeHtml:t=>String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;'),window:{AyFluxVersion:{version:'0.22.0'}}};
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
 assert.match(script,/Plotly\.newPlot\(target,/);
 assert.doesNotMatch(script,/Plotly\.toImage\(chart,\{/);
});
