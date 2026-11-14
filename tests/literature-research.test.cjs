'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const pk=require('../public/assets/pk-engine.js'),literature=require('../public/assets/literature-cases.js');
test('literature exports pass the actual configuration importer',()=>{
 const ui=fs.readFileSync(require.resolve('../public/assets/simulator-ui.js'),'utf8');
 const start=ui.indexOf('function parseConfiguration('),end=ui.indexOf('// ---------- Shareable links',start);
 const context={E:pk,structuredClone,DEFS:{},Date};
 vm.createContext(context);vm.runInContext(ui.slice(start,end)+';this.parse=parseConfiguration;',context);
 for(const study of literature.cases()){
  const data=literature.configuration(study.id),parsed=context.parse(data);
  assert.equal(parsed.primary,study.mode);
  assert.equal(parsed.next.variability,0);
  assert.deepEqual(parsed.next.observations,[]);
 }
});
test('Smith fifth-interval AUCs use analyte units and changing only CSF transport leaves systemic exposure unchanged',()=>{
 for(const id of ['smith-normal','smith-ckd']){
  const a=literature.runCase(id),fine=literature.runCase(id,1/16);
  assert.ok(Math.abs(a.auc-fine.auc)/fine.auc<.005);
  assert.ok(Math.abs(a.alternativeAuc/a.auc-10)<1e-9); // previous default 0.25 vs current 0.025
  assert.ok(a.study.observedAuc>0);
 }
 const normal=literature.runCase('smith-normal'),ckd=literature.runCase('smith-ckd');
 assert.equal(normal.study.observedAuc,.42*.23919);
 assert.ok(Math.abs(ckd.study.observedAuc-3.8*.23919)<1e-12);
 const c=normal.study.config;
 const a=pk.single(c,pk.drawParams(c)[0],[],.125);
 const other={...c,csfMetRatio:.25},b=pk.single(other,pk.drawParams(other)[0],[],.125);
 assert.deepEqual(a.cols.plasma,b.cols.plasma);assert.deepEqual(a.cols.cmmg,b.cols.cmmg);
});
test('Laskin overlay uses only the two calibration inputs on the fixed anuric case',()=>{
 const nominal=literature.runCase('laskin');
 assert.equal(nominal.alternative,undefined);
 const scales={vcScale:.8,clearanceScale:1.3};
 const result=literature.runCase('laskin',.125,{...scales,crcl:120,dose:999});
 const study={...nominal.study.config,...scales};
 const expected=pk.single(study,pk.drawParams(study)[0],[],.125);
 assert.deepEqual(result.alternative,expected.cols.plasma);
 assert.deepEqual(result.values,nominal.values);
 assert.notDeepEqual(result.alternative,result.values);
});
test('research worker returns the same summaries and handles errors',()=>{
 const messages=[],self={RenalPKV7:pk,AyFluxLiterature:literature,postMessage:x=>messages.push(x)};
 vm.runInNewContext(fs.readFileSync(require.resolve('../public/assets/research-worker.js'),'utf8'),{self,importScripts(){},performance});
 const config=literature.cases()[0].config;
 self.onmessage({data:{id:3,config,mode:'No dialysis'}});
 assert.deepEqual(messages[0].data,pk.simulate(config,'No dialysis').summary);
 self.onmessage({data:{id:4,action:'case',caseId:'missing'}});
 assert.equal(messages[1].id,4);assert.match(messages[1].error,/Unknown/);
});
test('unfinished PD dwell retains cavity mass and an interrupted dwell drains once when HD starts',()=>{
 const base={...pk.DEFAULTS,draws:1,variability:0,doseCount:1,dose:175,crcl:0,trackMassBalance:true,capdDwell:6};
 function simulate(horizon,schedule){
  const c={...base,horizon,schedule};
  return pk.single(c,pk.drawParams(c)[0],pk.scheduleFor('Custom sequence',c),.125);
 }
 const partial=simulate(3,[{type:'PD',start:0,end:6}]);
 assert.ok(partial.summary.endPdFluidMg>0);
 assert.equal(partial.drains.length,0);
 assert.ok(Math.abs(partial.summary.massBalanceErrorMg)<1e-6);
 const interrupted=simulate(8,[{type:'PD',start:0,end:3},{type:'HD',start:3,end:7}]);
 assert.equal(interrupted.drains.length,1);
 assert.equal(interrupted.drains[0].end,3);
 assert.equal(interrupted.drains[0].complete,false);
 assert.ok(interrupted.drains[0].mass>0);
 assert.equal(interrupted.summary.endPdFluidMg,0);
 assert.ok(Math.abs(interrupted.summary.massBalanceErrorMg)<1e-6);
 const complete=simulate(6,[{type:'PD',start:0,end:6}]);
 assert.equal(complete.drains.length,1);assert.equal(complete.drains[0].complete,true);
});
