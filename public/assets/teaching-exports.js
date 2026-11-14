/* Local exports of the primary scenario. SPDX-License-Identifier: AGPL-3.0-only */
(function(root){
'use strict';
const pk=root.RenalPKV7 || require('./pk-engine.js');
const reg=root.AyFluxRegimens || require('./regimen-tools.js');
const compartments={plasma:1,cmmg:4,csf:5,csfCmmg:6};
const rrtCodes={HD:1,CRRT:2,CAPD:3,APD:4};
function eventCSV(config,mode){
 const c=pk.effectiveConfig(config), windows=pk.scheduleFor(mode,c);
 const rows=[];
 function add(time,evid,cmt,amount=0,rate=0,dv='.',role=0){
  rows.push({time,evid,cmt,amount,rate,dv,role});
 }
 // Using a step longer than the horizon leaves only the engine's event boundaries.
 const doses=pk.buildDoses(c);
 for(const t of pk.timeGrid(c,windows,c.horizon+1,doses))add(t,2,1);
 for(const o of c.observations||[]){
  if(mode===c.fitMode)add(o.time,0,compartments[o.analyte],0,0,o.value,o.role==='holdout'?2:1);
 }
 for(const d of doses){
  if(d.amount===0)continue;
  const iv=d.route==='Acyclovir IV';
  add(d.time,1,iv?1:3,d.amount,iv?d.amount/d.infusion:0);
 }
 const order=[1,2,0]; // covariates, observations, then doses at a shared time
 rows.sort((a,b)=>a.time-b.time||order[a.evid]-order[b.evid]);
 const lines=['ID,TIME,AMT,RATE,EVID,CMT,DV,MDV,WT,CRCL,RRT,PD_ACTIVE,ROLE'];
 for(const r of rows){
  const window=pk.activeWindow(r.time,windows,c);
  lines.push([1,r.time,r.amount,r.rate,r.evid,r.cmt,r.dv,Number(r.evid!==0),c.weight,
   pk.renalCrClAt(c,r.time),rrtCodes[window.type]||0,Number(!!pk.pdStatus(r.time,windows,c)),r.role].join(','));
 }
 return lines.join('\r\n')+'\r\n';
}
function teachingNote(config,mode,result,validation,description,version,source,compact=false){
 const c=pk.effectiveConfig(config),size=pk.bodySize(c),doses=pk.buildDoses(c);
 const lines=['AyFlux v'+version+' | Educational simulation',description];
 if(size)lines.push('Body weight: actual '+c.weight+' kg, ideal '+size.ideal.toFixed(1)+' kg, adjusted '+size.adjusted.toFixed(1)+' kg.');
 if(c.renalMode!=='profile')lines.push('CrCl source: '+(c.crclSource==='estimated'?'Cockcroft–Gault using '+pk.cgWeightOf(c).toFixed(1)+' kg':'manually entered')+'.');
 if(!compact && c.dosingMode==='custom')for(const d of doses)lines.push('Hour '+d.time+': '+d.amount+' mg '+d.route+(d.infusion?' over '+d.infusion+' h':'')+'.');
 if(!compact && mode==='Custom sequence')for(const w of pk.scheduleFor(mode,c))lines.push(w.type+' at hours '+w.start+'–'+Math.min(w.end,c.horizon)+'.');
 if(pk.scheduleFor(mode,c).some(w=>w.type==='HD'))lines.push('HD clearance setting: '+c.hdCl+' mL/min.');
 lines.push('Predicted medians ['+Math.round(100*c.coverage)+'% '+(validation.fitted?'updated':'unfitted')+' model interval]');
 for(const [key,label,unit] of [['peak','Peak plasma acyclovir','mg/L'],['auc','Plasma acyclovir AUC (0–'+c.horizon+' h)','mg·h/L'],['mPeak','Peak plasma CMMG','mg/L'],['mass','Acyclovir removed by dialysis','mg']]){
  const v=result.summary[key];
  lines.push(label+': '+v.median.toFixed(2)+' ['+v.lower.toFixed(2)+'–'+v.upper.toFixed(2)+'] '+unit);
 }
 const m=reg.metrics(result,doses,c.horizon);
 if(m.trough!==null)lines.push('Pre-dose plasma acyclovir at '+m.troughTime+' h (median curve): '+m.trough.toFixed(2)+' mg/L');
 if(source)lines.push('Study: '+source);
 lines.push('References: https://ayflux.org/references/','For research and teaching only. Do not use for prescribing.');
 return lines.join('\n');
}
const api={eventCSV,teachingNote};
if(typeof module==='object'&&module.exports)module.exports=api;
else root.AyFluxTeaching=api;
})(typeof window==='undefined'?globalThis:window);
