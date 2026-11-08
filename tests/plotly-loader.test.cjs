'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('Plotly is not downloaded until an actual chart requests it, and concurrent calls share one load',async()=>{
 const scripts=[],window={};
 const document={
  createElement(tag){assert.equal(tag,'script');return {src:'',async:false,onload:null,onerror:null};},
  head:{appendChild(node){scripts.push(node);}}
 };
 vm.runInNewContext(read('public/assets/plotly-loader.js'),{window,document});
 assert.equal(scripts.length,0,'initial page load must not request Plotly');
 const first=window.AyFluxPlotly.ensure();
 const second=window.AyFluxPlotly.ensure();
 assert.equal(scripts.length,1,'only one Plotly request should be inserted');
 assert.equal(scripts[0].src,'/assets/vendor/plotly-basic-3.3.1.min.js');
 assert.equal(scripts[0].async,true);
 window.Plotly={react:()=>{}};
 scripts[0].onload();
 const both=await Promise.all([first,second]);
 assert.equal(both[0],window.Plotly);
 assert.equal(both[1],window.Plotly);
 await window.AyFluxPlotly.ensure();
 assert.equal(scripts.length,1,'subsequent chart requests should reuse loaded Plotly');
});

test('a failed dynamic Plotly load can be retried without blocking Lite',async()=>{
 const scripts=[],window={};
 const document={createElement(){return {src:'',onload:null,onerror:null};},head:{appendChild(node){scripts.push(node);}}};
 vm.runInNewContext(read('public/assets/plotly-loader.js'),{window,document});
 const first=window.AyFluxPlotly.ensure();
 scripts[0].onerror();
 await assert.rejects(first,/could not be loaded/);
 const next=window.AyFluxPlotly.ensure();
 assert.equal(scripts.length,2);
 window.Plotly={react:()=>{}};
 scripts[1].onload();
 await next;
});

test('full site charts and research tools request Plotly only when used',()=>{
 const html=read('public/index.html');
 const ui=read('public/assets/simulator-ui.js');
 const research=read('public/assets/research-workspace.js');
 const sw=read('public/sw.js');
 assert.match(html,/src="\.\/assets\/plotly-loader\.js"/);
 assert.doesNotMatch(html,/<script[^>]+src="\.\/assets\/vendor\/plotly-basic/);
 assert.match(ui,/plotlyWait=window\.AyFluxPlotly\.ensure\(\)/);
 assert.match(research,/await window\.AyFluxPlotly\.ensure\(\)/);
 assert.ok(sw.includes('"/assets/plotly-loader.js"'));
 // The heavyweight library is stored on first use, rather than precached.
 const precache=sw.slice(sw.indexOf('const CORE = ['),sw.indexOf('];')+2);
 assert.doesNotMatch(precache,/plotly-basic/);
 assert.match(sw,/\["\/assets\/vendor\/plotly-basic-3\.3\.1\.min\.js"/);
});
