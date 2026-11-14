'use strict';
const fs=require('node:fs'),path=require('node:path');
const {subjects,runOne}=require('./boelaert-capd.cjs');
const {run}=require('./stathoulopoulou-capd.cjs');
const subject=subjects.find(s=>s.id===4),mw=225.21/1000;
function patient4(name,overrides){
 const out=runOne(subject,overrides),m=out.metrics,t=out.simulation.t,c=out.simulation.cols.plasma;
 let auc=0;
 for(let i=1;i<t.length;i++)if(t[i-1]>=96)auc+=(t[i]-t[i-1])*(c[i]+c[i-1])/2;
 return {name,overrides,peakRatio:m.day5PeakMgL/(22*mw),troughRatio:m.day5TroughMgL/(3*mw),
  recoveryRatio:m.day5DrainedPdPctDailyDose/13.6,aucRatio:auc/(194*mw)};
}
const candidates=[
 {name:'baseline',overrides:{}},
 {name:'Boelaert shared grid minimum',overrides:{clearanceScale:1.625,formFactor:1.625,pdTransport:2}},
 {name:'Boelaert patient 4 grid minimum',overrides:{clearanceScale:1.875,formFactor:1.875,pdTransport:6}}
];
function report(){
 const volumeScale=28.2/(0.32*59);
 const patient= candidates.flatMap(c=>[
  patient4(c.name,c.overrides),
  patient4(c.name+' with source central volume',{...c.overrides,vcScale:volumeScale})
 ]);
 const external=[];
 for(const candidate of candidates)for(const weight of [50,70,90])for(const crcl of [0,0.5,1,2,5,10]){
  const main=run(crcl,weight,0.125,candidate.overrides),fine=run(crcl,weight,0.0625,candidate.overrides);
  external.push({candidate:candidate.name,weight,crcl,...main,
   capdPctTablet:100*main.dialysate/500,capdPctEquivalent:100*main.dialysate/(500*225.21/324.34),
   stepDifferenceMg:Math.max(Math.abs(main.dialysate-fine.dialysate),Math.abs(main.urine-fine.urine))});
 }
 return {protocol:{candidateSelection:'Fixed from prior Boelaert analysis before external run',
  sourceCentralVolumeL:28.2,defaultCentralVolumeL:0.32*59,
  sourceRecoveryPct:{anuricSubset:[8.6,4.8,7.8,6.7],eightPersonSubset:[8.6,4.8,7.8,6.7,5.7,3.4,8.4,6.7]},
  caveat:'Unknown individual weights, CrCl and exchange prescription; denominator ambiguity. At positive CrCl, clearanceScale also multiplies renal clearance.'},
  patient4:patient,external,
  ranges:candidates.map(c=>{
   const selected=external.filter(r=>r.candidate===c.name),anuric=selected.filter(r=>r.crcl===0);
   const range=(rows,key)=>[Math.min(...rows.map(r=>r[key])),Math.max(...rows.map(r=>r[key]))];
   return {candidate:c.name,capdPctTablet:range(selected,'capdPctTablet'),capdPctEquivalent:range(selected,'capdPctEquivalent'),
    anuricPctTablet:range(anuric,'capdPctTablet'),anuricPctEquivalent:range(anuric,'capdPctEquivalent')};
  })};
}
if(require.main===module){
 const out=process.argv[2] || __dirname;
 fs.mkdirSync(out,{recursive:true});
 const r=report();fs.writeFileSync(path.join(out,'boelaert-followup-results.json'),JSON.stringify(r,null,2)+'\n');
 console.log(JSON.stringify({patient4:r.patient4,ranges:r.ranges,maxStepDifferenceMg:Math.max(...r.external.map(r=>r.stepDifferenceMg))},null,2));
}
module.exports={report};
