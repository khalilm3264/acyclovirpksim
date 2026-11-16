'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');

test('failed duplicate download reuses a renderer that became available while it was pending',async()=>{
 const window={},scripts=[];
 const document={createElement:()=>({remove(){}}),head:{appendChild:script=>scripts.push(script)}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../public/assets/charts.js'),'utf8'),{window,document,setTimeout,clearTimeout});
 const ensure=window.AyFluxCharts.ensure,first=ensure();
 scripts[0].onerror();await assert.rejects(first,/could not be loaded/);
 const retry=ensure(),concurrent=ensure();assert.equal(retry,concurrent);
 const renderer={init(){},registry:{liveChart:{}}};
 window.echarts=renderer; // An earlier request has finally supplied a usable module.
 scripts[1].onerror();
 assert.equal(await retry,renderer);assert.equal(await concurrent,renderer);
 assert.equal(await ensure(),renderer);assert.equal(scripts.length,2);
 assert.equal(window.echarts.registry,renderer.registry);
});
