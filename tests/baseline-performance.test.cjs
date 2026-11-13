'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const E=require('../public/assets/pk-engine.js');
const source=fs.readFileSync(require.resolve('../public/assets/simulator-ui.js'),'utf8');
const section=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
function cacheHarness(){
 const state={E,structuredClone,clearTimeout(){},timer:null,calculationVersion:0,dataIsCurrent:true,queuedJob:null,activeJob:null,worker:null,primary:'No dialysis',c:structuredClone(E.DEFAULTS),requestedModes:()=>['No dialysis'],calculatedCrCl:()=>95,setBusy(){},startNextJob(){state.started++;},started:0,acceptResults(d){state.accepted=d;},calculationError(e){throw e;}};
 vm.createContext(state);
 vm.runInContext(section('const completedResults=', 'let renalDraft=')+section('function calculate(', 'function defer('),state);
 return state;
}
test('completed results reuse display-only changes, retain scenarios and invalidate numerical or fit changes',()=>{
 const h=cacheHarness(),run=code=>vm.runInContext(code,h);
 run('c.fitMode=primary; rememberResult(resultKey(c), {"No dialysis":{value:1},_validation:{}}); calculate()');
 assert.equal(h.started,0);assert.equal(h.accepted['No dialysis'].value,1);
 run('c.showBands=false;c.virus="HSV-1";calculate()');assert.equal(h.started,0);
 run('rememberResult(resultKey(c), {"Intermittent HD":{value:2}})');
 h.requestedModes=()=>['No dialysis','Intermittent HD'];run('calculate()');assert.equal(h.started,0);assert.equal(h.accepted['Intermittent HD'].value,2);
 for(const change of ['c.dose+=25','c.coverage=.8','c.observations=[{time:12,value:1,analyte:"plasma",role:"fit"}]','primary="Intermittent HD"'])run(change+';calculate()');
 assert.equal(h.started,4);
 run('rememberResult("a",{});rememberResult("b",{});rememberResult("c",{});rememberResult("d",{})');
 assert.equal(run('completedResults.size'),3);assert.equal(run('completedResults.has("a")'),false);
});
test('new inputs cancel obsolete Worker work; same-settings requests keep the Worker cache',()=>{
 const h=cacheHarness();let terminated=0;h.worker={terminate(){terminated++;}};h.activeJob={key:'old'};
 vm.runInContext('calculate()',h);assert.equal(terminated,1);assert.equal(h.activeJob,null);
 h.worker={terminate(){terminated++;}};h.activeJob=h.queuedJob;
 vm.runInContext('calculate()',h);assert.equal(terminated,1);
});
test('numeric change after input does not schedule the same simulation twice',()=>{
 let calls=0;const c={dose:700},target={dataset:{k:'dose',role:'number'},value:'725',setCustomValidity(){}};
 const update=new Function('c','fieldDef','document','defer','updateDrugCaution',section('function updateParam(', 'function renderSchedule(')+'return updateParam;')(c,()=>['Dose','mg',0,2000],{querySelectorAll:()=>[]},()=>calls++,()=>{});
 update(target);update(target);assert.equal(calls,1);assert.equal(c.dose,725);
});
function curveHarness(){
 const config={...E.DEFAULTS,draws:1,horizon:24,requestedModes:['No dialysis']},data=E.simulateMany(config),elements={};
 for(const [i,id] of ['plasmaChart','csfChart','cmmgChart','csfCmmgChart'].entries())elements[id]={getClientRects:()=>[{}],getBoundingClientRect:()=>({top:i<2?600:1400,bottom:i<2?900:1700})};
 const state={overlayStudy:()=>null,savedRevision:0,savedRegimens:[],results:data,dataIsCurrent:true,resultsRevision:1,baselineRevision:0,primary:'No dialysis',modes:E.MODES,visible:new Set(['No dialysis']),c:config,baseline:null,DEFS:{dose:['Dose','mg']},presentationKeys:new Set(['showBands','virus']),COLORS:{'No dialysis':'#88949f'},LINE_DASH:{'No dialysis':'solid'},paletteMode:'standard',E,window:{innerHeight:900},IntersectionObserver:function(){},$:id=>elements[id],pendingPlots:new Map(),chartStates:new Map(),activePlot:null,labelsFor:t=>t,rgba:()=>'',layout:(u,h,series)=>({toolbox:{feature:{saveAsImage:{}}},series}),requestPlotFrame(){},structuredClone};
 vm.createContext(state);vm.runInContext(fs.readFileSync(require.resolve('../public/assets/charts.js'),'utf8'),state);vm.runInContext(section('const MOLAR_MASS=', 'function tableOpen(')+section('function chartNearViewport(', "\nif(typeof IntersectionObserver")+section('function chartSignature(', 'let chartWait')+section('function curve(', 'function baselineChanges(')+section('function baselineChanges(', 'function renderBaseline('),state);
 return {state,elements,run:s=>vm.runInContext(s,state)};
}
test('off-screen charts defer traces; scrolling draws latest data and baseline stays frozen',()=>{
 const {state,elements,run}=curveHarness();
 for(const [key,id] of [['plasma','plasmaChart'],['csf','csfChart'],['cmmg','cmmgChart'],['csfCmmg','csfCmmgChart']])run(`curve('${key}','mg/L','${id}')`);
 assert.equal(state.pendingPlots.size,2);
 run('baseline={primary,config:structuredClone(c),data:structuredClone(results[primary])};baselineRevision++');
 const frozen=state.baseline.data.plasma.median[1];state.results['No dialysis'].plasma.median[1]+=1;state.c.dose+=25;
 assert.ok(run('baselineChanges(baseline,c,primary)').some(x=>x.includes('Dose: 700 → 725 mg')));
 state.c.showBands=false;assert.equal(run('baselineChanges(baseline,c,primary)').length,1);
 run("curve('plasma','mg/L','plasmaChart')");
 assert.equal(state.pendingPlots.get('plasmaChart').option.series.find(t=>t.name.startsWith('Baseline:')).data[1][1],frozen);
 elements.cmmgChart.getBoundingClientRect=()=>({top:300,bottom:600});run("curve('cmmg','mg/L','cmmgChart')");assert.equal(state.pendingPlots.size,3);
 elements.csfCmmgChart.getClientRects=()=>[];run("curve('csfCmmg','mg/L','csfCmmgChart')");assert.equal(state.pendingPlots.size,3);
 run("baseline=null;baselineRevision++;curve('plasma','mg/L','plasmaChart')");assert.ok(!state.pendingPlots.get('plasmaChart').option.series.some(t=>t.name?.startsWith('Baseline:')));
});
test('obsolete results cannot replace a newer accepted simulation',()=>{
 let accepted=0,started=0;
 const state={activeJob:{id:1,key:'old'},calculationVersion:2,acceptResults(){accepted++;},rememberResult(){throw Error('stale result cached');},startNextJob(){started++;}};
 vm.createContext(state);vm.runInContext(section('function finishJob(', 'function startNextJob('),state);
 vm.runInContext('finishJob({wrong:true},null)',state);assert.equal(accepted,0);assert.equal(started,1);
});
test('browsers without IntersectionObserver still render visible charts',()=>{
 const {state,elements,run}=curveHarness();state.IntersectionObserver=undefined;
 run("curve('cmmg','mg/L','cmmgChart')");assert.equal(state.pendingPlots.size,1);
 elements.csfCmmgChart.getClientRects=()=>[];run("curve('csfCmmg','mg/L','csfCmmgChart')");assert.equal(state.pendingPlots.size,1);
});
