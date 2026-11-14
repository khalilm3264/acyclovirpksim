'use strict';
// Generate the actual downloadable scripts and check their CSV against the nominal engine.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const E=require('../public/assets/pk-engine.js'),S=require('../public/assets/scenario-script.js');
const base=()=>({...structuredClone(E.DEFAULTS),draws:1,variability:0,horizon:48,doseCount:4});
const cases=[
 {id:'iv-hd',mode:'Intermittent HD',c:{...base(),hdStart:8.35,hdDuration:3.2,hdRepeat:24,probenecid:true,weight:100,crclSource:'estimated',cgWeight:'adjusted',height:170}},
 {id:'mixed-dynamic',mode:'Custom sequence',c:{...base(),renalMode:'profile',crclSource:'manual',renalProfile:[{time:0,crcl:10},{time:12.7,crcl:0},{time:30,crcl:20}],schedule:[{type:'CRRT',start:0,end:12},{type:'HD',start:24.7,end:28.2}],dosingMode:'custom',customDoses:[{time:0,route:'Valacyclovir oral',amount:1000},{time:16.3,route:'Acyclovir IV',amount:500,infusion:1.7},{time:17,route:'Acyclovir IV',amount:250,infusion:1.3},{time:25.1,route:'Valacyclovir oral',amount:500}]}},
 {id:'anuric-oral',mode:'No dialysis',c:{...base(),route:'Valacyclovir oral',dose:1000,crcl:0,every:12}},
 {id:'zero-dose',mode:'CRRT',c:{...base(),dose:0}}
];
function check(file,expected){
 const rows=fs.readFileSync(file,'utf8').trim().split(/\r?\n/).slice(1).map(l=>l.split(',').map(Number));
 assert.ok(rows.length>2,'Script must emit a time series');
 let max=0;
 for(const [col,key] of [[1,'plasma'],[2,'cmmg']]){
  const peak=Math.max(...expected.cols[key],1);
  for(const row of rows){
   assert.ok(row.every(Number.isFinite),'CSV values must be finite');
   const t=row[0];assert.ok(t>=0&&t<=48+1e-8);
   let i=expected.t.findIndex(x=>x>=t-1e-8);if(i<0)i=expected.t.length-1;
   let reference=expected.cols[key][i];
   if(i&&Math.abs(expected.t[i]-t)>1e-8){const a=i-1,f=(t-expected.t[a])/(expected.t[i]-expected.t[a]);reference=expected.cols[key][a]+f*(reference-expected.cols[key][a]);}
   max=Math.max(max,Math.abs(row[col]-reference)/peak);
  }
 }
 assert.ok(Math.abs(rows.at(-1)[0]-48)<1e-8,'Output must reach horizon');
 assert.ok(max<5e-5,'Normalized systemic curve difference exceeds 0.005%: '+max);
 return max;
}
if(require.main===module){
 const language=process.argv.includes('--r')?'r':'python';
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ayflux-script-check-'));
 try {
  for(const item of cases){
   const dir=path.join(temp,item.id);fs.mkdirSync(dir);
   const file=path.join(dir,'scenario.'+(language==='r'?'R':'py'));
   fs.writeFileSync(file,S.generate(E,item.c,item.mode,language,'test'));
   execFileSync(language==='r'?'Rscript':(process.env.PYTHON||'python3'),[file],{cwd:dir,stdio:'pipe'});
   const c=E.effectiveConfig(item.c),expected=E.single(c,E.drawParams(c)[0],E.scheduleFor(item.mode,c),.005,E.buildDoses(c));
   console.log(language,item.id,'max normalized error',check(path.join(dir,'ayflux_nominal_systemic.csv'),expected));
  }
 } finally {fs.rmSync(temp,{recursive:true,force:true});}
}
module.exports={cases,check};
