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
'use strict';
// Pure helpers for two teaching tools. Neither changes the PK model.
//  1. Regimen comparison: frozen snapshots of up to four named regimens and
//     metrics computed over one shared time window.
//  2. Post-hemodialysis dose timing: a preview of what the product labels say
//     about dosing around intermittent hemodialysis, before anything is applied.
// Times are hours from the start of the simulation; amounts are mg;
// concentrations are mg/L. Unit conversion for display happens in the UI.
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.AyFluxRegimens=api;
})(typeof self!=='undefined'?self:this,function(){

const MAX_REGIMENS=4;
// Display rule, not a label rule: two dose starts closer than this are flagged
// as a possible duplicate in the post-dialysis preview.
const NEAR_DOSE_H=2;
const IV='Acyclovir IV',VAL='Valacyclovir oral';
const CONC_KEYS=['plasma','csf','cmmg','csfCmmg'];

// ---------- Regimen comparison ----------

function deepFreeze(value){
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  Object.freeze(value);
  for(const key of Object.keys(value))deepFreeze(value[key]);
 }
 return value;
}

// Names are shown in chart legends and tooltips, so markup characters are removed.
function cleanName(name,fallback){
 const text=String(name??'').replace(/[<>&"'`]/g,'').replace(/\s+/g,' ').trim().slice(0,40);
 return text||fallback;
}

function nextName(regimens){
 const used=new Set(regimens.map(r=>r.name));
 for(const letter of 'ABCD')if(!used.has('Regimen '+letter))return 'Regimen '+letter;
 return 'Regimen '+(regimens.length+1);
}

// Freeze a regimen: its inputs, its concentration curves and its dose times.
// Later edits to the live settings or results cannot reach the copy.
function snapshotRegimen({id,name,primary,config,data,doseTimes,savedAt}){
 const kept={time:data.time,summary:data.summary};
 for(const key of CONC_KEYS)kept[key]=data[key];
 return deepFreeze(structuredClone({
  id:String(id),name:cleanName(name,'Regimen'),primary:String(primary),config,data:kept,
  doseTimes:Array.from(doseTimes||[]).filter(Number.isFinite).sort((a,b)=>a-b),
  savedAt:String(savedAt||new Date().toISOString())
 }));
}

function valueAt(time,values,t){
 const n=time.length;
 if(!n)return NaN;
 if(t<=time[0])return values[0];
 if(t>=time[n-1])return values[n-1];
 let lo=0,hi=n-1;
 while(hi-lo>1){const m=(lo+hi)>>1;if(time[m]<=t)lo=m;else hi=m;}
 if(time[lo]===t)return values[lo];
 const f=(t-time[lo])/(time[hi]-time[lo]);
 return values[lo]*(1-f)+values[hi]*f;
}

// Trapezoidal area from the first time point up to `end`, interpolating at `end`.
function areaTo(time,values,end){
 let area=0;
 for(let i=0;i+1<time.length&&time[i]<end;i++){
  const t1=Math.min(time[i+1],end),v1=time[i+1]<=end?values[i+1]:valueAt(time,values,end);
  area+=0.5*(values[i]+v1)*(t1-time[i]);
 }
 return area;
}

function peakTo(time,values,end){
 let peak=-Infinity;
 for(let i=0;i<time.length&&time[i]<=end;i++)peak=Math.max(peak,values[i]);
 return Math.max(peak,valueAt(time,values,end));
}

// The shared window ends at the earliest last time point among the curves compared,
// so every regimen is integrated over exactly the same hours.
function commonWindow(curves){
 const ends=curves.map(d=>d.time[d.time.length-1]).filter(Number.isFinite);
 return ends.length?Math.min(...ends):NaN;
}

// Trough: the median plasma acyclovir concentration at the start time of the last
// dose that begins after hour 0 and before the end of the window, i.e. the
// pre-dose value. Doses are infused or absorbed, never given as a bolus, so the
// curve is continuous and its value at the dose start excludes that dose.
function troughTime(doseTimes,window){
 const inside=doseTimes.filter(t=>t>0&&t<window);
 return inside.length?inside[inside.length-1]:null;
}

function regimenMetrics(curve,doseTimes,window){
 const t=troughTime(doseTimes,window);
 return {
  window,
  plasmaAuc:areaTo(curve.time,curve.plasma.median,window),
  trough:t===null?null:{time:t,value:valueAt(curve.time,curve.plasma.median,t)},
  cmmgPeak:peakTo(curve.time,curve.cmmg.median,window)
 };
}

// ---------- Post-hemodialysis dose timing ----------

// Rules, verified against the product labels cited on the References tab:
//  Acyclovir IV, US injection label [10]: "the patient's dosing schedule should be
//   adjusted so that an additional dose is administered after each dialysis."
//   → keep every scheduled dose and add one dose when each session ends.
//  Valacyclovir oral, VALTREX label [8]: "Patients requiring hemodialysis should
//   receive the recommended dose of VALTREX after hemodialysis."
//   → move the latest valacyclovir dose since the previous session to the end of
//   this session. If there is none, add one. Doses on other days are kept.
const LABEL_RULES=Object.freeze({
 [IV]:Object.freeze({ref:10,action:'add',text:'US acyclovir injection label: an additional dose after each dialysis session'}),
 [VAL]:Object.freeze({ref:8,action:'move',text:'VALTREX label: the recommended dose is given after hemodialysis'})
});

function hdSessions(rows){
 return (rows||[]).filter(r=>r.type==='HD'&&Number.isFinite(r.start)&&Number.isFinite(r.end)&&r.end>r.start)
  .map(r=>({start:r.start,end:r.end})).sort((a,b)=>a.start-b.start);
}

const hours=v=>String(Number(Number(v).toFixed(2)));

function postHdPlan({doses,sessions,horizon}){
 const rows=(doses||[]).map((d,i)=>({id:'dose-'+i,route:d.route,amount:d.amount,infusion:d.route===IV?(d.infusion||0):0,
  original:d.time,proposed:d.time,change:'unchanged',reason:'',flags:[]}));
 const routes=new Set(rows.map(r=>r.route));
 const base={rows,doses:[],sessions:sessions||[],flagCount:0,changed:0};
 if(!rows.length)return {...base,applicable:false,message:'There are no doses in the current schedule.'};
 if(!sessions||!sessions.length)return {...base,applicable:false,message:'The selected scenario has no intermittent hemodialysis sessions. Choose Intermittent HD, or a custom sequence with HD rows.'};
 const added=[];
 const template=(route,before)=>{
  const same=rows.filter(r=>r.route===route);
  return same.filter(r=>r.original<before).pop()||same[0];
 };
 let previousEnd=-Infinity;
 sessions.forEach((s,k)=>{
  const label='session '+(k+1)+' ('+hours(s.start)+'–'+hours(s.end)+' h)';
  const pastEnd=s.end>=horizon;
  const dropFlag='would start at '+hours(s.end)+' h, at or after the end of the '+hours(horizon)+'-hour simulation, so the dose would be dropped';
  if(routes.has(IV)){
   const t=template(IV,s.end);
   added.push({id:'added-iv-'+k,route:IV,amount:t.amount,infusion:t.infusion,original:null,proposed:pastEnd?null:s.end,
    change:pastEnd?'not added':'added',reason:'Additional dose after '+label+' [10]',flags:pastEnd?[dropFlag]:[]});
  }
  if(routes.has(VAL)){
   const candidate=rows.filter(r=>r.route===VAL&&r.change==='unchanged'&&r.original>previousEnd&&r.original<s.end).pop();
   if(candidate&&pastEnd){
    candidate.flags.push('moving this dose after '+label+' '+dropFlag.replace('would start','would put it')+'; left at its original time');
   }else if(candidate){
    candidate.proposed=s.end;candidate.change='moved';candidate.reason='Given after '+label+' instead of at '+hours(candidate.original)+' h [8]';
   }else{
    const t=template(VAL,s.end);
    added.push({id:'added-val-'+k,route:VAL,amount:t.amount,infusion:0,original:null,proposed:pastEnd?null:s.end,
     change:pastEnd?'not added':'added',reason:'No valacyclovir dose since the previous session, so the label dose after '+label+' is added [8]',flags:pastEnd?[dropFlag]:[]});
   }
  }
  previousEnd=s.end;
 });
 const all=rows.concat(added);
 // Flag any change that lands within NEAR_DOSE_H of another dose start.
 const live=all.filter(r=>r.proposed!==null).sort((a,b)=>a.proposed-b.proposed);
 for(let i=0;i<live.length;i++)for(let j=i+1;j<live.length&&live[j].proposed-live[i].proposed<NEAR_DOSE_H;j++){
  const a=live[i],b=live[j];
  if(a.change==='unchanged'&&b.change==='unchanged')continue;
  const gap=hours(b.proposed-a.proposed);
  a.flags.push('within '+gap+' h of the '+b.route+' dose at '+hours(b.proposed)+' h: possible duplicate');
  b.flags.push('within '+gap+' h of the '+a.route+' dose at '+hours(a.proposed)+' h: possible duplicate');
 }
 const order=r=>r.proposed??r.original??Infinity;
 all.sort((a,b)=>order(a)-order(b)||(a.original===null)-(b.original===null));
 const doses_=live.map(r=>r.route===IV?{time:r.proposed,route:IV,amount:r.amount,infusion:r.infusion}:{time:r.proposed,route:VAL,amount:r.amount})
  .sort((a,b)=>a.time-b.time);
 return {rows:all,doses:doses_,sessions,applicable:true,message:'',
  flagCount:all.filter(r=>r.flags.length).length,changed:all.filter(r=>r.change!=='unchanged').length,
  originalCount:rows.length,proposedCount:doses_.length};
}

return Object.freeze({MAX_REGIMENS,NEAR_DOSE_H,LABEL_RULES,deepFreeze,cleanName,nextName,snapshotRegimen,valueAt,areaTo,peakTo,
 commonWindow,troughTime,regimenMetrics,hdSessions,postHdPlan});
});
