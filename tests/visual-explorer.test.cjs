'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const pk=require('../public/assets/pk-engine.js'),m=require('../public/explore/model.js');
test('mass accounting closes at every sample across routes and dialysis modes',()=>{
 for(const route of pk.ROUTES)for(const mode of pk.MODES){
  const c=m.config({...pk.DEFAULTS,route,horizon:72,crcl:0,hdStart:4,schedule:[{type:'PD',start:0,end:5},{type:'HD',start:8,end:12}]});
  const result=m.run(c,mode,true);
  for(const a of result.accounting){assert.ok(Math.abs(a.residual)<Math.max(.001,a.input*1e-7),mode+': '+a.residual);assert.equal(a.parts.kidney,0);for(const v of Object.values(a.parts))assert.ok(v>=-1e-9);}
 }
});
test('accounting is opt-in and does not alter concentration predictions',()=>{
 const c=m.config(pk.DEFAULTS),a=m.run(c,'Intermittent HD'),b=m.run(c,'Intermittent HD',true);
 assert.equal(a.accounting,undefined);assert.deepEqual(a.cols,b.cols);assert.deepEqual(a.summary,b.summary);
});
test('zero input yields zero accounting; oral input is bioavailable ACV equivalent',()=>{
 const zero=m.run(m.config({...pk.DEFAULTS,dose:0,horizon:8}),'No dialysis',true);assert.equal(zero.accounting.at(-1).input,0);
 const oral=m.run(m.config({...pk.DEFAULTS,route:'Valacyclovir oral',dose:1000,doseCount:1,horizon:8}),'No dialysis',true);
 assert.ok(Math.abs(oral.accounting.at(-1).input-1000*225.21/324.34*.545)<1e-8);
});
test('surface cells reproduce individual simulations with correct units',()=>{
 const p=m.plan({config:pk.DEFAULTS,mode:'Intermittent HD',xKey:'crcl',yKey:'hdDuration',metric:'auc',xMin:0,xMax:140,yMin:1,yMax:8,count:7});
 const cell=m.cell(p,3,2);const expected=m.run({...p.config,crcl:p.xs[3],hdDuration:p.ys[2]},p.mode);assert.equal(cell.summary.auc,expected.summary.auc);
 assert.equal(m.metrics.auc.unit,'mg·h/L');
});
test('reject misleading axes, unsupported dose sweeps and invalid grids',()=>{
 const q={config:pk.DEFAULTS,mode:'No dialysis',xKey:'crcl',yKey:'weight',metric:'auc',xMin:0,xMax:140,yMin:40,yMax:120,count:7};
 assert.throws(()=>m.plan({...q,yKey:'crcl'}));assert.throws(()=>m.plan({...q,xMin:NaN}));assert.throws(()=>m.plan({...q,count:100}));assert.throws(()=>m.plan({...q,yKey:'hdDuration',yMin:1,yMax:8}));
 assert.throws(()=>m.plan({...q,config:{...pk.DEFAULTS,dosingMode:'custom'},yKey:'dose',yMin:1,yMax:1000}));
 assert.throws(()=>m.plan({...q,config:{...pk.DEFAULTS,renalMode:'profile'}}));
});
test('dynamic renal and custom mixed doses retain mass balance',()=>{
 const c=m.config({...pk.DEFAULTS,dosingMode:'custom',renalMode:'profile',horizon:96});
 const r=m.run(c,'Custom sequence',true);for(const a of r.accounting)assert.ok(Math.abs(a.residual)<Math.max(.001,a.input*1e-7));
});

test('per-exchange removal separates completed dwells from early session termination',()=>{
 const pk=require('../public/assets/pk-engine.js'),m=require('../public/explore/model.js');
 const c=m.config({...pk.DEFAULTS,horizon:24,capdDwell:6,capdExchanges:4,pdMethod:'manual',schedule:[{type:'PD',start:0,end:9}]});
 const raw=m.run(c,'Custom sequence',true);
 assert.deepEqual(raw.drains.map(d=>[d.start,d.end,d.complete]),[[0,6,true],[6,9,false]]);
 assert.ok(raw.drains[0].mass>0);
 assert.ok(Math.abs(raw.drains.reduce((a,d)=>a+d.mass,0)-raw.accounting.at(-1).parts.pdDrained)<1e-9);
});

test('comparison maps and sampled distributions reproduce scenario outputs',()=>{
 const pk=require('../public/assets/pk-engine.js'),model=require('../public/explore/model.js');
 const fs=require('node:fs'),vm=require('node:vm'),self={RenalPKV7:pk,AyFluxExplore:model};
 vm.runInNewContext(fs.readFileSync(require.resolve('../public/explore/analysis.js'),'utf8'),{self});
 const a=self.AyFluxAnalysis,c=model.config({...pk.DEFAULTS,horizon:12,doseCount:1});
 const grid={config:c,xKey:'crcl',yKey:'weight',xs:[50],ys:[70],metric:'auc',z:[[model.run({...c,crcl:50,weight:70},'No dialysis').summary.auc]]};
 assert.equal(a.difference({grid,reference:'No dialysis'})[0][0],0);
 const t=a.timeMap({config:c});assert.equal(t.data[0][2],0);
 const p=model.run({...c,hdStart:t.starts[0]},'Intermittent HD');
 assert.equal(t.data[48][2],p.cols.plasma.at(-1));
 const draws=a.ensemble({config:c,mode:'No dialysis',modes:['No dialysis'],hour:12});
 assert.equal(draws.points[0][3],draws.groups[0].values[0]);
 assert.equal(draws.points[0][3],pk.simulate(c,'No dialysis').plasma.median.at(-1));
});
