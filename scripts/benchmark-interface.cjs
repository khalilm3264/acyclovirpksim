const fs=require('node:fs'),vm=require('node:vm'),{performance}=require('node:perf_hooks');
const path=require('node:path');const root=path.resolve(__dirname,'..');
if(!process.argv[2])throw Error('Usage: node scripts/benchmark-interface.cjs /path/to/previous-simulator-ui.js');const E=require(root+'/public/assets/pk-engine.js');
function run(path){const src=fs.readFileSync(path,'utf8'),sim=E.createSimulator(),c=structuredClone(E.DEFAULTS);const chosen=['No dialysis','Intermittent HD','Custom sequence'];const initial=structuredClone(sim({...c,requestedModes:chosen}));
const h={E,c,structuredClone,clearTimeout(){},timer:null,calculationVersion:0,dataIsCurrent:true,queuedJob:null,activeJob:null,worker:null,primary:'No dialysis',requestedModes:()=>chosen,calculatedCrCl:()=>95,setBusy(){},acceptResults(){},calculationError(e){throw e;},initial,jobs:0,startNextJob(){h.jobs++;structuredClone(sim(h.queuedJob.config));h.queuedJob=null;}};
vm.createContext(h);if(src.includes('const completedResults='))vm.runInContext(src.slice(src.indexOf('const completedResults='),src.indexOf('let renalDraft=')),h);
vm.runInContext(src.slice(src.indexOf('function calculate('),src.indexOf('function defer(')),h);if(src.includes('const completedResults='))vm.runInContext('rememberResult(resultKey(c),initial)',h);
const t=performance.now();vm.runInContext('for(let i=0;i<50;i++)calculate()',h);return {milliseconds:Number((performance.now()-t).toFixed(2)),workerEquivalentJobs:h.jobs};}
console.log(JSON.stringify({fixture:'50 repeated requests, identical settings, 120 draws, three scenarios; warm engine plus structured-clone transfer; excludes browser paint/network',before:run(process.argv[2]),after:run(root+'/public/assets/simulator-ui.js')},null,2));
