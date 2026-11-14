"use strict";
const pk = require("../../public/assets/pk-engine.js");
const fs = require("fs");
const path = require("path");
const dir = path.join(__dirname,"results");
fs.mkdirSync(dir,{recursive:true});
const k = 225.21/1000;
function at(r,t,key) {
 const ts=r.time||r.t, ys=r.time?r[key].median:r.cols[key];
 const i=ts.findIndex(v=>Math.abs(v-t)<1e-7);
 if(i<0) throw Error("Missing hour "+t);
 return ys[i];
}
function csv(file,rows) {
 const cols=Object.keys(rows[0]);
 const encode=v=>JSON.stringify(v===undefined?"":v);
 fs.writeFileSync(path.join(dir,file),cols.join(",")+String.fromCharCode(10)+rows.map(row=>cols.map(c=>encode(row[c])).join(",")).join(String.fromCharCode(10))+String.fromCharCode(10),"utf8");
}
function raw(cfg,p,mode) {
 return pk.single(cfg,p,pk.scheduleFor(mode,cfg),0.25,pk.buildDoses(cfg));
}
const hd={...pk.DEFAULTS,weight:70,crcl:0,crclSource:"manual",renalMode:"constant",route:"Acyclovir IV",dosingMode:"repeat",dose:175,every:24,doseCount:1,infusion:1,horizon:64,hdStart:48,hdDuration:6,hdRepeat:100,draws:1,variability:0,pdRxEnabled:false};
const hdResult=pk.simulate(hd,"Intermittent HD");
const hdPublished=[
 [1,37.5,23.3,"end of infusion"],
 [8,10.3,2.9,"8 h"],
 [24,6.4,2.4,"24 h"],
 [48,2.74,1.38,"pre-HD, approximate time"],
 [54,1.11,0.60,"post-HD, approximate time"]
];
csv("case1_hd.csv",hdPublished.map(x=>({
 doi:"10.1038/clpt.1982.83",hour:x[0],sampling_note:x[3],
 observed_mean_mg_L:x[1]*k,observed_sd_mg_L:x[2]*k,
 model_nominal_mg_L:at(hdResult,x[0],"plasma"),
 relative_difference_pct:100*(at(hdResult,x[0],"plasma")/(x[1]*k)-1)
})));
const pd={...pk.DEFAULTS,weight:60,crcl:0,crclSource:"manual",renalMode:"constant",route:"Acyclovir IV",dosingMode:"repeat",dose:150,every:24,doseCount:5,infusion:1,horizon:120,pdMethod:"manual",pdRxEnabled:false,pdCl:6,capdDwell:6,capdExchanges:4,draws:1,variability:0};
const pdResult=pk.simulate(pd,"Peritoneal dialysis");
function peakWithin(result,start,end) {
 return Math.max(...result.time.map((t,i)=>t>=start&&t<=end?result.plasma.median[i]:-Infinity));
}
const pdPublished=[[1,0,24,25,3],[5,96,120,29,4]];
const pdRows=[];
for(const x of pdPublished) for(const metric of ["peak","trough"]) {
 const observed=(metric==="peak"?x[3]:x[4])*k;
 const predicted=metric==="peak"?peakWithin(pdResult,x[1],x[2]):at(pdResult,x[2],"plasma");
 pdRows.push({doi:"10.1093/jac/20.1.69",day:x[0],metric,
  observed_mean_mg_L:observed,model_nominal_mg_L:predicted,
  relative_difference_pct:100*(predicted/observed-1)});
}
csv("case2_capd.csv",pdRows);
const p=pk.drawParams(hd)[0],base=raw(hd,p,"Intermittent HD");
const variants=[
 ["full_model",base,"unchanged reference"],
 ["without_HD",raw(hd,p,"No dialysis"),"remove hemodialysis"],
 ["without_peripheral_exchange",raw(hd,{...p,q:0},"Intermittent HD"),"zero Q; NOT a refitted one-compartment model"],
 ["without_metabolite_formation",raw(hd,{...p,form:0},"Intermittent HD"),"also removes associated parent-drug clearance"],
 ["without_CSF_proxy",raw(hd,{...p,kp:0,km:0},"Intermittent HD"),"CSF proxy does not feed back to plasma"]
];
csv("ablations.csv",variants.map(x=>({
 variant:x[0],meaning:x[2],
 plasma_auc_mg_h_L:x[1].summary.auc,
 auc_pct_change:100*(x[1].summary.auc/base.summary.auc-1),
 plasma_peak_mg_L:x[1].summary.peak,
 peak_pct_change:100*(x[1].summary.peak/base.summary.peak-1),
 CMMG_peak_mg_L:x[1].summary.mPeak,
 CSF_proxy_peak_mg_L:x[1].summary.csfPeak,
 plasma_54h_mg_L:at(x[1],54,"plasma")
})));
const curves=[];
for(const [name,result] of [["HD",hdResult],["CAPD",pdResult]])
 for(let i=0;i<result.time.length;i++) curves.push({
  scenario:name,hour:result.time[i],
  plasma_acyclovir_mg_L:result.plasma.median[i],
  plasma_CMMG_mg_L:result.cmmg.median[i],
  CSF_acyclovir_proxy_mg_L:result.csf.median[i]
 });
csv("curves.csv",curves);
