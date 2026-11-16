'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../public/explore/view.js'),'utf8');
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
function harness(){
 const renderer=deferred(),calculation=deferred(),events=[],elements={},status={};
 const state={request:0,raw:null,window:{AyFluxExplorerFigures:{setRaw(){}}},
  $:id=>elements[id]||(elements[id]={replaceChildren(){}}),text:(id,s)=>status[id]=s,
  charts:{dispose(){},ensure(){events.push('renderer');return renderer.promise;}},
  compute(){events.push('calculation');state.request++;return calculation.promise;},
  drawCurve(){events.push('draw');},drawTrajectory(){},drawSankey(){},fmt:String};
 vm.createContext(state);vm.runInContext(source.slice(source.indexOf('async function showScenario('),source.indexOf("$('baseline').onclick=")),state);
 return {state,renderer,calculation,events,elements,status};
}
const result={t:[0,1],summary:{peak:1,auc:2}};
test('explorer starts renderer before waiting for simulation and draws only after both finish',async()=>{
 const h=harness(),done=h.state.showScenario({horizon:1},'HD','Example');
 assert.deepEqual(h.events,['renderer','calculation']);
 h.calculation.resolve(result);await Promise.resolve();assert.ok(!h.events.includes('draw'));
 h.renderer.resolve();await done;assert.deepEqual(h.events,['renderer','calculation','draw']);assert.equal(h.elements.time.disabled,false);
});
test('early renderer failure is handled while simulation is pending',async()=>{
 const h=harness(),done=h.state.showScenario({horizon:1},'HD','Example');
 h.renderer.reject(Error('offline'));await new Promise(setImmediate);
 h.calculation.resolve(result);await done;assert.equal(h.status.curveStatus,'offline');assert.ok(!h.events.includes('draw'));
});
test('obsolete renderer failure cannot overwrite a newer scenario or cancellation status',async()=>{
 const h=harness(),done=h.state.showScenario({horizon:1},'HD','Example');
 h.calculation.resolve(result);await Promise.resolve();
 h.state.request++;h.status.curveStatus='Newer scenario';h.renderer.reject(Error('old error'));
 await done;assert.equal(h.status.curveStatus,'Newer scenario');assert.ok(!h.events.includes('draw'));
});
test('cancelled calculation never draws when its renderer later loads',async()=>{
 const h=harness(),done=h.state.showScenario({horizon:1},'HD','Example');
 h.state.request++;h.renderer.resolve();h.calculation.resolve(result);await done;
 assert.ok(!h.events.includes('draw'));assert.equal(h.elements.time.disabled,true);
});
