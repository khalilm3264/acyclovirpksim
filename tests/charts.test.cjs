'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('ECharts loader executes on demand, and concurrent calls share one load',async()=>{
 const scripts=[],window={};
 const document={
  createElement(tag){assert.equal(tag,'script');return {src:'',async:false,onload:null,onerror:null};},
  head:{appendChild(node){scripts.push(node);}}
 };
 vm.runInNewContext(read('public/assets/charts.js'),{window,document,setTimeout,clearTimeout});
 assert.equal(scripts.length,0,'loader initialization must not insert a script');
 const first=window.AyFluxCharts.ensure();
 const second=window.AyFluxCharts.ensure();
 assert.equal(scripts.length,1,'only one ECharts request should be inserted');
 assert.equal(scripts[0].src,'/assets/vendor/echarts-6.1.0.min.js');
 assert.equal(scripts[0].async,true);
 window.echarts={init:()=>{}};
 scripts[0].onload();
 const both=await Promise.all([first,second]);
 assert.equal(both[0],window.echarts);
 assert.equal(both[1],window.echarts);
 await window.AyFluxCharts.ensure();
 assert.equal(scripts.length,1,'subsequent chart requests should reuse loaded ECharts');
});

test('a failed dynamic ECharts load can be retried without blocking Lite',async()=>{
 const scripts=[],window={};
 const document={createElement(){return {src:'',onload:null,onerror:null};},head:{appendChild(node){scripts.push(node);}}};
 vm.runInNewContext(read('public/assets/charts.js'),{window,document,setTimeout,clearTimeout});
 const first=window.AyFluxCharts.ensure();
 scripts[0].onerror();
 await assert.rejects(first,/could not be loaded/);
 const next=window.AyFluxCharts.ensure();
 assert.equal(scripts.length,2);
 assert.equal(scripts[1].src,'/assets/vendor/echarts-6.1.0.min.js?retry=1','retry must bypass a cached failed preload');
 window.echarts={init:()=>{}};
 scripts[1].onload();
 await next;
});

test('simulator preloads its renderer while execution and research tools remain asynchronous',()=>{
 const html=read('public/index.html');
 const ui=read('public/assets/simulator-ui.js');
 const research=read('public/assets/research-workspace.js');
 const sw=read('public/sw.js');
 assert.match(html,/src="\.\/assets\/charts\.js"/);
 assert.doesNotMatch(html,/<script[^>]+src="\.\/assets\/vendor\/echarts-[56]/);
 assert.match(html,/<link rel="preload" href="\/assets\/vendor\/echarts-6\.1\.0\.min\.js" as="script" fetchpriority="high">/);
 assert.doesNotMatch(html,/<link[^>]+(?:preload|prefetch)[^>]+echarts-gl/);
 assert.doesNotMatch(read('public/lite/index.html'),/<link[^>]+(?:preload|prefetch)[^>]+echarts/);
 assert.match(ui,/Retry charts/);
 assert.match(ui,/chartWait=window\.AyFluxCharts\.ensure\(\)/);
 assert.match(research,/await window\.AyFluxCharts\.ensure\(\)/);
 assert.ok(sw.includes('"/assets/charts.js"'));
 // The heavyweight library is stored on first use, rather than precached.
 const precache=sw.slice(sw.indexOf('const CORE = ['),sw.indexOf('];')+2);
 assert.doesNotMatch(precache,/echarts-[56]/);
 assert.match(sw,/\["\/assets\/vendor\/echarts-6\.1\.0\.min\.js"/);
});
