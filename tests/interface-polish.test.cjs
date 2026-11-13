'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8').replaceAll('\r\n','\n');
function charts(storage={}){
 const window={localStorage:{getItem:key=>storage[key]??null,setItem:(key,value)=>{storage[key]=String(value);}}};
 vm.runInNewContext(read('public/assets/charts.js'),{window,document:{}});
 return window.AyFluxCharts;
}

test('shared chart options provide box zoom, pan, step zoom, reset and download controls',()=>{
 const C=charts(),option=C.options([C.line('a',[0,1],[1,2],'#000')],'x','y');
 assert.deepEqual(Object.keys(option.toolbox.feature),['dataZoom','myPan','myZoomIn','myZoomOut','restore','saveAsImage']);
 assert.equal(option.toolbox.feature.dataZoom.yAxisIndex,undefined,'box zoom covers both axes');
 assert.equal(JSON.stringify(option.dataZoom.map(z=>[z.id,z.type,z.filterMode,z.moveOnMouseMove])),JSON.stringify([['ayNavX','inside','none',false],['ayNavY','inside','none',false]]));
 // Plain scrolling must keep scrolling the page: wheel zoom needs Shift on x and is off on y.
 assert.equal(option.dataZoom[0].zoomOnMouseWheel,'shift');
 assert.equal(option.dataZoom[1].zoomOnMouseWheel,false);
 for(const name of ['myPan','myZoomIn','myZoomOut'])assert.equal(typeof option.toolbox.feature[name].onclick,'function');
});

test('colorblind-safe preference switches heatmap ramps and persists one flag',()=>{
 const storage={},C=charts(storage);
 assert.equal(C.accessible(),false);
 const vivid=C.heatColors(),vividDiverging=C.heatColors(true);
 assert.ok(vivid.length>=8,'default ramp is multi-hue');
 C.setAccessible(true);
 assert.equal(storage['ayflux-colorblind'],'1');
 assert.equal(C.heatColors()[0],'#440154','viridis starts dark purple');
 assert.notEqual(String(C.heatColors()),String(vivid));
 assert.notEqual(String(C.heatColors(true)),String(vividDiverging));
 assert.equal(charts(storage).accessible(),true,'a later page load reads the stored preference');
 assert.equal(String(C.heatmap(['a'],['b'],[[0,0,1]],'x','y','u').visualMap.inRange.color),String(C.heatColors()));
});

test('heatmap cell text keeps WCAG AA contrast against its fill in both palettes',()=>{
 const luminance=rgb=>{const [r,g,b]=rgb.map(v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4;});return .2126*r+.7152*g+.0722*b;};
 const parse=color=>color.startsWith('#')?[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)):color.match(/\d+/g).map(Number);
 const C=charts();
 for(const accessible of [false,true]){
  C.setAccessible(accessible);
  for(const diverging of [false,true])for(let i=0;i<=40;i++){
   const tone=C.heatColorAt(i/40,diverging),a=luminance(parse(tone.fill)),b=luminance(parse(tone.text));
   const ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
   assert.ok(ratio>=4.5,`contrast ${ratio.toFixed(2)} at ${i/40} (accessible=${accessible}, diverging=${diverging})`);
  }
 }
 assert.equal(C.heatColorAt(NaN).fill,C.heatColorAt(0).fill);
 assert.equal(C.heatColorAt(7).fill,C.heatColorAt(1).fill);
});

test('page layout: primary mode first, merged reference tab, table under Concentration, library last',()=>{
 const html=read('public/index.html');
 const tabs=[...html.slice(html.indexOf('id="tabs"'),html.indexOf('id="alerts"')).matchAll(/data-tab="([a-z]+)"/g)].map(m=>m[1]);
 assert.deepEqual(tabs,['concentration','clearance','timeline','validation','research','method']);
 const aside=html.slice(html.indexOf('<aside>'),html.indexOf('</aside>'));
 assert.ok(aside.indexOf('id="primary"')<aside.indexOf('id="patientControls"'),'primary dialysis mode precedes patient inputs');
 const concentration=html.slice(html.indexOf('<section id="concentration">'),html.indexOf('<section id="clearance"'));
 assert.match(concentration,/<details class="card" id="tablePanel">[\s\S]*id="resultTable"/);
 assert.doesNotMatch(html,/<section id="table"/);
 const research=html.slice(html.indexOf('<section id="research"'),html.indexOf('id="status"'));
 assert.ok(research.lastIndexOf('<div class="card')===research.indexOf('<div class="card source-library" id="referenceLibraryPanel">'),'reference library is the last research card');
 // Graph colors live in settings, not the header; the comparison table is the last Concentration panel.
 assert.doesNotMatch(html.slice(html.indexOf('<header'),html.indexOf('</header>')),/colorblind|<input/i);
 assert.match(read('public/assets/simulator-ui.js'),/<label for="colorPalette">Graph colors<\/label>/);
 assert.ok(read('public/explore/index.html').includes('id="graphColors"'));
 assert.match(concentration,/<\/details>\s*<\/section>\s*$/,'comparison table is at the bottom of Concentration');
 assert.ok(concentration.indexOf('id="tablePanel"')>concentration.indexOf('id="csfCmmgChart"'));
 // The safety notice stays, in plain language, with a link to the limitations.
 assert.match(html,/<div class="notice"><strong>Educational simulation only\.<\/strong>[^<]*Do not use for prescribing, toxicity assessment, or dialysis decisions\. <a href="\/disclaimer\/">/);
 for(const id of ['undoImport','importHistoryList','presetSwitch','presetHD','oralIVPreset'])assert.ok(html.includes('id="'+id+'"'),id);
});

test('imports snapshot the replaced settings before applying, and restores are undoable',()=>{
 const ui=read('public/assets/simulator-ui.js');
 const commit=ui.indexOf("rememberVersion('Before importing '+file.name);");
 assert.ok(commit>0);
 // Snapshot happens after every validation step and immediately before the single apply call.
 // All validation lives in parseConfiguration, which the import calls before the snapshot.
 assert.ok(ui.indexOf('parseConfiguration(input);\n  rememberVersion(')>0);
 assert.ok(ui.slice(ui.indexOf('function parseConfiguration'),ui.indexOf('// ---------- Shareable links')).includes('Configuration fails model validation'));
 assert.match(ui.slice(commit,commit+220),/applyVersion\(\{config:next,primary:input\.primary,visible:input\.visibleScenarios,palette:importedPalette,unit:concUnit\}\);/);
 const restore=ui.slice(ui.indexOf('function restoreVersion'),ui.indexOf('function renderImportHistory'));
 assert.ok(restore.indexOf('rememberVersion(')<restore.indexOf('applyVersion('),'restoring first saves the current settings');
 assert.match(ui,/IMPORT_HISTORY_LIMIT=10/);
 const history=ui.slice(ui.indexOf('const importHistory=[]'),ui.indexOf("$('downloadMigrated')"));
 assert.doesNotMatch(history,/localStorage|sessionStorage|indexedDB|fetch\(/,'history must stay in memory');
 // File names are user-controlled: they are rendered as text, never as markup.
 assert.doesNotMatch(history,/innerHTML/);
});
