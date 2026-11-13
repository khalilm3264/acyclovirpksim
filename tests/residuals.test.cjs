'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const S=require('../public/assets/study-library.js');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

test('peak and trough labels exist only where the source labels the sample, aligned with every point',()=>{
 const labelled=new Set();
 for(const study of S.STUDIES){
  const kinds=S.kindsOf(study);
  assert.equal(kinds.length,S.pointsOf(study).length,study.id);
  assert.ok(kinds.every(k=>k===null||k==='peak'||k==='trough'),study.id);
  if(kinds.some(Boolean))labelled.add(study.id);
 }
 assert.deepEqual([...labelled].sort(),['boelaert-1','boelaert-4','boelaert-5','kacirova','label-10','label-5']);
 assert.deepEqual(S.kindsOf(S.find('label-5')),['peak','trough']);
 assert.deepEqual(S.kindsOf(S.find('kacirova')),['trough',null,'trough',null],'the 25-minute sample is not called a peak');
 assert.equal(S.find('boelaert-1').sampleKindSource,'author-fitted');
 // Each study note must describe the labels it carries.
 for(const id of ['label-5','label-10'])assert.match(S.find(id).note,/peak and trough/);
 assert.match(S.find('kacirova').note,/measured trough/);
 for(const id of ['boelaert-1','boelaert-4','boelaert-5'])assert.match(S.find(id).note,/peaks and troughs the authors derived/);
});

test('residuals are predicted ÷ observed with per-study direction, median and peak/trough lists',()=>{
 const scores=[
  {id:'label-5',rows:[{analyte:'plasma',time:73,observed:10,predicted:9},{analyte:'plasma',time:80,observed:1,predicted:0.5}]},
  {id:'boelaert-1',rows:[1,24,97,120].map((time,i)=>({analyte:'plasma',time,observed:1,predicted:[1.2,1.5,0.9,1.1][i]}))},
  {id:'laskin-anuric',rows:[1,8,24].map((time,i)=>({analyte:'plasma',time,observed:2,predicted:[3,2,1][i]}))}
 ];
 const r=S.residuals(scores);
 assert.equal(r.points.length,9);
 assert.deepEqual(r.points.slice(0,2).map(p=>[p.ratio,p.kind,p.kindSource]),[[0.9,'peak','reported'],[0.5,'trough','reported']]);
 const [label,boelaert,laskin]=r.studies;
 assert.equal(label.direction,'below');assert.equal(boelaert.direction,'mixed');assert.equal(laskin.direction,'mixed');
 assert.equal(label.median,Math.sqrt(0.9*0.5),'even count: geometric mean of the two middle ratios');
 assert.equal(laskin.median,1);assert.equal(laskin.min,0.5);assert.equal(laskin.max,1.5);
 assert.deepEqual(boelaert.peaks.map(p=>p.time),[1,97]);assert.deepEqual(boelaert.troughs.map(p=>p.time),[24,120]);
 assert.ok(boelaert.peaks.every(p=>p.kindSource==='author-fitted'));
 assert.deepEqual(laskin.peaks,[]);assert.deepEqual(laskin.troughs,[]);
 assert.deepEqual(r.points.filter(p=>p.study==='laskin-anuric').map(p=>p.index),[2,2,2]);
});

test('the residuals view is on the scorecard card with a line at 1 and labelled markers',()=>{
 const html=read('public/index.html'),ui=read('public/assets/simulator-ui.js');
 assert.ok(html.indexOf('id="residualFigure"')>html.indexOf('id="scorecardFigure"'));
 assert.match(html,/predicted ÷ observed = 1/);
 assert.match(ui,/guide\('Predicted = observed \(1\)',1,'solid',2\)/);
 assert.match(ui,/symbolRotate:p\.kind==='trough'\?180:0/);
 assert.match(ui,/drawResidualFigure\(\);\n\}/,'drawn after the scorecard figure');
});

test('the scorecard CSV is unchanged by the peak and trough labels',()=>{
 const scores=[{id:'label-5',rows:[{analyte:'plasma',time:73,observed:9.8,predicted:9,lower:8,upper:10,inside:true}]}];
 const head=S.csv(scores).split('\n')[0];
 assert.equal(head,'study_id,citation,analyte,time_h,observed_mg_L,predicted_nominal_mg_L,interval_lower_mg_L,interval_upper_mg_L,inside_interval,point_type,central_volume_multiplier,clearance_multiplier');
});
