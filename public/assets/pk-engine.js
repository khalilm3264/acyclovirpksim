/*
 * AyFlux — educational acyclovir and valacyclovir pharmacokinetics simulator.
 * Copyright (C) 2026 Muhammad Khalil
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * This file is part of AyFlux, licensed under the GNU Affero General
 * Public License version 3. It is provided without warranty.
 * See LICENSE: https://github.com/khalilm3264/acyclovirpksim/blob/main/LICENSE
 * Contact: contact@ayflux.org
 */



/* VZV CNS Acyclovir Simulator v9 — teaching model, NOT a clinical dosing engine. */
(function(root){
'use strict';
const MODES=['No dialysis','Intermittent HD','Peritoneal dialysis','CRRT','Custom sequence'];
const TYPES=['HD','PD','CRRT'];
const MARKER=10.8*239.19/1000;
// VALTREX tablet strengths are expressed as valacyclovir free base (MW ~324.34 g/mol).
// Bioavailability below is absolute ACYCLOVIR bioavailability after oral valacyclovir [8].
const ACV_MW=225.21, VAL_MW=324.34;
const ROUTES=['Acyclovir IV','Valacyclovir oral'];
// UI limits for exploration only; they are not approved or suggested doses.
const MAX_DOSE_MG={'Acyclovir IV':2000,'Valacyclovir oral':6000};
const DEFAULTS={virus:'VZV',age:55,sex:'male',scr:1,crclSource:'manual',pdMethod:'manual',route:'Acyclovir IV',dosingMode:'repeat',doseCount:12,customDoses:[{time:12,route:'Valacyclovir oral',amount:1000},{time:24,route:'Acyclovir IV',amount:250,infusion:1},{time:48,route:'Acyclovir IV',amount:250,infusion:1}],weight:70,crcl:95,renalMode:'constant',renalProfile:[{time:0,crcl:95},{time:96,crcl:95}],dose:700,every:8,infusion:1,horizon:96,valF:0.545,valKa:1.8,
 hdStart:24,hdDuration:4,hdRepeat:48,hdCl:81.8,
 pdRxEnabled:false,pdRxRows:[],vcScale:1,clearanceScale:1,pdCl:6,pdVolume:2,capdDwell:6,capdExchanges:4,pdGlucose:2.5,pdTransport:1,pdUfBase:120,pdAbsorb:20,pdSmallPore:0.5,pdSigma:0.12,apdStart:20,apdHours:10,apdCycles:5,apdDwell:1.5,apdTurnover:0.25,apdFactor:1,
 effluent:25,sieving:0.95,delivered:0.85,
 csfRatio:0.3,csfLag:4,csfMetRatio:0.25,csfMetLag:6,formFactor:1,metRenal:1,metDial:1,
 variability:1,draws:120,coverage:0.9,assayCV:0.15,observations:[],fitMode:"No dialysis",showBands:true,showShades:true,showStudy:true,showIC50:false,probenecid:false,labelBsa:0,
 schedule:[{type:'PD',start:0,end:24},{type:'PD',start:24,end:48},{type:'HD',start:54,end:58}]};
// Time-varying residual CrCl is a user-defined illustration, not a measured GFR estimate.
// Piecewise-linear interpolation, holding the first and last endpoints outside the knots.
function renalCrClAt(c,t){
 if(c.renalMode!=='profile')return c.crcl;
 const points=c.renalProfile;
 if(!Array.isArray(points)||!points.length)return NaN;
 if(t<=points[0].time)return points[0].crcl;
 for(let i=1;i<points.length;i++){
  const prior=points[i-1],next=points[i];
  if(t<=next.time)return prior.crcl+(next.crcl-prior.crcl)*(t-prior.time)/(next.time-prior.time);
 }
 return points[points.length-1].crcl;
}
function validateRenalProfile(c){
 const err=[];
 if(!['constant','profile'].includes(c.renalMode??'constant'))err.push('Choose a valid residual kidney function mode');
 if(c.renalMode!=='profile')return err;
 if(c.crclSource!=='manual')err.push('Time-varying CrCl must use manual profile inputs, not Cockcroft–Gault');
 const pts=c.renalProfile;
 if(!Array.isArray(pts)||pts.length<2||pts.length>24)return ['Kidney function profile needs 2–24 time points'];
 let previous=-Infinity;
 for(let i=0;i<pts.length;i++){
  const row=pts[i];
  if(!row||!Number.isFinite(row.time)||row.time<0||row.time>c.horizon||row.time<=previous)
    err.push('Kidney function times must increase and stay within the simulation horizon');
  if(!row||!Number.isFinite(row.crcl)||row.crcl<0||row.crcl>140)
    err.push('Kidney function values must be within 0–140 mL/min');
  previous=row?.time;
 }
 if(pts[0]?.time!==0)err.push('Kidney function profile must begin at hour 0');
 return [...new Set(err)];
}
function cockcroftGault({age,sex,scr,weight}){
 if(!Number.isFinite(age)||age<18||age>120||!Number.isFinite(weight)||weight<=0||!Number.isFinite(scr)||scr<=0||!['male','female'].includes(sex))return NaN;
 return (140-age)*weight*(sex==='female'?.85:1)/(72*scr);
}
function rng(seed=2026){let s=seed|0;return ()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296;};}
function quantile(a,q){let b=Array.from(a).sort((x,y)=>x-y),p=(b.length-1)*q,j=Math.floor(p);return b[j]+((b[j+1]??b[j])-b[j])*(p-j);}
// All events feed the SAME acyclovir central/peripheral/CMMG/CSF state.
// IV amounts are acyclovir milligrams; oral amounts are valacyclovir free-base milligrams.
function buildDoses(c){
 if(c.dosingMode==='custom')return (c.customDoses||[]).filter(x=>Number.isFinite(x.time)&&x.time>=0&&x.time<c.horizon).map(x=>({...x,infusion:x.route==='Acyclovir IV'?x.infusion:0})).sort((a,b)=>a.time-b.time);
 const arr=[];
 for(let j=0;j<c.doseCount;j++){
   let t=+(j*c.every).toFixed(9);if(t>=c.horizon-1e-9)break;
   arr.push({time:t,route:c.route,amount:c.dose,infusion:c.route==='Acyclovir IV'?c.infusion:0});
 }
 return arr;
}
function validateDoses(c){
 const err=[];
 if(!['repeat','custom'].includes(c.dosingMode))err.push('Select a recognized dosing mode');
 if(c.dosingMode==='repeat'){
   if(!Number.isInteger(c.doseCount)||c.doseCount<1||c.doseCount>200)err.push('Total planned doses must be an integer from 1 to 200');
   if(!(Number.isFinite(c.dose)&&c.dose>=0&&c.dose<=MAX_DOSE_MG[c.route]))err.push(`${c.route}: dose must be between 0 and ${MAX_DOSE_MG[c.route]} mg`);
   if(!Number.isFinite(c.every)||c.every<0.25)err.push('Dose interval must be at least 0.25 hours');
   if(c.route==='Acyclovir IV'&&(!Number.isFinite(c.infusion)||c.infusion<=0||c.infusion>24))err.push('IV infusion must be positive and ≤24 hours');
 }else if(c.dosingMode==='custom'){
   if(!Array.isArray(c.customDoses)||c.customDoses.length===0)err.push('Add at least one medication dose to the custom schedule');
   else if(c.customDoses.length>200)err.push('Custom medication schedule permits at most 200 doses');
   else c.customDoses.forEach((x,j)=>{
    if(!ROUTES.includes(x.route))err.push(`Dose ${j+1}: select a valid drug and route`);
    if(!Number.isFinite(x.time)||x.time<0||x.time>=c.horizon)err.push(`Dose ${j+1}: time must be ≥0 and before ${c.horizon} hours`);
    if(!Number.isFinite(x.amount)||x.amount<0||x.amount>MAX_DOSE_MG[x.route])err.push(`Dose ${j+1}: enter ≥0 and ≤${MAX_DOSE_MG[x.route]} mg`);
    if(x.route==='Acyclovir IV'&&(!Number.isFinite(x.infusion)||x.infusion<=0||x.infusion>24||x.time+x.infusion>c.horizon+1e-8))err.push(`Dose ${j+1}: IV infusion must be >0 and ≤24 hours and finish within the simulation`);
   });
 }
 return err;
}
// Optional exchange-level PD prescription. Each row begins relative to the start of a PD session.
// sessionStart is null for the repeating template, or the absolute hour at which a custom PD window starts.
function exchangesForSession(c,window){
 if(!c.pdRxEnabled)return [];
 const specific=c.pdRxRows.filter(x=>Number.isFinite(x.sessionStart)&&Math.abs(x.sessionStart-window.start)<1e-8);
 return specific.length?specific:c.pdRxRows.filter(x=>x.sessionStart==null);
}
function validatePdRx(c){
 if(!c.pdRxEnabled)return [];
 const rows=c.pdRxRows,errors=[];
 if(!Array.isArray(rows)||rows.length<1||rows.length>48)return ['PD prescription: provide 1–48 exchanges'];
 const groups=new Map();
 rows.forEach((r,i)=>{
  const prefix=`Exchange ${i+1}:`,scope=r.sessionStart??'all';
  if(r.sessionStart!==null&&r.sessionStart!==undefined&&(!Number.isFinite(r.sessionStart)||r.sessionStart<0||r.sessionStart>=c.horizon))errors.push(`${prefix} PD session start must be within simulation`);
  if(!Number.isFinite(r.start)||r.start<0||r.start>=24)errors.push(`${prefix} exchange offset must be 0–<24 hours`);
  if(!Number.isFinite(r.dwell)||r.dwell<=0||r.dwell>24)errors.push(`${prefix} dwell must be >0 and ≤24 hours`);
  if(Number.isFinite(r.start)&&Number.isFinite(r.dwell)&&r.start+r.dwell>24.00001)errors.push(`${prefix} exchange exceeds 24 hours`);
  if(!groups.has(scope))groups.set(scope,[]);groups.get(scope).push({r,i});
  if(!Number.isFinite(r.fill)||r.fill<0.3||r.fill>5)errors.push(`${prefix} fill must be 0.3–5 L`);
  if(!Number.isFinite(r.glucose)||r.glucose<1.3||r.glucose>4.5)errors.push(`${prefix} dextrose must be 1.3–4.5%`);
  if(r.uf!==null&&r.uf!==undefined&&(!Number.isFinite(r.uf)||r.uf< -1500||r.uf>3000))errors.push(`${prefix} measured net UF must be -1500–3000 mL or blank`);
 });
 for(const [scope,rr] of groups){
  let last=0;
  for(const {r,i} of rr.slice().sort((a,b)=>a.r.start-b.r.start)){
   if(r.start<last-1e-8)errors.push(`Exchange ${i+1}: exchanges overlap within ${scope==='all'?'repeating template':`PD session ${scope} h`}`);
   last=Math.max(last,r.start+r.dwell);
  }
 }
 // Explicit per-session rows may override a repeating template in the custom timeline.
 const customWindows=(c.schedule||[]).filter(x=>x.type==='PD');
 const specificRows=rows.filter(r=>r.sessionStart!=null);
 if(specificRows.length){
  for(const {sessionStart} of specificRows){
   if(!customWindows.some(w=>Math.abs(w.start-sessionStart)<1e-8))errors.push(`PD session ${sessionStart} h does not exist in Custom timeline`);
  }
 }
 for(const window of customWindows){
  const selected=exchangesForSession(c,window);
  if(!selected.length)errors.push(`PD window ${window.start}–${window.end} h has no exchanges; provide a repeating template or target this session`);
  for(const r of selected){if(r.start+r.dwell>window.end-window.start+1e-8)errors.push(`PD window ${window.start}–${window.end} h: exchange offset ${r.start} h and dwell ${r.dwell} h exceed the session length`);}
 }
 if(!rows.some(x=>x.sessionStart==null))errors.push('Include at least one repeating-template exchange for the standalone PD comparison');
 if(c.pdMethod==='cycler'&&rows.filter(x=>x.sessionStart==null).some(r=>r.start+r.dwell>c.apdHours+1e-8))errors.push('Cycler template exchanges must fit within configured cycler session duration');
 return [...new Set(errors)];
}
// Laskin et al. 1982 (Antimicrob Agents Chemother 21:804): oral probenecid lowered acyclovir renal
// clearance by 32% in three adults. Applied to the renal acyclovir term only; CMMG is not adjusted.
// Non-kidney CMMG clearance (L/h at 70 kg). 0.5 since #46 (was 0.25): Helldén 2007 [45] case 1 shows CMMG
// falling between HD sessions with an apparent half-life of about 35 h, and Hara 2008 single-dose CMMG peaks
// fit better (research/validation/HELLDEN-COTARD.md). Calibrated on the Helldén case; Hara is the check.
const CMMG_NONRENAL_CL=0.5;
const PROBENECID_RENAL=0.68;
// US acyclovir sodium injection label, renal impairment: percent of the recommended dose and interval.
function labelRenalAdjustment(crcl){
 if(!Number.isFinite(crcl)||crcl<0)return null;
 if(crcl>50)return {fraction:1,every:8,band:'above 50'};
 if(crcl>25)return {fraction:1,every:12,band:'>25–50'};
 if(crcl>10)return {fraction:1,every:24,band:'>10–25'};
 return {fraction:0.5,every:24,band:'≤10'};
}
function validate(c,mode,allowWindowBeyondHorizon=false){let err=[];
 if(c.labelBsa!==undefined&&c.labelBsa!==0&&(!Number.isFinite(c.labelBsa)||c.labelBsa<0))err.push('Label body surface area must be 0 (not provided) or a positive value in m²');
 if(c.probenecid!==undefined&&typeof c.probenecid!=='boolean')err.push('Probenecid must be on or off');
 if(!Number.isFinite(c.weight)||c.weight<=0)err.push('weight must be positive');
 if(!Number.isFinite(c.horizon)||c.horizon>336||c.horizon<1)err.push('Simulation duration must be 1–336 hours');
 if(!ROUTES.includes(c.route))err.push('Unsupported medication route');
 err.push(...validateDoses(c));
 err.push(...validateRenalProfile(c));
 if(!(c.valF>0&&c.valF<=1&&c.valKa>0))err.push('Oral bioavailability and absorption rate must be valid');
 if(c.hdDuration>24||c.hdDuration<=0)err.push('HD session duration must be >0 and ≤24 hours');
 if(c.apdHours>24||c.apdHours<=0)err.push('APD session duration must be >0 and ≤24 hours per day');
 if(!c.pdRxEnabled&&c.apdCycles*(c.apdDwell+c.apdTurnover)>c.apdHours+1e-8)err.push('APD cycle dwell + fill/drain exceeds APD session duration');
 if(c.capdDwell>24||c.capdDwell<=0)err.push('CAPD dwell must be >0 and ≤24 hours');
 if(!c.pdRxEnabled&&c.capdExchanges*c.capdDwell>24.001)err.push('CAPD exchanges × dwell may not exceed 24 hours/day');
 if(c.hdRepeat<c.hdDuration)err.push('HD repeat interval may not be shorter than its session duration');
 if(!Number.isFinite(c.crcl)||c.crcl<0||c.draws<1||c.draws>400)err.push('Residual CrCl / Monte Carlo samples outside range');
 if(!['manual','estimated'].includes(c.crclSource))err.push('CrCl input method is invalid');
 if(c.crclSource==='estimated'&&!Number.isFinite(cockcroftGault(c)))err.push('Cockcroft–Gault requires adult age, sex coefficient, weight, and serum creatinine');
 if(!['manual','cycler'].includes(c.pdMethod))err.push('PD prescription method must be manual or cycler');
 err.push(...validatePdRx(c));
 if(!Number.isFinite(c.vcScale)||c.vcScale<0.3||c.vcScale>2.5||!Number.isFinite(c.clearanceScale)||c.clearanceScale<0.2||c.clearanceScale>3)err.push('Calibration multipliers must remain within permitted bounds');
 if(mode==='Custom sequence'){
  if(!Array.isArray(c.schedule))err.push('Custom timeline missing');else{
   let last=0;for(const [i,row] of c.schedule.slice().sort((a,b)=>a.start-b.start).entries()){
    if(!TYPES.includes(row.type))err.push(`Row ${i+1}: unsupported modality`);
    if(!Number.isFinite(row.start)||!Number.isFinite(row.end)||row.start<0||(!allowWindowBeyondHorizon&&row.end>c.horizon))err.push(`Row ${i+1}: enter hours within 0–${c.horizon}`);
    if(row.end<=row.start)err.push(`Row ${i+1}: end must be after start (e.g. 36–32 is invalid)`);
    if(row.end-row.start>24+1e-8)err.push(`Row ${i+1}: maximum 24 hours per session; split longer continuous treatment into daily blocks`);
    if(row.start<last-1e-8)err.push(`Row ${i+1}: windows overlap; sequential transitions are allowed, concurrent modalities are not modeled`);
    last=Math.max(last,row.end);
    if(row.type==='PD'&&c.pdMethod==='cycler'&&!c.pdRxEnabled&&c.apdCycles*(c.apdDwell+c.apdTurnover)>row.end-row.start+1e-8)err.push(`Row ${i+1}: APD cycle plan exceeds this session's length`);
   }
  }
 }
 return [...new Set(err)];
}
function scheduleFor(mode,c){if(mode==='No dialysis')return [];
 if(mode==='Custom sequence')return c.schedule.slice().sort((a,b)=>a.start-b.start).map(x=>({...x,type:x.type==='PD'?(c.pdMethod==='cycler'?'APD':'CAPD'):x.type}));
 const method=mode==='Peritoneal dialysis'?(c.pdMethod==='cycler'?'APD':'CAPD'):mode;
 let rows=[];
 if(mode==='Intermittent HD'){for(let t=c.hdStart;t<c.horizon;t+=c.hdRepeat)rows.push({type:'HD',start:t,end:Math.min(c.horizon,t+c.hdDuration)});}
 else if(method==='APD'){for(let d=0;d<c.horizon/24+1;d++){let st=d*24+c.apdStart; // start within calendar day; do not truncate overnight
 if(st<c.horizon)rows.push({type:'APD',start:st,end:st+c.apdHours});
 if(d===0&&c.apdStart>0){/* No carryover from a prior day at t=0; simulation starts with a new treatment calendar. */}}
 }
 else {for(let t=0;t<c.horizon;t+=24)rows.push({type:method,start:t,end:method==='CAPD'?t+24:Math.min(c.horizon,t+24)});}
 return rows;}
function scheduleError(c,mode){const errs=validate(c,mode);if(mode!=='Custom sequence')return errs;return errs;}
function drawParams(c){let random=rng(), norm=()=>Math.sqrt(-2*Math.log(Math.max(1e-10,random())))*Math.cos(2*Math.PI*random());
 let logn=cv=>{const s=Math.sqrt(Math.log(1+cv*cv));return Math.exp(-s*s/2+s*norm());};
 let params=[],scale=Math.pow(c.weight/70,0.75),v=c.variability;
 // Under a dynamic profile the sampled renal rates are per 1 mL/min CrCl;
 // fixed mode retains the original sampled parameters exactly.
 const sampledCrCl=c.renalMode==='profile'?1:c.crcl;
 for(let i=0;i<c.draws;i++)params.push({
 vc:0.32*c.weight*(c.vcScale||1)*logn(0.20*v),vp:0.37*c.weight*logn(0.25*v),q:10*scale*logn(0.35*v),
 other:0.12*scale*(c.clearanceScale||1)*logn(0.35*v),renal:0.202*sampledCrCl*scale*(c.clearanceScale||1)*(c.probenecid?PROBENECID_RENAL:1)*logn(0.35*v),form:1.6*c.formFactor*scale*logn(0.5*v),
 vm:0.4*c.weight*logn(0.35*v),mr:0.12*sampledCrCl*c.metRenal*scale*logn(0.65*v),mn:CMMG_NONRENAL_CL*scale*logn(0.6*v),
 hd:c.hdCl*0.06*logn(0.2*v), pd:c.pdCl*0.06*logn(0.35*v),
 crrt:c.effluent*c.weight/1000*c.sieving*c.delivered*logn(0.25*v),
 kp:Math.min(1.3,c.csfRatio*logn(0.4*v)),km:Math.min(1.3,c.csfMetRatio*logn(0.55*v)),
 // Label: 54.5% ± 9.1% after a 1 g oral valacyclovir dose. Uncertainty is indicative, not a fitted oral popPK.
 oralF:Math.min(1,Math.max(.02,c.valF*logn((.091/.545)*v))),oralKa:c.valKa*logn(.3*v)
 });return params;}
function activeWindow(t,rows,c){for(let i=0;i<rows.length;i++){let r=rows[i];if(t<r.start)break;if(t>=r.start-1e-10 && t<r.end-1e-10){
 if((r.type==='CAPD'||r.type==='APD')&&c.pdRxEnabled){return {type:r.type,active:!!pdStatus(t,rows,c)};}
 if(r.type==='APD'){
 const cycle=c.apdDwell+c.apdTurnover,local=t-r.start;
 if(local>=c.apdCycles*cycle-1e-10)return {type:r.type,active:false};
 const phase=local%cycle;
 return {type:r.type,active:phase<c.apdDwell-1e-10};
 }return {type:r.type,active:true};}}
 return {type:null,active:false};}
function dialClear(t,rows,c,p){const a=activeWindow(t,rows,c);if(!a.active)return 0;
 if(a.type==='HD')return p.hd;
 if(a.type==='CAPD')return p.pd * (c.pdVolume/2) * (c.capdExchanges/4); // assumed linear proxy, NOT measured drug transport
 if(a.type==='APD')return p.pd * (c.pdVolume/2) * c.apdFactor; // active during specified dwell only; unvalidated
 if(a.type==='CRRT')return p.crrt;return 0;}
function pdStatus(t,rows,c){
 for(const r of rows){if(r.type!=='CAPD'&&r.type!=='APD')continue;
  if(t<r.start-1e-10||t>=r.end-1e-10)continue;
  const age=t-r.start;
  if(c.pdRxEnabled){
   const selected=exchangesForSession(c,r);
   for(let j=0;j<selected.length;j++){
    const x=selected[j],begin=r.start+x.start,end=Math.min(r.end,begin+x.dwell);
    if(t>=begin-1e-10&&t<end-1e-10)return {key:`${r.start}/${r.type}/rx/${j}`,start:begin,age:t-begin,type:r.type,fillL:x.fill,glucose:x.glucose,ufMl:x.uf,dwell:x.dwell};
   }
   return null;
  }
  if(r.type==='CAPD'){
   const j=Math.floor((age+1e-9)/c.capdDwell),dwellStart=r.start+j*c.capdDwell;
   if(j>=c.capdExchanges)return null;
   return {key:`${r.start}/CAPD/${j}`,start:dwellStart,age:t-dwellStart,type:'CAPD'};
  }
  const cyc=c.apdDwell+c.apdTurnover,j=Math.floor((age+1e-9)/cyc),phase=age-j*cyc;
  if(j>=c.apdCycles||phase>=c.apdDwell-1e-9)return null;
  return {key:`${r.start}/APD/${j}`,start:r.start+j*cyc,age:phase,type:'APD'};
 }
 return null;
}
function pdTransfer(c,p,time,C,amount,volume,status){
 if(!status)return {flux:0,uf:0,netVolume:0};
 // Exploratory membrane transfer, not an empirically fitted three-pore model.
 // Glucose gradient decreases over each dwell; rate depends on illustrative transport class.
 const tau=({0.7:3.6,1:2.4,1.3:1.35})[String(c.pdTransport)]||2.4;
 const fill=status.fillL??c.pdVolume;
 const g=(status.glucose??c.pdGlucose)*Math.exp(-status.age/tau);
 const absorb=c.pdAbsorb/1000; // L/h
 // If observed net UF is entered, honor the observed *net volume gain* over its dwell.
 // This is not a measured small-pore water fraction; the convective fraction remains assumed.
 const measured=status.ufMl!==null&&status.ufMl!==undefined;
 const rawUF=measured?Math.max(0,(status.ufMl/1000/status.dwell)+absorb):Math.max(0,(c.pdUfBase/1000)*(g/2.5)*Math.pow(fill/2,.25));
 const netUF=measured?(status.ufMl/1000/status.dwell):(rawUF-absorb);
 const smallPoreUF=rawUF*c.pdSmallPore;
 const Cd=amount/Math.max(.2,volume);
 const PS=p.pd*c.pdTransport*Math.pow(fill/2,.45);
 const diff=PS*(C-Cd);
 const conv=smallPoreUF*(1-c.pdSigma)*C;
 const returnFlux=absorb*Cd; // simplified fluid reabsorption returns solute to plasma
 return {flux:diff+conv-returnFlux,uf:netUF*1000,netVolume:netUF};
}
function timeGrid(c,rows,dt,doses=buildDoses(c)){
 const pts=new Set([0,c.horizon]);
 function put(t){if(Number.isFinite(t)&&t>0&&t<c.horizon)pts.add(+t.toFixed(9));}
 for(let t=0;t<c.horizon;t+=dt)put(t);
 if(c.renalMode==='profile')for(const point of c.renalProfile)put(point.time);
 for(const r of rows){put(r.start);put(r.end);
  if((r.type==='CAPD'||r.type==='APD')&&c.pdRxEnabled){for(const x of exchangesForSession(c,r)){put(r.start+x.start);put(Math.min(r.end,r.start+x.start+x.dwell));}continue;}
  if(r.type==='APD'){let cyc=c.apdDwell+c.apdTurnover;for(let j=0;j<c.apdCycles;j++){put(r.start+j*cyc);put(Math.min(r.end,r.start+j*cyc+c.apdDwell));}}
  if(r.type==='CAPD'){for(let j=0;j<=c.capdExchanges;j++)put(Math.min(r.end,r.start+j*c.capdDwell));}
 }
 for(const dose of doses){put(dose.time);if(dose.route==='Acyclovir IV')put(dose.time+dose.infusion);}
 return [...pts].sort((a,b)=>a-b);
}
// Precompute treatment/medication events once per scenario, then reuse for every
// Monte Carlo parameter draw. Event times and treatment assignments do not
// depend on sampled pharmacokinetic parameters.
function prepareEvents(c,rows,dt,doses=buildDoses(c)){
 const tarr=timeGrid(c,rows,dt,doses);
 const pdAt=tarr.map(t=>pdStatus(t,rows,c));
 const activeAt=tarr.map(t=>activeWindow(t,rows,c));
 const midPD=[],midActive=[],ivRate=[],oralDose=[];
 for(let i=0;i<tarr.length;i++){
  const t=tarr[i];let oral=0;
  for(const d of doses)if(d.route==='Valacyclovir oral'&&Math.abs(t-d.time)<1e-7)oral+=d.amount*(ACV_MW/VAL_MW);
  oralDose.push(oral);
  if(i===tarr.length-1)continue;
  const mid=(t+tarr[i+1])/2;
  midPD.push(pdStatus(mid,rows,c));midActive.push(activeWindow(mid,rows,c));
  let rate=0;for(const d of doses)if(d.route==='Acyclovir IV'&&mid>=d.time-1e-10&&mid<d.time+d.infusion-1e-10)rate+=d.amount/d.infusion;
  ivRate.push(rate);
 }
 return {tarr,pdAt,activeAt,midPD,midActive,ivRate,oralDose};
}
function single(c,p,rows,dt,doses=buildDoses(c),events=null){
 const timeline=events||prepareEvents(c,rows,dt,doses);
 const tarr=timeline.tarr,cols={plasma:[],csf:[],cmmg:[],csfCmmg:[],kidneyClear:[],cmmgKidneyClear:[],clearance:[],dialClear:[],dialRate:[],pdUF:[],pdDialConc:[]};
 let a=0,b=0,m=0,oralDepot=0,sc=0,sm=0,auc=0,csfAuc=0,mass=0,peak=0,csfPeak=0,mPeak=0;
 let administeredAcyclovirEqMg=0,systemicEliminationMg=0;
 const accounting=c.trackMassBalance?[]:null;
 const drains=accounting?[]:null;
 const removed={kidney:0,other:0,formed:0,hd:0,crrt:0,pdDrained:0};
 let pdAmount=0,pdVol=c.pdVolume,pdKey=null,pdScheduledEnd=null;
 const mw=239.19/225.21;
 // Terminal eigenvalue of the no-dialysis linear central-peripheral disposition model.
 // Not a measured or validated half-life; only meaningful if clearance remains fixed.
 const renalAt=t=>c.renalMode==='profile'?p.renal*renalCrClAt(c,t):p.renal;
 const metaboliteRenalAt=t=>c.renalMode==='profile'?p.mr*renalCrClAt(c,t):p.mr;
 const aRate=(p.other+renalAt(0)+p.form+p.q)/p.vc,bRate=p.q/p.vp;
 const slowRate=Math.max(1e-9,(aRate+bRate-Math.sqrt(Math.pow(aRate-bRate,2)+4*p.q*p.q/(p.vc*p.vp)))/2);
 const modelHalfLife=Math.log(2)/slowRate;
 for(let i=0;i<tarr.length;i++){
  const t=tarr[i],currentPD=timeline.pdAt[i];
  const newKey=currentPD?currentPD.key:null;
  if(pdKey!==newKey){
   if(pdKey!==null){
    mass+=pdAmount;
    if(accounting){
     removed.pdDrained+=pdAmount;
     drains.push({start:timeline.pdAt[i-1].start,end:t,mass:pdAmount,volume:pdVol,concentration:pdAmount/pdVol,complete:t>=pdScheduledEnd-1e-8});
    }
   }
   pdAmount=0;
   pdVol=currentPD?.fillL??c.pdVolume;
   pdKey=newKey;
   pdScheduledEnd=currentPD?currentPD.start+(currentPD.dwell??(currentPD.type==='CAPD'?c.capdDwell:c.apdDwell)):null;
  }
  const absorbedDose=timeline.oralDose[i]*p.oralF;
  oralDepot+=absorbedDose;administeredAcyclovirEqMg+=absorbedDose;
  const C=a/p.vc,CM=m/p.vm,active=timeline.activeAt[i],isHD=active.active&&active.type==='HD',isCRRT=active.active&&active.type==='CRRT',dial=(isHD?p.hd:isCRRT?p.crrt:0);
  const pd=pdTransfer(c,p,t,C,pdAmount,pdVol,currentPD),netFlux=dial*C+pd.flux;
  const dialCL=C>1e-10?netFlux/C:(dial+(currentPD?p.pd:0));
  cols.plasma.push(C);cols.cmmg.push(CM);cols.csf.push(sc);cols.csfCmmg.push(sm);
  cols.kidneyClear.push(renalAt(t)/.06);cols.cmmgKidneyClear.push(metaboliteRenalAt(t)/.06);
  cols.clearance.push((p.other+renalAt(t)+p.form+dialCL)/.06);
  cols.dialClear.push(dialCL/.06);cols.dialRate.push(netFlux);
  cols.pdUF.push(currentPD?pd.uf:0);cols.pdDialConc.push(currentPD?pdAmount/pdVol:0);
  peak=Math.max(peak,C);csfPeak=Math.max(csfPeak,sc);mPeak=Math.max(mPeak,CM);
  if(accounting){
   const parts={central:a,peripheral:b,depot:oralDepot,pdFluid:pdAmount,...removed};
   const accounted=Object.values(parts).reduce((sum,v)=>sum+v,0);
   accounting.push({time:t,pdVolume:pdVol,input:administeredAcyclovirEqMg,parts,residual:administeredAcyclovirEqMg-accounted});
  }
  if(i===tarr.length-1)break;
  const step=tarr[i+1]-t,mid=t+step/2,midPD=timeline.midPD[i],midActive=timeline.midActive[i],ivRate=timeline.ivRate[i],midDial=midActive.active?(midActive.type==='HD'?p.hd:midActive.type==='CRRT'?p.crrt:0):0;
  // Integrate central/peripheral, metabolite, oral depot, PD drug amount and PD fluid volume.
  function rhs(A,B,M,D,P,V,kTime){
   const cc=A/p.vc,cp=B/p.vp,ex=p.q*(cc-cp),mem=pdTransfer(c,p,mid,cc,P,V,midPD),net=midDial*cc+mem.flux;
   const dA=ivRate+p.oralKa*D-(p.other+renalAt(kTime)+p.form)*cc-ex-net;
   const dB=ex,dM=p.form*cc*mw-(p.mn+metaboliteRenalAt(kTime)+(midDial+(midPD?p.pd:0))*c.metDial)*M/p.vm;
   return [dA,dB,dM,-p.oralKa*D,mem.flux,mem.netVolume,renalAt(kTime)*cc,p.other*cc,p.form*cc,midDial*cc];
  }
  let x=[a,b,m,oralDepot,pdAmount,pdVol];
  function stage(x,k,f){return x.map((v,j)=>v+f*step*k[j]);}
  const k1=rhs(...x,t),k2=rhs(...stage(x,k1,.5),mid),k3=rhs(...stage(x,k2,.5),mid),k4=rhs(...stage(x,k3,1),t+step);
  const flux=j=>step*(k1[j]+2*k2[j]+2*k3[j]+k4[j])/6;
  const kidney=flux(6),other=flux(7),formed=flux(8),dialysed=flux(9);
  systemicEliminationMg+=kidney+other+formed;
  mass+=dialysed;
  if(accounting){
   removed.kidney+=kidney;removed.other+=other;removed.formed+=formed;
   if(midActive.type==='HD')removed.hd+=dialysed;
   if(midActive.type==='CRRT')removed.crrt+=dialysed;
  }
  const y=x.map((v,j)=>v+step*(k1[j]+2*k2[j]+2*k3[j]+k4[j])/6);
  const na=Math.max(0,y[0]),nb=Math.max(0,y[1]),nm=Math.max(0,y[2]),nd=Math.max(0,y[3]);
  pdAmount=Math.max(0,y[4]);pdVol=Math.max(.2,y[5]);
  const nextC=na/p.vc,nextM=nm/p.vm;
  const nsc=Math.max(0,sc+step*(p.kp*(C+nextC)/2-sc)/c.csfLag),nsm=Math.max(0,sm+step*(p.km*(CM+nextM)/2-sm)/c.csfMetLag);
  auc+=step*(C+nextC)/2;csfAuc+=step*(sc+nsc)/2;
  administeredAcyclovirEqMg+=ivRate*step;
  a=na;b=nb;m=nm;oralDepot=nd;sc=nsc;sm=nsm;
 }
 // If the final dwell has not drained, drug remaining in the cavity is NOT counted as drained mass.
 const massBalanceErrorMg=administeredAcyclovirEqMg-(a+b+oralDepot+pdAmount+systemicEliminationMg+mass);
 return {...(accounting?{accounting,drains}:{}),t:tarr,cols,summary:{peak,auc,csfPeak,csfAuc,mPeak,mass,modelHalfLife,endPlasma:a/p.vc,
  administeredAcyclovirEqMg,massBalanceErrorMg,endPdFluidMg:pdAmount}};
}

// Literature anchor: US IV acyclovir label, normal renal function, 1-hour infusions q8h.
// No patient-level creatinine clearance or weight distribution is reported in the label table.
// Therefore 70 kg and CrCl 95 mL/min below are NOMINAL assumptions, not matched subjects.
const BENCHMARK_REFERENCE=[
 {mgkg:5,peak:9.8,trough:0.7,n:8},
 {mgkg:10,peak:22.9,trough:1.9,n:7}
];
function benchmark(c){
 const cfg={...DEFAULTS,vcScale:c.vcScale??1,clearanceScale:c.clearanceScale??1,
  weight:70,crcl:95,crclSource:'manual',dose:700,every:8,doseCount:10,horizon:80,route:'Acyclovir IV',dosingMode:'repeat',infusion:1,draws:1,variability:0,pdRxEnabled:false};
 const pr=drawParams(cfg)[0],sim=single(cfg,pr,[],0.25,buildDoses(cfg));
 const peak10=interp(sim.t,sim.cols.plasma,73),trough10=interp(sim.t,sim.cols.plasma,80);
 return BENCHMARK_REFERENCE.map(r=>({
  ...r,modelPeak:peak10*r.mgkg/10,modelTrough:trough10*r.mgkg/10,
  // log-ratio loss treats high and low concentrations symmetrically.
  errorPeakPct:100*(peak10*r.mgkg/10/r.peak-1),errorTroughPct:100*(trough10*r.mgkg/10/r.trough-1)
 }));
}
function benchmarkLoss(rows){return rows.reduce((s,r)=>s+Math.log(r.modelPeak/r.peak)**2+Math.log(r.modelTrough/r.trough)**2,0);}
function fitBenchmark(c){
 let best={vcScale:1,clearanceScale:1,loss:Infinity};
 function tryFit(v,cl){
  if(v<.3||v>2.5||cl<.2||cl>3)return;
  const rows=benchmark({...c,vcScale:v,clearanceScale:cl}),loss=benchmarkLoss(rows);
  if(loss<best.loss)best={vcScale:v,clearanceScale:cl,loss};
 }
 for(let i=0;i<=12;i++)for(let j=0;j<=12;j++)tryFit(.55+i*.085,.40+j*.115);
 const initial={...best};
 for(let i=-6;i<=6;i++)for(let j=-6;j<=6;j++)tryFit(initial.vcScale+i*.012,initial.clearanceScale+j*.018);
 return {...best,rows:benchmark({...c,...best})};
}
function sensitivity(c,mode){
 const config={...effectiveConfig(c),crclSource:'manual',draws:1,variability:0};
 const base=single(config,drawParams(config)[0],scheduleFor(mode,config),.25,buildDoses(config));
 const dialysing=['Intermittent HD','Peritoneal dialysis','CRRT','Custom sequence'].includes(mode);
 const hasPD=mode==='Peritoneal dialysis'||(mode==='Custom sequence'&&config.schedule.some(r=>r.type==='PD'));
 const hasHD=mode==='Intermittent HD'||(mode==='Custom sequence'&&config.schedule.some(r=>r.type==='HD'));
 const hasCRRT=mode==='CRRT'||(mode==='Custom sequence'&&config.schedule.some(r=>r.type==='CRRT'));
 const oral=config.dosingMode==='repeat'?config.route==='Valacyclovir oral':config.customDoses.some(d=>d.route==='Valacyclovir oral');
 const factors=(config.renalMode==='profile'?[]:[['crcl','Residual CrCl']]).concat([['vcScale','Central distribution volume'],['clearanceScale','Plasma clearance multiplier'],['csfRatio','CSF/plasma partition'],['formFactor','CMMG formation factor']]);
 if(hasPD)factors.push(['pdCl','PD membrane solute transfer'],['pdGlucose','PD dextrose (uniform base)'],['pdUfBase','PD osmotic UF coefficient']);
 if(hasHD)factors.push(['hdCl','Hemodialysis clearance']);
 if(hasCRRT)factors.push(['effluent','CRRT effluent rate']);
 if(oral)factors.push(['valF','Oral acyclovir bioavailability']);
 const fields=['auc','csfPeak','mPeak','mass'];
 const outcomes=factors.map(([key,label])=>{
  const val=config[key];if(!(val>0))return {key,label,na:true,imp:0};
  const run=mult=>{
   const conf={...config,[key]:val*mult};
   const raw=single(conf,drawParams(conf)[0],scheduleFor(mode,conf),.25,buildDoses(conf));
   return raw.summary;
  };
  const low=run(.8),high=run(1.2),effects={};
  for(const metric of fields){const reference=base.summary[metric];effects[metric]=reference>1e-10?
   {down:100*(low[metric]/reference-1),up:100*(high[metric]/reference-1)}:null;}
  const imp=Math.max(0,...Object.values(effects).filter(Boolean).map(d=>Math.max(Math.abs(d.down),Math.abs(d.up))));
  return {key,label,na:false,effects,imp};
 }).sort((a,b)=>b.imp-a.imp);
 return {mode,base:base.summary,outcomes,delta:20};
}


function anuricBenchmark(c){
 const cfg={...DEFAULTS,vcScale:c.vcScale??1,clearanceScale:c.clearanceScale??1,
  weight:70,crcl:0,crclSource:'manual',dose:175,every:24,doseCount:1,horizon:24,route:'Acyclovir IV',
  dosingMode:'repeat',infusion:1,draws:1,variability:0,pdRxEnabled:false};
 const p=drawParams(cfg)[0],sim=single(cfg,p,[],.25,buildDoses(cfg));
 const convert=225.21/1000;
 return [{hour:1,mean:37.5,sd:23.3},{hour:8,mean:10.3,sd:2.9},{hour:24,mean:6.4,sd:2.4}]
  .map(r=>({...r,meanMg:r.mean*convert,sdMg:r.sd*convert,modelMg:interp(sim.t,sim.cols.plasma,r.hour)}));
}

function summary(v,coverage){let a=quantile(v,0.5),z=(1-coverage)/2;return {median:a,lower:quantile(v,z),upper:quantile(v,1-z)};}
function weightedQuantile(vals,weights,q){const pairs=vals.map((v,j)=>[v,weights[j]]).sort((a,b)=>a[0]-b[0]);let sum=weights.reduce((a,b)=>a+b,0),cur=0;for(let [v,w] of pairs){cur+=w;if(cur>=q*sum)return v;}return pairs[pairs.length-1][0];}
function weightedStat(v,weights,coverage){
 // Reuse one stable sort and cumulative-weight pass for all three quantiles.
 const pairs=v.map((value,j)=>[value,weights[j]]).sort((a,b)=>a[0]-b[0]);
 const sum=weights.reduce((a,b)=>a+b,0),z=(1-coverage)/2,qs=[z,.5,1-z],values=[];
 let cur=0,next=0;
 for(const [value,w] of pairs){cur+=w;while(next<qs.length&&cur>=qs[next]*sum)values[next++]=value;}
 while(next<qs.length)values[next++]=pairs[pairs.length-1][0];
 return {median:values[1],lower:values[0],upper:values[2]};
}
function interp(time,values,t){if(t<=time[0])return values[0];if(t>=time[time.length-1])return values[values.length-1];let lo=0,hi=time.length-1;while(hi-lo>1){let m=(lo+hi)>>1;if(time[m]<t)lo=m;else hi=m;}const f=(t-time[lo])/(time[hi]-time[lo]);return values[lo]*(1-f)+values[hi]*f;}
function posterior(raw,c){
 const obs=(c.observations||[]).filter(x=>x.role==='fit'),n=raw.length;
 if(!obs.length)return {weights:Array(n).fill(1/n),ess:n,fitted:0};
 const logw=raw.map(one=>{
  let log=0;
  for(const x of obs){const pred=interp(one.t,one.cols[x.analyte],x.time),sd=Math.max(.1,pred*c.assayCV);log+=-0.5*Math.pow((x.value-pred)/sd,2)-Math.log(sd);}
  return log;
 });
 const max=Math.max(...logw),unnorm=logw.map(x=>Math.exp(x-max)),z=unnorm.reduce((a,b)=>a+b,0),weights=unnorm.map(x=>x/z);
 return {weights,ess:1/weights.reduce((a,b)=>a+b*b,0),fitted:obs.length};
}
// CDF approximation for the Gaussian assay-error model used in posterior().
function normalCdf(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const tail = Math.exp(-z*z/2) / Math.sqrt(2*Math.PI) * t *
    (0.319381530 + t*(-0.356563782 + t*(1.781477937 + t*(-1.821255978 + t*1.330274429))));
  return z >= 0 ? 1-tail : tail;
}

function forecastInterval(predictions, weights, assayCV) {
  const sd = predictions.map(mean => Math.max(0.1, assayCV*mean));
  const upperBound = Math.max(...predictions.map((mean,i) => mean+8*sd[i]));
  function quantile(probability) {
    let lo = 0, hi = upperBound;
    for (let step=0; step<45; step++) {
      const mid = (lo+hi)/2;
      const cdf = predictions.reduce((sum,mean,i) =>
        sum + weights[i]*normalCdf((mid-mean)/sd[i]), 0);
      if (cdf < probability) lo = mid;
      else hi = mid;
    }
    return (lo+hi)/2;
  }
  return {median:quantile(0.5), lower:quantile(0.05), upper:quantile(0.95)};
}

function nextForecast(raw, c) {
  const cutoff = c.forecastCutoff;
  if (!Number.isFinite(cutoff) || cutoff < 0 || cutoff > c.horizon) return null;
  const observations = c.observations || [];
  const earlier = observations.filter(row => row.role === 'fit' && row.time <= cutoff);
  const future = observations.filter(row => row.time > cutoff && row.time <= c.horizon);
  if (!future.length) return {cutoff, fitted:earlier.length, targets:[]};
  const nextTime = Math.min(...future.map(row => row.time));
  const updated = posterior(raw, {...c, observations:earlier});
  const prior = raw.map(() => 1/raw.length);
  const targets = future.filter(row => row.time === nextTime).map(row => {
    const values = raw.map(one => interp(one.t, one.cols[row.analyte], nextTime));
    return {analyte:row.analyte, time:nextTime, observed:row.value,
      population:forecastInterval(values, prior, c.assayCV),
      updated:forecastInterval(values, updated.weights, c.assayCV)};
  });
  return {cutoff, fitted:earlier.length, ess:updated.ess, targets};
}

function evaluateHoldouts(raw,c,weights){
 const hold=(c.observations||[]).filter(x=>x.role==='holdout');let covered=0,lines=[];
 const random=rng(873415),norm=()=>Math.sqrt(-2*Math.log(Math.max(1e-10,random())))*Math.cos(2*Math.PI*random());
 for(const x of hold){
  // Predict independent measured concentrations, adding assumed measurement noise to latent PK draws.
  const pred=raw.map(one=>interp(one.t,one.cols[x.analyte],x.time));
  const measured=pred.map(y=>Math.max(0,y+norm()*Math.max(.1,c.assayCV*y)));
  const lo=weightedQuantile(measured,weights,.05),hi=weightedQuantile(measured,weights,.95),hit=x.value>=lo&&x.value<=hi;
  const predicted=weightedQuantile(pred,weights,.5);
  covered+=+hit;lines.push({hour:x.time,analyte:x.analyte,observed:x.value,predicted,lo,hi,hit});
 }
 let n=hold.length,frac=n?covered/n:null,ci=null;
 if(n){let z=1.96,den=1+z*z/n,mid=(frac+z*z/(2*n))/den,rad=z*Math.sqrt(frac*(1-frac)/n+z*z/(4*n*n))/den;ci=[Math.max(0,mid-rad),Math.min(1,mid+rad)];}
 return {n,covered,fraction:frac,ci,lines};
}
function summarizeRaw(raw,c,weights,mode,rows,doses){
 let out={mode,rows,doses,time:raw[0].t};
 for(let k of Object.keys(raw[0].cols)){
  let med=[],lo=[],hi=[];for(let j=0;j<out.time.length;j++){
   const values=raw.map(d=>d.cols[k][j]),st=weightedStat(values,weights,c.coverage);med.push(st.median);lo.push(st.lower);hi.push(st.upper);}
  out[k]={median:med,lower:lo,upper:hi};
 }
 out.summary={};for(const k of Object.keys(raw[0].summary))out.summary[k]=weightedStat(raw.map(d=>d.summary[k]),weights,c.coverage);
 return out;
}
function effectiveConfig(c){return c.crclSource==='estimated'?{...c,crcl:cockcroftGault(c)}:c;}
function simulate(c,mode,draws=null){c=effectiveConfig(c);const errors=scheduleError(c,mode);if(errors.length)throw new Error(errors.join('; '));
 const rows=scheduleFor(mode,c),doses=buildDoses(c),p=draws||drawParams(c);
 const events=prepareEvents(c,rows,0.25,doses),raw=p.map(q=>single(c,q,rows,0.25,doses,events));
 return summarizeRaw(raw,c,Array(raw.length).fill(1/raw.length),mode,rows,doses);
}
function createSimulator(){
 // Cache the latest *kinetic* ensemble. A mode is simulated only when requested,
 // and stays cached if the clinician later enables a comparison curve.
 let cached=null;
 return function simulateMany(c){
 c=effectiveConfig(c);
 const {forecastCutoff,requestedModes,coverage,observations,assayCV,fitMode,virus,showBands,showShades,showStudy,showIC50,...kinetics}=c;
 const key=JSON.stringify(kinetics);
 const selectedMode=MODES.includes(c.fitMode)?c.fitMode:'No dialysis';
 const chosen=Array.isArray(requestedModes)?requestedModes:MODES;
 if(!Array.isArray(chosen)||chosen.some(m=>!MODES.includes(m)))throw Error('Unknown dialysis scenario requested.');
 const needed=[...new Set([selectedMode,...chosen])];
 if(!cached||cached.key!==key){
   cached={key,params:drawParams(c),rawByMode:{},rowsByMode:{},doses:buildDoses(c),summaries:{},draws:c.draws,summaryKey:null};
 }
 for(const mode of needed){
   if(cached.rawByMode[mode])continue;
   const scenario=mode==='Custom sequence'?{...c,schedule:(c.schedule||[]).filter(r=>Number.isFinite(r.start)&&r.start<c.horizon)}:c;
   const errs=validate(scenario,mode,true);if(errs.length)throw Error(errs.join('; '));
   // Retain prescribed session ends for the solver when the displayed timeline is clipped.
   const rows=scheduleFor(mode,scenario),events=prepareEvents(scenario,rows,.25,cached.doses);
   cached.rowsByMode[mode]=rows.map(r=>({...r,end:Math.min(r.end,c.horizon)}));
   cached.rawByMode[mode]=cached.params.map(q=>single(scenario,q,rows,.25,cached.doses,events));
 }
 const post=posterior(cached.rawByMode[selectedMode],c),summaryKey=JSON.stringify([c.coverage,post.weights]);
 if(cached.summaryKey!==summaryKey){cached.summaries={};cached.summaryKey=summaryKey;}
 const out={};
 for(const mode of needed){
   if(!cached.summaries[mode])cached.summaries[mode]=summarizeRaw(cached.rawByMode[mode],c,post.weights,mode,cached.rowsByMode[mode],cached.doses);
   out[mode]=cached.summaries[mode];
 }
 return {...out,_validation:{forecast:nextForecast(cached.rawByMode[selectedMode],c),...evaluateHoldouts(cached.rawByMode[selectedMode],c,post.weights),ess:post.ess,fitted:post.fitted,draws:cached.draws,fitMode:selectedMode}};
 };
}
const simulateMany=createSimulator();
const api={renalCrClAt,labelRenalAdjustment,PROBENECID_RENAL,CMMG_NONRENAL_CL,validateRenalProfile,prepareEvents,MODES,TYPES,ROUTES,MAX_DOSE_MG,MARKER,DEFAULTS,cockcroftGault,effectiveConfig,buildDoses,validateDoses,validate,scheduleFor,activeWindow,dialClear,drawParams,pdStatus,pdTransfer,validatePdRx,exchangesForSession,timeGrid,single,benchmark,anuricBenchmark,fitBenchmark,sensitivity,simulate,simulateMany,createSimulator,posterior,evaluateHoldouts,weightedStat};
if(typeof module==='object'&&module.exports)module.exports=api;
root.RenalPKV7=api;
})(typeof window!=='undefined'?window:globalThis);





