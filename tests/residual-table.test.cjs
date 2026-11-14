'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const S=require('../public/assets/study-library.js');

test('per-study residual summary: ratio, median, direction and reported peaks and troughs',()=>{
 const scores=[
  {id:'label-5',rows:[{analyte:'plasma',time:73,kind:'peak',observed:10,predicted:9},{analyte:'plasma',time:80,kind:'trough',observed:1,predicted:0.5}]},
  {id:'boelaert-1',rows:[1,24,97,120].map((time,i)=>({analyte:'plasma',time,kind:['peak','trough','peak','trough'][i],observed:1,predicted:[1.2,1.5,0.9,1.1][i]}))},
  {id:'laskin-anuric',rows:[1,8,24].map((time,i)=>({analyte:'plasma',time,kind:'serial',observed:2,predicted:[3,2,1][i]}))},
  {id:'kacirova',rows:[{analyte:'plasma',time:64,kind:'trough',observed:2,predicted:1},{analyte:'cmmg',time:64,kind:'trough',observed:1,predicted:0.5}]}
 ];
 const [label,boelaert,laskin,kacirova]=S.residualsByStudy(scores);
 assert.equal(label.direction,'below');assert.equal(label.median,Math.sqrt(0.9*0.5),'even count: geometric mean of the two middle ratios');
 assert.deepEqual(label.peaks.map(r=>r.ratio),[0.9]);assert.deepEqual(label.troughs.map(r=>r.ratio),[0.5]);
 assert.equal(boelaert.direction,'mixed');assert.deepEqual(boelaert.peaks.map(r=>r.time),[1,97]);assert.deepEqual(boelaert.troughs.map(r=>r.time),[24,120]);
 assert.equal(laskin.median,1);assert.equal(laskin.min,0.5);assert.equal(laskin.max,1.5);assert.deepEqual(laskin.peaks,[]);assert.deepEqual(laskin.troughs,[]);
 assert.deepEqual(kacirova.troughs.map(r=>r.analyte),['plasma','cmmg']);
 // Author-fitted comes from the study's recorded provenance, not a hard-coded list.
 assert.equal(boelaert.fitted,true);assert.equal(label.fitted,false);assert.equal(kacirova.fitted,false);
});

test('the per-study table sits under the residuals figure and is filled with the figure',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8'),ui=fs.readFileSync(path.join(__dirname,'../public/assets/simulator-ui.js'),'utf8');
 assert.ok(html.indexOf('id="residualRows"')>html.indexOf('id="residualFigure"'));
 assert.match(ui,/async function drawResidualFigure\(\)\{\n renderResidualTable\(\);/);
});
