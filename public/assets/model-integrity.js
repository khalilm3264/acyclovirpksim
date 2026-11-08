/*
 * AyFlux — educational model integrity diagnostics.
 * Copyright (C) 2026 Muhammad Khalil
 * SPDX-License-Identifier: AGPL-3.0-only
 */
(function(root,make){
 "use strict";
 const api=make();
 if(typeof module==="object" && module.exports) module.exports=api;
 if(root) root.AyFluxIntegrity=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const finite=x=>typeof x==="number" && Number.isFinite(x);
 function checkSimulation(sim, config){
   const issues=[], notes=[];
   if(!sim || !Array.isArray(sim.time) || !sim.time.length) return {passed:false,issues:["Missing time samples"],notes:[]};
   for(let i=0;i<sim.time.length;i++){
     if(!finite(sim.time[i]) || sim.time[i]<0 || (i>0 && sim.time[i]<=sim.time[i-1])) {
       issues.push("Time axis is not strictly increasing");break;
     }
   }
   for(const key of ["plasma","csf","cmmg","csfCmmg"]){
     const series=sim[key];
     if(!series || !["median","lower","upper"].every(k=>Array.isArray(series[k])&&series[k].length===sim.time.length)){
       issues.push(key+": missing or inconsistent series");continue;
     }
     for(let i=0;i<sim.time.length;i++){
       const m=series.median[i],lo=series.lower[i],hi=series.upper[i];
       if(!finite(m)||!finite(lo)||!finite(hi)||lo< -1e-8||m< -1e-8||hi< -1e-8){
         issues.push(key+": invalid or negative concentration");break;
       }
       if(lo>m+1e-8||m>hi+1e-8){issues.push(key+": median outside interval");break;}
     }
   }
   if(config?.crcl===0 && sim.kidneyClear?.median?.some(v=>Math.abs(v)>1e-8))
     issues.push("Renal acyclovir clearance is nonzero at CrCl = 0");
   notes.push("Checks only numerical consistency, not clinical accuracy or external validation.");
   return {passed:!issues.length,issues,notes};
 }
 function checkConvergence(pk,c,mode="No dialysis"){
   const cfg={...c,crclSource:"manual",draws:1,variability:0};
   if(cfg.crclSource!=="manual"||!finite(cfg.crcl)) throw Error("Provide a valid modeled CrCl.");
   const p=pk.drawParams(cfg)[0],rows=pk.scheduleFor(mode,cfg),doses=pk.buildDoses(cfg);
   const coarse=pk.single(cfg,p,rows,.25,doses),fine=pk.single(cfg,p,rows,.125,doses);
   const compare=(k)=>{
     const a=coarse.summary[k],b=fine.summary[k];
     return Math.abs(a-b)/Math.max(1e-8,Math.abs(b));
   };
   return {aucRelativeDifference:compare("auc"),peakRelativeDifference:compare("peak"),
     massBalanceErrorMg:finite(fine.summary.massBalanceErrorMg)?fine.summary.massBalanceErrorMg:null,
     administeredAcyclovirEqMg:finite(fine.summary.administeredAcyclovirEqMg)?fine.summary.administeredAcyclovirEqMg:null,
     note:"0.25-h versus 0.125-h RK4 steps; smaller differences are numerical evidence only."};
 }
 return {checkSimulation,checkConvergence};
});
