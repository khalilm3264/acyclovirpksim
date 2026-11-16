'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../public/assets/simulator-ui.js'),'utf8');
const section=source.slice(source.indexOf('function requestPlotFrame('),source.indexOf('function drawNextPlot('));
function harness(){
 const children=[],loads=[],alerts={textContent:'',append(...items){children.push(...items);}};
 const state={pendingPlots:new Map([['plasmaChart',{}]]),plotFrame:0,plotRunning:false,chartWait:null,window:{AyFluxCharts:{ensure(){return new Promise((resolve,reject)=>loads.push({resolve,reject}));}}},$:()=>alerts,chartMessage(){},alertMessage(message){alerts.textContent=message;children.length=0;},document:{createElement:()=>({addEventListener(type,handler){this[type]=handler;}})},render(){},requestAnimationFrame(){throw Error('No chart should be drawn while offscreen');}};
 vm.createContext(state);vm.runInContext(section,state);
 return {state,loads,alerts,children,run:code=>vm.runInContext(code,state)};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('Retry charts starts one shared renderer download even with no queued visible charts',async()=>{
 const h=harness();h.run('requestPlotFrame()');h.loads[0].reject(Error('network'));await flush();
 assert.equal(h.state.pendingPlots.size,0);
 const retry=h.children.find(x=>x.textContent==='Retry charts');assert.ok(retry);
 retry.click();retry.click();
 assert.equal(h.loads.length,2,'retry must fetch without needing a nearby chart');
 assert.match(h.alerts.textContent,/Loading interactive charts/);
 h.state.window.echarts={init(){}};h.loads[1].resolve();await flush();
 assert.equal(h.alerts.textContent,'');
});
test('failed offscreen retry offers another attempt and success preserves newer validation messages',async()=>{
 const h=harness();h.run('requestPlotFrame()');h.loads[0].reject(Error('network'));await flush();
 h.children.find(x=>x.textContent==='Retry charts').click();
 assert.equal(h.loads.length,2);
 h.loads[1].reject(Error('still offline'));await flush();
 assert.match(h.alerts.textContent,/Unable to load/);
 h.children.find(x=>x.textContent==='Retry charts').click();assert.equal(h.loads.length,3);
 h.alerts.textContent='Please correct input(s): invalid settings';
 h.state.window.echarts={init(){}};h.loads[2].resolve();await flush();
 assert.match(h.alerts.textContent,/invalid settings/);
});
test('retry after another chart has loaded the renderer does not leave a loading notice',async()=>{
 const h=harness();h.run('requestPlotFrame()');h.loads[0].reject(Error('network'));await flush();
 h.state.window.echarts={init(){}};
 h.children.find(x=>x.textContent==='Retry charts').click();
 assert.equal(h.loads.length,1,'reuse the available renderer');assert.equal(h.alerts.textContent,'');
});
