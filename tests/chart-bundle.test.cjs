'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const vm=require('node:vm');
const {gzipSync}=require('node:zlib');
const {buildSync}=require('esbuild');

test('compact browser bundle preserves SVG charts, annotations and exports within its download budget',()=>{
 const {outputFiles}=buildSync({entryPoints:[path.resolve(__dirname,'../scripts/echarts-entry.mjs')],bundle:true,minify:true,format:'iife',globalName:'echarts',platform:'browser',target:['es2019'],legalComments:'eof',write:false});
 assert.ok(gzipSync(outputFiles[0].contents).length<300000,'Keep the compressed renderer below 300 kB');
 const context={console,setTimeout,clearTimeout};
 vm.runInNewContext(outputFiles[0].text,context);
 const chart=context.echarts.init(null,null,{renderer:'svg',ssr:true,width:600,height:300});
 try{
  chart.setOption({xAxis:{type:'value'},yAxis:{type:'value'},dataZoom:[{type:'inside'}],series:[
   {type:'line',data:[[0,1],[1,2]],markLine:{data:[{yAxis:1.5}]},markArea:{data:[[{xAxis:0},{xAxis:0.5}]]}},
   {type:'scatter',data:[[0.5,1.5]]}
  ]});
  const svg=chart.renderToSVGString();
  assert.match(svg,/<svg/);
  assert.match(svg,/<path/);
  assert.match(svg,/1\.5/,'annotation labels survive the modular build');
  assert.equal(chart.getOption().series.length,2);
 }finally{chart.dispose();}
});
