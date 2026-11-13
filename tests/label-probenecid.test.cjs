'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const E=require('../public/assets/pk-engine.js');
const ui=fs.readFileSync(path.join(__dirname,'../public/assets/simulator-ui.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');

test('label renal adjustment follows the four US acyclovir injection label bands',()=>{
 const cases=[[120,1,8],[50.1,1,8],[50,1,12],[25,1,12],[24.9,1,24],[10,1,24],[9.9,.5,24],[0,.5,24]];
 for(const [crcl,fraction,every] of cases){const t=E.labelRenalAdjustment(crcl);assert.equal(t.fraction,fraction,'CrCl '+crcl);assert.equal(t.every,every,'CrCl '+crcl);}
 assert.equal(E.labelRenalAdjustment(-1),null);assert.equal(E.labelRenalAdjustment(NaN),null);
});

test('probenecid lowers only renal acyclovir clearance and is off by default',()=>{
 assert.equal(E.DEFAULTS.probenecid,false);
 const base={...E.DEFAULTS,crcl:95,variability:0,draws:1};
 const off=E.drawParams(E.effectiveConfig(base))[0],on=E.drawParams(E.effectiveConfig({...base,probenecid:true}))[0];
 assert.ok(Math.abs(on.renal/off.renal-0.68)<1e-12);
 for(const key of ['other','form','mr','mn','q','vc','vp'])assert.equal(on[key],off[key],key);
 assert.deepEqual(E.validate({...base,probenecid:'yes'},'No dialysis').filter(e=>/robenecid/.test(e)),['Probenecid must be on or off']);
 assert.deepEqual(E.validate({...base,probenecid:true},'No dialysis'),[]);
 // Laskin 1982 reported a 40% rise in AUC with probenecid; the 32% renal reduction alone gives a rise of that order.
 const auc=probe=>{const r=E.simulateMany({...E.DEFAULTS,weight:79.1,crcl:98,crclSource:'manual',dose:395.5,doseCount:1,every:24,horizon:48,variability:0,draws:1,probenecid:probe,requestedModes:['No dialysis'],observations:[]})['No dialysis'];
  let s=0;for(let i=1;i<r.time.length;i++)s+=(r.time[i]-r.time[i-1])*(r.plasma.median[i]+r.plasma.median[i-1])/2;return s;};
 const rise=auc(true)/auc(false)-1;assert.ok(rise>0.3&&rise<0.5,'AUC rise '+rise);
});

test('interface wires the label button and probenecid option, citing sources on the page',()=>{
 assert.match(ui,/id="labelAdjust"/);assert.match(ui,/id="probenecid"/);
 assert.match(ui,/function defer\(\)\{refreshLabelAdjust\(\);/);
 assert.match(ui,/rememberVersion\('Before label kidney adjustment'\)/);
 assert.match(ui,/if\(c\.every!==8\)return \{ok:false/,'idempotent: only adjusts an every-8-hour regimen');
 assert.match(html,/<li id="ref10">/);assert.match(html,/<li id="ref41">/);
});
