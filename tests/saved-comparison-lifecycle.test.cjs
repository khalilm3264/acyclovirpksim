'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../public/assets/simulator-ui.js'),'utf8');
const section=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
function baselineHarness(){
 const elements={};const $=id=>elements[id]||(elements[id]={textContent:'',classList:{toggle(){}},replaceChildren(){},append(){},addEventListener(type,fn){this[type]=fn;}});
 const state={$,baseline:{primary:'No dialysis',config:{},data:{summary:Object.fromEntries(["peak","auc","csfPeak","mPeak","mass"].map(key=>[key,{median:1}]))}},baselineRevision:0,c:{},primary:'CRRT',results:{},dataIsCurrent:false,baselineChanges:()=>[],document:{createElement:()=>({})},render(){},shown:x=>x,unitText:x=>x};
 vm.createContext(state);vm.runInContext(section('function renderBaseline(', 'function showStats('),state);
 return {state,$,run:s=>vm.runInContext(s,state)};
}
test('baseline details remain available but stale current deltas are withheld during recalculation',()=>{
 const h=baselineHarness();assert.doesNotThrow(()=>h.run('renderBaseline()'));
 assert.match(h.$('baselineStatus').textContent,/Frozen baseline/);assert.equal(h.$('baselineDelta').textContent,'');
});
test('clearing a baseline updates its controls immediately while results are stale',()=>{
 const h=baselineHarness();h.$('baselineStatus').textContent='Frozen baseline: No dialysis';h.$('baselineDelta').textContent='obsolete delta';
 h.$('clearBaseline').click();
 assert.equal(h.state.baseline,null);assert.equal(h.$('clearBaseline').disabled,true);
 assert.doesNotMatch(h.$('baselineStatus').textContent,/Frozen baseline/);assert.equal(h.$('baselineDelta').textContent,'');
});
test('queued chart options cannot resurrect a removed comparison after renderer loading',async()=>{
 let draws=0;const state={plotFrame:1,plotRunning:false,activePlot:null,pendingPlots:new Map([['plasmaChart',{key:'plasma',signature:'saved',option:{},unitFactor:1}]]),chartStates:new Map(),dataIsCurrent:true,chartNearViewport:()=>true,chartSignature:()=> 'cleared',$:()=>({}),requestPlotFrame(){},window:{AyFluxCharts:{zoomState:()=>[],draw(){draws++;throw Error('obsolete options drawn');}}},chartMessage(){},alertMessage(){},plasmaRestoreCharts:new WeakSet()};
 vm.createContext(state);vm.runInContext(section('function drawNextPlot(', 'function resizeVisibleCharts('),state);
 vm.runInContext('drawNextPlot()',state);await new Promise(resolve=>setImmediate(resolve));assert.equal(draws,0);
});
test('automatically saved study original records the exact nominal configuration used for its curves',()=>{
 const elements={};const $=id=>elements[id]||(elements[id]={value:'8',textContent:'',addEventListener(type,fn){this[type]=fn;}});
 const original={draws:120,variability:1,dose:700},study={id:'example',short:'Example',mode:'No dialysis',explore:{label:'Gap',unit:'h',value:4}};
 let simulated;
 const state={$,studyOverlay:'example',STUDIES:{find:()=>study,configFor:()=>original,exploreConfig:()=>({...original,dose:350})},c:{vcScale:1,clearanceScale:1},E:{validate:()=>[],simulateMany(config){simulated=structuredClone(config);return {'No dialysis':{time:[0,1],plasma:{median:[0,2]},cmmg:{median:[0,1]}}};}},savedRegimens:[],savedRevision:0,REG:{MAX_SAVED:4},structuredClone,rememberVersion(){},applyVersion(){},paletteMode:'standard',concUnit:'mg',showScenarioNote(){},renderRegimens(){},renderStudyStatus(){},switchTab(){},defer(){}};
 vm.createContext(state);vm.runInContext(section("$('studyExploreRun').addEventListener(",'// Evidence scorecard'),state);
 $('studyExploreRun').click();
 assert.equal(state.savedRegimens.length,1);
 for(const key of ['draws','variability','dose'])assert.equal(state.savedRegimens[0].config[key],simulated[key],key+' must describe the saved curve');
});
test('saved regimen comparison window only includes a current run when its row is shown',()=>{
 const state={c:{horizon:24},savedRegimens:[{config:{horizon:96}},{config:{horizon:96}}],dataIsCurrent:false,results:{'No dialysis':{}},primary:'No dialysis',predicting:()=>false};
 vm.createContext(state);vm.runInContext(section('function regimenWindow(', 'function predicting('),state);
 const window=()=>vm.runInContext('regimenWindow()',state);
 assert.equal(window(),96,'pending or invalid current run is absent');
 state.dataIsCurrent=true;assert.equal(window(),24,'valid visible current row participates');
 state.predicting=()=>true;assert.equal(window(),96,'prediction shows saved rows only');
 state.savedRegimens=[];assert.equal(Number.isFinite(window()),true,'no infinite window with no rows');
});
test('dynamic renal chart producer draws current jobs and rejects superseded results',async()=>{
 const drawn=[],errors=[],target={getBoundingClientRect:()=>({width:600,height:300})};
 const state={c:{renalMode:'profile',horizon:24},primary:'No dialysis',results:{'No dialysis':{time:[0,12,24],kidneyClear:{median:[100,50,20]}}},resultsRevision:1,baselineRevision:0,concUnit:'mg',modes:['No dialysis'],visible:new Set(['No dialysis']),paletteMode:'standard',dataIsCurrent:true,pendingPlots:new Map(),chartStates:new Map(),plotFrame:0,plotRunning:false,activePlot:null,plasmaRestoreCharts:new WeakSet(),$:()=>target,chartNearViewport:()=>true,requestPlotFrame(){},chartMessage(){},alertMessage:message=>errors.push(message),E:{renalCrClAt:(_,t)=>95-t},layout:(_,horizon,series)=>({yAxis:{},grid:{},series}),document:{documentElement:{dataset:{ayfluxReady:'true'}}},window:{AyFluxCharts:{line:(name,time,values)=>({name,data:time.map((t,i)=>[t,values[i]])}),draw:(_,option)=>{drawn.push(option);return {};}}}};
 vm.createContext(state);
 vm.runInContext(section('function chartSignature(', 'let chartWait')+section('function renderRenalProfileChart(', 'function renderInputs(')+section('function drawNextPlot(', 'function resizeVisibleCharts('),state);
 const run=code=>vm.runInContext(code,state),flush=()=>new Promise(resolve=>setImmediate(resolve));
 run('renderRenalProfileChart();drawNextPlot()');await flush();
 assert.equal(drawn.length,1,'the actual renal producer must survive the shared signature guard');
 assert.deepEqual(JSON.parse(JSON.stringify(drawn[0].series.map(s=>s.data))),[[[0,100],[12,50],[24,20]],[[0,95],[12,83],[24,71]]]);
 run('renderRenalProfileChart()');assert.equal(state.pendingPlots.size,0,'unchanged chart is cached');
 run('resultsRevision++;renderRenalProfileChart();resultsRevision++;drawNextPlot()');await flush();
 assert.equal(drawn.length,1,'obsolete renal job is rejected');
 run('renderRenalProfileChart();drawNextPlot()');await flush();
 assert.equal(drawn.length,2,'latest renal results can draw after rejecting an older job');
 assert.deepEqual(errors,[]);
});
test('discarded chart jobs do not delay the next visible chart by extra animation frames',async()=>{
 const drawn=[],errors=[],frames=[];
 const jobs=[...Array.from({length:4},(_,i)=>['old'+i,{key:'csf',signature:'old',option:{}}]),...Array.from({length:3},(_,i)=>['hidden'+i,{key:'csf',signature:'current',option:{}}]),...['visibleA','visibleB'].map(id=>[id,{key:'csf',signature:'current',option:{id}}])];
 const state={plotFrame:1,plotRunning:false,activePlot:null,pendingPlots:new Map(jobs),chartStates:new Map(),dataIsCurrent:true,chartSignature:()=> 'current',chartNearViewport:target=>!target.id.startsWith('hidden'),$:id=>({id,getBoundingClientRect:()=>({width:600,height:300})}),requestPlotFrame(){if(state.pendingPlots.size)frames.push('frame');},window:{AyFluxCharts:{draw(_,option){drawn.push(option.id);return {};}}},document:{documentElement:{dataset:{ayfluxReady:'true'}}},chartMessage(){},alertMessage:message=>errors.push(message)};
 vm.createContext(state);vm.runInContext(section('function drawNextPlot(', 'function resizeVisibleCharts('),state);
 vm.runInContext('drawNextPlot()',state);await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(drawn,['visibleA'],'skip seven obsolete/hidden jobs in the same frame');
 assert.deepEqual([...state.pendingPlots.keys()],['visibleB'],'still yield between actual chart draws');
 assert.equal(frames.length,1);
 vm.runInContext('drawNextPlot()',state);await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(drawn,['visibleA','visibleB']);assert.equal(state.pendingPlots.size,0);assert.deepEqual(errors,[]);
});
