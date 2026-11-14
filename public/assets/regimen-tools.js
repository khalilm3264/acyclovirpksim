// Teaching tools for comparing dosing regimens: frozen regimen metrics and dose timing around
// intermittent hemodialysis. Pure functions of a configuration and engine results; no state.
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.AyFluxRegimens=api;
})(typeof self!=='undefined'?self:this,function(){
 'use strict';
 const MAX_SAVED=4;
 function interp(time,values,t){
  if(!time||!time.length||!values||!values.length)return null;
  if(t<=time[0])return values[0];
  for(let i=1;i<time.length;i++)if(time[i]>=t){const f=(time[i]-time[i-1])?(t-time[i-1])/(time[i]-time[i-1]):1;return values[i-1]+f*(values[i]-values[i-1]);}
  return values[values.length-1];
 }
 // Trapezoidal AUC from 0 to T (mg·h/L when values are mg/L).
 function aucTo(time,values,T){
  if(!time||!time.length||!values||!values.length)return null;
  let sum=0;
  for(let i=1;i<time.length&&time[i-1]<T;i++){
   const t1=Math.min(time[i],T),v1=time[i]<=T?values[i]:interp(time,values,T);
   if(v1===null)return null;
   sum+=(t1-time[i-1])*(values[i-1]+v1)/2;
  }
  return sum;
 }
 // Metrics shown in the regimen comparison table, all from median curves over the common window 0–T.
 // Trough: plasma acyclovir at the start time of the last dose that starts after hour 0 and before T,
 // that is, the concentration immediately before that dose. Null when no such dose exists.
 function metrics(data,doses,T){
  const time=data?.time||[];
  const hasPlasma=Array.isArray(data?.plasma?.median)&&data.plasma.median.length>0&&time.length>0;
  const hasCmmg=Array.isArray(data?.cmmg?.median)&&data.cmmg.median.length>0&&time.length>0;
  const plasma=hasPlasma?data.plasma.median:[];
  const cmmg=hasCmmg?data.cmmg.median:[];
  const last=doses?.map(d=>d.time).filter(t=>t>0&&t<T).sort((a,b)=>a-b).pop();
  let peak=0,peakCmmg=0;
  if(hasPlasma)for(let i=0;i<time.length&&time[i]<=T;i++)peak=Math.max(peak,plasma[i]);
  if(hasCmmg)for(let i=0;i<time.length&&time[i]<=T;i++)peakCmmg=Math.max(peakCmmg,cmmg[i]);
  return {window:T,
   auc:hasPlasma?aucTo(time,plasma,T):null,
   peak:hasPlasma?peak:null,
   trough:(hasPlasma&&last!==undefined)?interp(time,plasma,last):null,
   troughTime:hasPlasma?(last??null):null,
   cmmgAuc:hasCmmg?aucTo(time,cmmg,T):null,
   cmmgPeak:hasCmmg?peakCmmg:null};
 }
 // CROWDING_H is an AyFlux interface rule, not a label rule: neither label sets a minimum spacing
 // between doses. One hour is the standard AyFlux IV infusion length, so two dose starts closer than
 // that would overlap or be indistinguishable from one double dose. It is a review threshold, not a
 // pharmacokinetic limit, and changing it changes no prediction.
 //  - IV acyclovir: the label itself requires the added dose, so a nearby scheduled dose is flagged
 //    for review but applying is allowed.
 //  - Oral valacyclovir: the move is AyFlux's reading of "after hemodialysis", so a move that would
 //    crowd the next dose blocks applying.
 const CROWDING_H=1;
 const LABELS={
  'Acyclovir IV':{rule:'add',cite:'[10]',
   text:'US acyclovir injection label: the dosing schedule should be adjusted so that an additional dose is given after each dialysis. Scheduled doses are kept and one dose is added at the end of each HD session.'},
  'Valacyclovir oral':{rule:'move',cite:'[8]',
   text:'US valacyclovir label: patients requiring hemodialysis should receive the recommended dose after hemodialysis. On each HD day the next scheduled dose is moved to the end of the session; other doses are unchanged.'}
 };
 // Proposed dose timeline for a repeating regimen around HD sessions. Returns the rows to preview and
 // flags for changes that would duplicate, drop or crowd doses. `apply` is false when nothing changes
 // or a dose would be dropped.
 function postHdPlan(config,sessions,doses){
  const label=LABELS[config.route];
  if(config.dosingMode!=='repeat')return {ok:false,reason:'Post-dialysis timing applies to a repeating regimen. Switch Dosing schedule to Repeat dose.'};
  if(!label)return {ok:false,reason:'No label rule for this route.'};
  const hd=sessions.filter(s=>s.type==='HD');
  if(!hd.length)return {ok:false,reason:'No intermittent HD sessions in the selected scenario. The acyclovir injection label states that no supplemental dose appears necessary with peritoneal dialysis.'};
  const T=config.horizon,infusion=config.route==='Acyclovir IV'?config.infusion:0,flags=[],n=v=>String(Number(Number(v).toFixed(2)));
  const rows=doses.map((d,i)=>({dose:i+1,original:d.time,proposed:d.time,amount:d.amount,change:'unchanged',session:null}));
  if(label.rule==='add'){
   for(const s of hd){
    if(s.end+infusion>T+1e-9){flags.push({kind:'drop',text:'HD session ending at hour '+n(s.end)+': the added dose would not finish within the '+n(T)+'-hour simulation, so it is left out.'});continue;}
    const clash=rows.find(r=>Math.abs(r.proposed-s.end)<Math.max(infusion,CROWDING_H)-1e-9);
    if(clash)flags.push({kind:'duplicate',text:'Added dose at hour '+n(s.end)+' starts within '+n(Math.max(infusion,CROWDING_H))+' h of scheduled dose '+clash.dose+' at hour '+n(clash.proposed)+'. Both are kept as the label states; check whether that is intended. (AyFlux review threshold, not a label rule.)'});
    rows.push({dose:null,original:null,proposed:s.end,amount:config.dose,change:'added',session:s});
   }
   for(const r of rows)if(r.change==='unchanged'){const s=hd.find(x=>r.original>=x.start&&r.original<x.end);if(s)flags.push({kind:'info',text:'Scheduled dose '+r.dose+' at hour '+n(r.original)+' starts during the session ('+n(s.start)+'–'+n(s.end)+' h) and is kept.'});}
  }else{
   for(const s of hd){
    const r=rows.find(x=>x.change==='unchanged'&&x.original>=s.start&&x.original<s.start+config.every);
    if(!r){flags.push({kind:'gap',text:'No scheduled dose falls within one interval after the session starting at hour '+n(s.start)+', so nothing is moved for it.'});continue;}
    if(r.original>=s.end){flags.push({kind:'info',text:'Dose '+r.dose+' at hour '+n(r.original)+' already follows the session ending at hour '+n(s.end)+'.'});continue;}
    r.proposed=s.end;r.change='moved';r.session=s;
   }
   for(const r of rows)if(r.change==='moved'){
    const next=rows.filter(x=>x!==r&&x.proposed>=r.original).sort((a,b)=>a.proposed-b.proposed)[0];
    if(next&&next.proposed-r.proposed<CROWDING_H-1e-9)flags.push({kind:'duplicate',text:'Moved dose '+r.dose+' (hour '+n(r.proposed)+') would fall within '+n(CROWDING_H)+' h of dose '+next.dose+' at hour '+n(next.proposed)+', so applying is blocked. This is an AyFlux interface rule, not a label rule: the labels set no minimum spacing.'});
   }
  }
  rows.sort((a,b)=>a.proposed-b.proposed||(a.dose??99)-(b.dose??99));
  const changed=rows.some(r=>r.change!=='unchanged');
  const customDoses=rows.map(r=>({time:r.proposed,route:config.route,amount:r.amount,...(config.route==='Acyclovir IV'?{infusion:config.infusion}:{})}));
  if(customDoses.length>200)flags.push({kind:'drop',text:'More than 200 doses; shorten the simulation first.'});
  const blocking=flags.some(f=>f.kind==='duplicate'&&label.rule==='move')||customDoses.length>200;
  return {ok:true,apply:changed&&!blocking,rule:label.rule,ruleText:label.text,cite:label.cite,rows,flags,customDoses};
 }
 return {MAX_SAVED,CROWDING_H,interp,aucTo,metrics,postHdPlan,LABELS};
});
