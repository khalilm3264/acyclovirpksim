// Mahad et al. JNNP 2005, printed p1308; DOI10.1136/jnnp.2004.059824.
// Descriptive paired-sample comparison, not a patient-specific clearance fit.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const E=require('../../public/assets/pk-engine.js');
const MW={acv:225.21,cmmg:239.19};
const observations=[{day:4,matrix:'CSF',acv:5.99,cmmg:2.25},{day:5,matrix:'serum',acv:34.9,cmmg:91.7},{day:6,matrix:'serum',acv:35.4,cmmg:148.5},{day:7,matrix:'serum',acv:17.2,cmmg:141}].map(o=>({...o,acvMgL:o.acv*MW.acv/1000,cmmgMgL:o.cmmg*MW.cmmg/1000,molarRatio:o.cmmg/o.acv}));
function run(a,step=.125){
 const c={...structuredClone(E.DEFAULTS),age:47,sex:'female',weight:a.weight,crcl:a.crcl,crclSource:'manual',renalMode:'constant',route:'Acyclovir IV',dosingMode:'repeat',dose:250,every:8,infusion:a.infusion,doseCount:24,horizon:192,draws:1,variability:0,pdMethod:'manual',capdExchanges:a.exchanges,capdDwell:24/a.exchanges,pdVolume:2,observations:[]};
 const mode='Peritoneal dialysis';assert.deepEqual(E.validate(c,mode),[]);
 return E.single(c,E.drawParams(c)[0],E.scheduleFor(mode,c),step,E.buildDoses(c));
}
function at(r,t,o){const i=r.t.indexOf(t);assert.ok(i>=0);return {hour:t,acvMgL:r.cols[o.matrix==='CSF'?'csf':'plasma'][i],cmmgMgL:r.cols[o.matrix==='CSF'?'csfCmmg':'cmmg'][i]};}
const fold=(a,b)=>Math.max(a/b,b/a);
function compare(p,o){return {...p,worstFold:Math.max(fold(p.acvMgL,o.acvMgL),fold(p.cmmgMgL,o.cmmgMgL)),molarRatio:p.cmmgMgL/MW.cmmg/(p.acvMgL/MW.acv)};}
function pairedCandidates(r,o,shift){
 // Calendar-day and elapsed-day conventions are separate explicit scenarios.
 // Both analytes must use the SAME model time, not independently chosen extrema.
 const values=[];for(let t=(o.day-1)*24+shift;t<=o.day*24+shift;t+=.25)values.push(compare(at(r,t,o),o));
 return values;
}
const nominal={weight:70,crcl:0,exchanges:4,infusion:1},reference=run(nominal),fine=run(nominal,.0625);
const nominalPairs=observations.map(o=>({day:o.day,matrix:o.matrix,observedMgL:[o.acvMgL,o.cmmgMgL],...compare(at(reference,o.day*24,o),o)}));
const convergenceMaxMgL=Math.max(...observations.flatMap(o=>{const a=at(reference,o.day*24,o),b=at(fine,o.day*24,o);return [Math.abs(a.acvMgL-b.acvMgL),Math.abs(a.cmmgMgL-b.cmmgMgL)];}));
assert.ok(convergenceMaxMgL<.02,'Nominal step-halving convergence');
const perDraw=observations.map(o=>({day:o.day,matrix:o.matrix,acvRange:[Infinity,-Infinity],cmmgRange:[Infinity,-Infinity],ratioRange:[Infinity,-Infinity],bestPaired:null}));
let bestSerumCourse=null;
for(const weight of [50,70,90])for(const crcl of [0,5])for(const exchanges of [3,4,6])for(const infusion of [.5,1]){
 const assumptions={weight,crcl,exchanges,infusion},r=run(assumptions);
 for(const dayShiftH of [0,24]){
  const rows=observations.map((o,i)=>{
   const candidates=pairedCandidates(r,o,dayShiftH),best=candidates.reduce((a,b)=>a.worstFold<b.worstFold?a:b),summary=perDraw[i];
   for(const p of candidates)for(const [name,v] of [['acvRange',p.acvMgL],['cmmgRange',p.cmmgMgL],['ratioRange',p.molarRatio]]){summary[name][0]=Math.min(summary[name][0],v);summary[name][1]=Math.max(summary[name][1],v);}
   if(!summary.bestPaired||best.worstFold<summary.bestPaired.worstFold)summary.bestPaired={...best,assumptions,dayShiftH};
   return {day:o.day,matrix:o.matrix,...best};
  });
  const serum=rows.filter(r=>r.matrix==='serum'),worstFold=Math.max(...serum.map(r=>r.worstFold));
  if(!bestSerumCourse||worstFold<bestSerumCourse.worstFold)bestSerumCourse={assumptions,dayShiftH,worstFold,serum};
 }
}
// A paired score cannot combine parent/metabolite predictions from different hours.
const synthetic=compare({hour:1,acvMgL:2,cmmgMgL:8},{acvMgL:1,cmmgMgL:4});assert.equal(synthetic.worstFold,2);
const engineBytes=fs.readFileSync(require.resolve('../../public/assets/pk-engine.js'));
const engineBlob=crypto.createHash('sha1').update('blob '+engineBytes.length+'\0').update(engineBytes).digest('hex');
console.log(JSON.stringify({source:{doi:'10.1136/jnnp.2004.059824',pmid:16107379,pmcid:'PMC1739775',page:1308,printedUnit:'µmol/L',observations},engineBlob,nominal,nominalPairs,convergenceMaxMgL,scenarios:36,dayAlignments:2,clockGridH:.25,perDraw,bestSerumCourse,limits:'Illustrative nuisance assumptions only. Marginal ranges are not joint paired predictions or uncertainty intervals. CSF is separate; no contemporaneous CSF/serum ratio, pooled clinical accuracy, parameter tuning or independent validation.'},null,2));
