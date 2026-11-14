'use strict';
// Execute only the prespecified aggregate reconstruction in TURNER-2016-PROTOCOL.md.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const MODEL='304ce5308ea78907d18b07d8670c164295829eb3';
const BLOB='17971df66e0a97b4d382572a582d35c444a3c83f';
const PROTOCOL='4d30000eb7201f02572c88fd131eea7e4ef95735';
const source=execFileSync('git',['show',MODEL+':public/assets/pk-engine.js'],{cwd:root,encoding:'utf8'});
assert.equal(execFileSync('git',['hash-object','--stdin'],{input:source,encoding:'utf8'}).trim(),BLOB);
const protocolPath='research/validation/TURNER-2016-PROTOCOL.md';
assert.equal(fs.readFileSync(path.join(root,protocolPath),'utf8'),execFileSync('git',['show',PROTOCOL+':'+protocolPath],{cwd:root,encoding:'utf8'}),'Protocol must match its pre-execution commit');
const sandbox={module:{exports:{}},structuredClone};
vm.runInNewContext(source,sandbox,{filename:'pk-engine-frozen.js'});
const E=sandbox.module.exports;
const groups=[
 {id:'obese',n:7,female:6,weight:120.5,ibw:57.1,bmi:45,age:54.3,bsa:2.3,scr:.78,gfrIndexed:93.4,dose:285,observed:{peak:5.8,aucInfinity:15.2,clearance:19.4}},
 {id:'normal',n:7,female:6,weight:61.2,ibw:58.5,bmi:22.5,age:53,bsa:1.7,scr:.76,gfrIndexed:93.7,dose:303,observed:{peak:8.2,aucInfinity:24,clearance:14.3}}
];
const schedules=['absolute-egfr','cg-actual','cg-ideal','cg-adjusted'];
const variants=[{id:'default',renalFactor:1},{id:'renal-x0.75',renalFactor:.75}];
const sampleHours=[0,.5,1,1.25,1.5,2,3,5,7,9,12];
function simulate(group,crcl,sex,variant,step){
 const c={...structuredClone(E.DEFAULTS),weight:group.weight,age:group.age,sex,scr:group.scr,
  crcl,crclSource:'manual',renalMode:'constant',route:'Acyclovir IV',dosingMode:'repeat',
  dose:group.dose,doseCount:1,every:24,infusion:1,horizon:120,variability:0,draws:1,
  vcScale:1,clearanceScale:1,probenecid:false,observations:[]};
 const params=E.drawParams(c)[0];params.renal*=variant.renalFactor;
 const result=E.single(c,params,[],step,E.buildDoses(c));
 assert.ok(Math.abs(result.summary.massBalanceErrorMg)<1e-6,'Mass balance');
 assert.ok(result.cols.plasma.every(x=>Number.isFinite(x)&&x>=0),'Nonnegative finite plasma');
 const clearance=params.renal+params.other+params.form;
 const at=t=>{const i=result.t.findIndex(x=>Math.abs(x-t)<1e-8);assert.ok(i>=0);return result.cols.plasma[i];};
 return {config:c,params,uiWarnings:E.validate(c,'No dialysis'),peak:result.summary.peak,
  sampledPeak:Math.max(...sampleHours.map(at)),aucInfinity:group.dose/clearance,
  auc120:result.summary.auc,clearance,massBalanceResidualMg:result.summary.massBalanceErrorMg};
}
function reconstruction(group,kidney,variant){
 const weights={actual:group.weight,ideal:group.ibw,adjusted:group.ibw+.4*(group.weight-group.ibw)};
 const individuals=(kidney==='absolute-egfr'?[{sex:'female',fraction:1,crcl:group.gfrIndexed*group.bsa/1.73}]:['female','male'].map(sex=>({sex,fraction:sex==='female'?6/7:1/7,
  crcl:E.cockcroftGault({age:group.age,sex,scr:group.scr,weight:weights[kidney.slice(3)],cgWeight:'actual'})})))
  .map(person=>({...person,coarse:simulate(group,person.crcl,person.sex,variant,.025),fine:simulate(group,person.crcl,person.sex,variant,.0125)}));
 const mean=(key,grid='coarse')=>individuals.reduce((s,p)=>s+p.fraction*p[grid][key],0);
 const prediction=Object.fromEntries(['peak','sampledPeak','aucInfinity','auc120','clearance'].map(key=>[key,mean(key)]));
 const endpoints=['peak','aucInfinity','clearance'].map(key=>({endpoint:key,predicted:prediction[key],observed:group.observed[key],ratio:prediction[key]/group.observed[key],relativeErrorPercent:100*(prediction[key]/group.observed[key]-1)}));
 return {group:group.id,kidney,variant:variant.id,prediction,endpoints,
  tailPercent:100*(prediction.aucInfinity-prediction.auc120)/prediction.aucInfinity,
  convergence:{peakDifference:mean('peak','fine')-mean('peak'),peakRelativePercent:100*(mean('peak','fine')/mean('peak')-1),auc120RelativePercent:100*(mean('auc120','fine')/mean('auc120')-1)},individuals};
}
const results=schedules.flatMap(kidney=>variants.flatMap(v=>groups.map(g=>reconstruction(g,kidney,v))));
const bands=variants.map(v=>{
 const primary=results.filter(r=>r.kidney==='absolute-egfr'&&r.variant===v.id);
 const points=primary.flatMap(r=>r.endpoints.filter(e=>e.endpoint!=='clearance'));
 const obese=primary.find(r=>r.group==='obese'),normal=primary.find(r=>r.group==='normal');
 return {variant:v.id,total:points.length,withinNarrow:points.filter(e=>e.ratio>=.8&&e.ratio<=1.25).length,
  withinTwofold:points.filter(e=>e.ratio>=.5&&e.ratio<=2).length,
  groupRatios:['peak','aucInfinity'].map(key=>({endpoint:key,predicted:obese.prediction[key]/normal.prediction[key],observed:groups[0].observed[key]/groups[1].observed[key],obeseLower:obese.prediction[key]<normal.prediction[key]}))};
});
const report={modelCommit:MODEL,engineBlob:BLOB,protocolCommit:PROTOCOL,runtime:process.version,
 sourceDoi:'10.1128/AAC.02010-15',scope:'Retrospective aggregate reconstruction. Published outcomes known before execution. No model fitting.',
 inputs:groups,variants,results,bands};
// Fine-grid runs share each coarse run's configuration and parameter draw.
for(const row of report.results)for(const person of row.individuals){
 delete person.fine.config;delete person.fine.params;delete person.fine.uiWarnings;
}
const output=path.resolve(process.argv[2]||path.join(__dirname,'results/turner-2016'));
fs.mkdirSync(output,{recursive:true});
fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(report,null,2)+'\n');
const csv=['kidney,variant,group,endpoint,predicted,observed,ratio,relative_error_percent'];
for(const row of results)for(const e of row.endpoints)csv.push([row.kidney,row.variant,row.group,e.endpoint,e.predicted,e.observed,e.ratio,e.relativeErrorPercent].join(','));
fs.writeFileSync(path.join(output,'endpoints.csv'),csv.join('\n')+'\n');
console.log(JSON.stringify({primary:results.filter(r=>r.kidney==='absolute-egfr').map(({individuals,...r})=>r),bands},null,2));
