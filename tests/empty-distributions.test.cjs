'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const box=require('../public/assets/analysis-views.js');
test('empty distributions do not produce zero-valued boxplots or violin geometry',()=>{
 assert.equal(box.quantile([],0.5),null);
 for(const kind of ['box','violin']){
  const option=box.ensembleOption({groups:[{name:'Missing',values:[]},{name:'Invalid',values:[NaN]}]},kind);
  assert.equal(option.xAxis.data.length,0);assert.equal(option.series[0].data.length,0);
 }
});
test('genuine zero and nonempty distributions keep their plotted values and labels',()=>{
 const result={groups:[{name:'Missing',values:[]},{name:'Zero dose',values:[0,0,0]},{name:'Active',values:[1,2,3]}]};
 const option=box.ensembleOption(result,'box');
 assert.deepEqual(Array.from(option.xAxis.data),['Zero dose','Active']);
 assert.deepEqual(Array.from(option.series[0].data[0]),[0,0,0,0,0]);
 assert.deepEqual(Array.from(option.series[0].data[1]),[1,1.5,2,2.5,3]);
 const violin=box.ensembleOption(result,'violin');assert.equal(violin.series[0].data.length,2);
 const api={value:()=>0,size:()=>[10,0],coord:([x,y])=>[x,y]};
 assert.equal(violin.series[0].renderItem({},api).type,'line');
});
