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

(function(){'use strict';
const E=window.RenalPKV7,$=id=>document.getElementById(id),modes=E.MODES,STUDIES=window.AyFluxStudies;
// Published study whose measured points are overlaid on the plasma and CMMG charts. Display state only: it is not
// part of the configuration, saved files or share links.
let studyOverlay=null;
function overlayStudy(){const study=studyOverlay&&STUDIES?STUDIES.find(studyOverlay):null;return study&&STUDIES.matches(study,c,primary)?study:null;}
// Dedicated visualization palettes; chart calculations are independent of these colors.
const PALETTES={
 standard:{'No dialysis':'#88949F','Intermittent HD':'#E23D25','Peritoneal dialysis':'#009A69','CRRT':'#9B5E00','Custom sequence':'#0054E9'},
 accessible:{'No dialysis':'#8A8A8A','Intermittent HD':'#E69F00','Peritoneal dialysis':'#009E73','CRRT':'#CC79A7','Custom sequence':'#0072B2'}
};
const LINE_DASH={'No dialysis':'solid','Intermittent HD':'dash','Peritoneal dialysis':'dot','CRRT':'dashdot','Custom sequence':'longdash'};
const LEGEND_DASH={'No dialysis':'solid','Intermittent HD':'dashed','Peritoneal dialysis':'dotted','CRRT':'dashed','Custom sequence':'solid'};
let paletteMode='standard',COLORS=PALETTES.standard;
function setPalette(value){paletteMode=Object.prototype.hasOwnProperty.call(PALETTES,value)?value:'standard';COLORS=PALETTES[paletteMode];
 const accessible=paletteMode==='accessible';
 window.AyFluxCharts?.setAccessible?.(accessible);
 if(typeof Event==='function')window.dispatchEvent?.(new Event('ayflux:palette'));}
// Start from the colorblind-safe preference saved by the header toggle, if any.
if(window.AyFluxCharts?.accessible?.())setPalette('accessible');

const DEFS={
weight:['Body weight','kg',30,150,1],crcl:['Residual creatinine clearance','mL/min',0,140,1],dose:['Acyclovir IV dose','mg',0,2000,25],doseCount:['Total planned doses','doses',1,200,1],every:['Dose interval','hours',.25,48,.25],infusion:['Infusion duration','hours',.25,4,.25],horizon:['Simulation duration','hours',24,336,12],valF:['Oral acyclovir bioavailability [8]','fraction',.2,.8,.005],valKa:['Oral conversion/absorption rate (assumed)','1/hour',.3,5,.1],
hdStart:['First HD session starts','hour',0,200,.25],hdDuration:['HD session duration (max 24)','hours',.25,24,.25],hdRepeat:['Repeat HD every','hours',24,168,1],hdCl:['HD acyclovir clearance [1]','mL/min',20,180,1],
pdCl:['PD membrane transport coefficient [2,12]','mL/min',.5,20,.1],pdVolume:['PD fill volume','L',.5,4,.1],capdDwell:['PD dwell per exchange','hours',.5,24,.25],capdExchanges:['PD exchanges/day','exchanges',1,12,1],pdGlucose:['Dialysate dextrose [12]','%',1.5,4.25,.05],pdTransport:['Peritoneal solute transport factor (assumed)','×',.7,1.3,.3],pdUfBase:['Initial osmotic UF coefficient','mL/hour',0,350,10],pdAbsorb:['PD fluid absorption (assumed)','mL/hour',0,100,5],pdSmallPore:['UF carried by small pores (assumed)','fraction',0,1,.05],pdSigma:['Acyclovir small-pore reflection (assumed)','fraction',0,1,.05],assayCV:['Assumed lab assay CV (Bayesian model)','fraction',.03,.5,.01],
apdStart:['Cycler start time/day','hour',0,23.75,.25],apdHours:['Cycler session duration (max 24)','hours',1,24,.25],apdCycles:['Cycler cycles per session','cycles',1,16,1],apdDwell:['Cycler dwell per cycle','hours',.25,12,.25],apdTurnover:['Cycler fill/drain time per cycle','hours',0,1,.05],apdFactor:['Cycler clearance scaling','×',.25,4,.05],
effluent:['CRRT effluent rate','mL/kg/hour',5,60,1],sieving:['CRRT sieving coefficient (assumed)','unitless',0,1,.05],delivered:['CRRT delivered fraction (assumed)','unitless',0,1,.05],
csfRatio:['CSF/plasma equilibrium ratio (assumed)','unitless',.05,.9,.01],csfLag:['CSF equilibration time (assumed)','hours',.5,20,.25],csfMetRatio:['CMMG CSF/plasma ratio (assumed)','unitless',.01,1,.01],csfMetLag:['CMMG CSF equilibration time (assumed)','hours',.5,24,.25],
formFactor:['CMMG formation scaling (assumed)','×',.1,3,.1],metRenal:['CMMG renal clearance scaling (assumed)','×',.1,3,.1],metDial:['CMMG dialysis clearance scaling (assumed)','×',.1,3,.1],
variability:['Parameter variability multiplier (assumed)','×',0,2,.1]
};
const c=structuredClone(E.DEFAULTS);let primary='No dialysis',visible=new Set(['No dialysis','Intermittent HD','Custom sequence']),tab='concentration',results=null,timer=null,draft=structuredClone(c.schedule),dirtyTimeline=false,doseDraft=structuredClone(c.customDoses),dirtyDoses=false;
let calculationVersion=0,activeJob=null,queuedJob=null,worker=null,workerDisabled=false,dataIsCurrent=false,resultsRevision=0;
let pendingCsvExport=false, migratedPayload=null;
// Small, bounded cache of completed summaries; the engine retains its own raw ensemble cache.
const completedResults=new Map();
let baseline=null,baselineRevision=0;
// Up to four frozen regimens (inputs, dose list and median curves) for side-by-side comparison.
let savedRegimens=[],savedRevision=0;
const presentationKeys=new Set(['virus','showBands','showShades','showStudy','showIC50','requestedModes']);
function resultKey(config){return JSON.stringify(Object.keys(config).sort().filter(k=>!presentationKeys.has(k)).map(k=>[k,config[k]]));}
function rememberResult(key,data){
 const previous=completedResults.get(key);
 const merged=previous?{...previous,...data}:data;
 completedResults.delete(key);completedResults.set(key,merged);
 while(completedResults.size>3)completedResults.delete(completedResults.keys().next().value);
 return merged;
}
let renalDraft=structuredClone(c.renalProfile),renalDirty=false,renalProfileEdited=false;
// Narrow read-only integration point for optional research workspace.
window.AyFluxResearchBridge=Object.freeze({snapshot:()=>({results,config:structuredClone(c),primary,updated:dataIsCurrent,revision:resultsRevision})});
// Display units for concentrations. Simulation, exports and saved files always stay in mg/L.
// A message that must survive the next successful calculation (for example a rejected shared link).
let pendingNotice='';
const MOLAR_MASS={acyclovir:225.21,cmmg:239.19};
let concUnit='mg';
function unitFactor(analyte){return concUnit==='umol'?1000/MOLAR_MASS[analyte]:1;}
function unitLabel(){return concUnit==='umol'?'µmol/L':'mg/L';}
function unitText(text){return concUnit==='umol'?text.replaceAll('mg·h/L','µmol·h/L').replaceAll('mg/L','µmol/L'):text;}
function shown(value,analyte){return analyte?value*unitFactor(analyte):value;}
const CONCENTRATION_KEYS={plasma:'acyclovir',csf:'acyclovir',cmmg:'cmmg',csfCmmg:'cmmg'};
function setConcUnit(value){concUnit=value==='umol'?'umol':'mg';const control=document.getElementById('concUnit');if(control)control.value=concUnit;}
// Hours the curve spends above a level, with linear interpolation at each crossing. Descriptive only.
function timeAbove(time,values,level){
 let hours=0;
 for(let i=1;i<time.length;i++){
  const a=values[i-1],b=values[i],dt=time[i]-time[i-1];
  if(!(dt>0)||!Number.isFinite(a)||!Number.isFinite(b))continue;
  if(a>level&&b>level)hours+=dt;
  else if(a>level!==b>level)hours+=dt*(Math.max(a,b)-level)/Math.abs(b-a);
 }
 return hours;
}
// Peak after the last dose divided by peak after the first, on one curve. Null when there are fewer than two dose times.
function accumulationRatio(time,values,doseTimes){
 const starts=[...new Set(doseTimes.filter(Number.isFinite))].sort((a,b)=>a-b);
 if(starts.length<2)return null;
 const peak=(from,to)=>{let best=-Infinity;for(let i=0;i<time.length;i++)if(time[i]>=from&&time[i]<to&&values[i]>best)best=values[i];return best;};
 const first=peak(starts[0],starts[1]),last=peak(starts[starts.length-1],Infinity);
 return first>0&&Number.isFinite(last)?last/first:null;
}
// One-line plain-language description of the selected scenario, including mg/kg for repeat dosing.
function describeScenario(config,mode){
 const n=value=>String(Number(Number(value).toPrecision(4))),parts=[n(config.weight)+' kg'];
 if(config.renalMode==='profile'&&config.renalProfile?.length){const p=config.renalProfile;parts.push('CrCl '+n(p[0].crcl)+' → '+n(p[p.length-1].crcl)+' mL/min (custom trajectory)');}
 else parts.push('CrCl '+n(config.crcl)+' mL/min');
 if(config.dosingMode==='custom')parts.push('custom schedule of '+config.customDoses.length+' dose'+(config.customDoses.length===1?'':'s'));
 else{
  const oral=config.route==='Valacyclovir oral';
  parts.push((oral?'valacyclovir oral ':'acyclovir IV ')+n(config.dose)+' mg ('+n(config.dose/config.weight)+' mg/kg) every '+n(config.every)+' h, up to '+config.doseCount+' dose'+(config.doseCount===1?'':'s')+(oral?'':', '+n(config.infusion)+'-h infusion'));
 }
 if(config.probenecid)parts.push('with probenecid');
 parts.push(n(config.horizon)+' h simulated');
 parts.push(mode==='Intermittent HD'?'intermittent HD: '+n(config.hdDuration)+' h every '+n(config.hdRepeat)+' h from hour '+n(config.hdStart):mode==='CRRT'?'CRRT at '+n(config.effluent)+' mL/kg/h effluent':mode==='Custom sequence'?'custom dialysis sequence ('+config.schedule.length+' session'+(config.schedule.length===1?'':'s')+')':mode.toLowerCase());
 return parts.join(' · ');
}
// Ratio of CMMG to acyclovir AUC (mg·h/L each) over the last 24 simulated hours, or the whole
// horizon when it is shorter. Null when acyclovir exposure in that window is zero.
function cmmgAucRatio(time,plasma,cmmg){
 if(!time?.length)return null;
 const to=time[time.length-1],from=Math.max(time[0],to-24);
 let parent=0,metabolite=0;
 for(let i=1;i<time.length;i++){
  if(time[i]<=from)continue;
  const t0=Math.max(time[i-1],from),dt=time[i]-t0,f=(t0-time[i-1])/(time[i]-time[i-1]);
  const p0=plasma[i-1]+f*(plasma[i]-plasma[i-1]),m0=cmmg[i-1]+f*(cmmg[i]-cmmg[i-1]);
  parent+=dt*(p0+plasma[i])/2;metabolite+=dt*(m0+cmmg[i])/2;
 }
 return parent>1e-12?{from,to,ratio:metabolite/parent}:null;
}
const PROVENANCE_LABEL={reported:'Reported',calculated:'Calculated',assumed:'Assumed',unknown:'Unknown'};
function provenanceSummary(study){
 const n=STUDIES.provenanceCounts(study);
 if(!n)return '<span class="tip">Not yet recorded</span>';
 return STUDIES.STATUSES.map(k=>`<span class="prov prov-${k}" title="${PROVENANCE_LABEL[k]}">${PROVENANCE_LABEL[k][0]} ${n[k]}</span>`).join(' ');
}
function renderStudyProvenance(study){
 const box=$('studyProvenance');if(!box)return;
 if(!study){box.classList.add('hidden');return;}
 box.classList.remove('hidden');
 const n=STUDIES.provenanceCounts(study),esc=t=>String(t).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[ch]);
 if(!n){$('studyProvenanceCounts').textContent='Input provenance has not yet been recorded for this study. The study note above lists its assumptions.';$('studyProvenanceRows').innerHTML='';return;}
 $('studyProvenanceCounts').textContent=`Of ${study.provenance.length} inputs needed to reproduce this case: ${n.reported} reported by the source, ${n.calculated} calculated from reported values, ${n.assumed} assumed by AyFlux, ${n.unknown} unknown.`;
 // The study's main source is named once; a row shows its own location only when it differs.
 const tally=new Map();for(const r of study.provenance)tally.set(r.source,(tally.get(r.source)||0)+1);
 const main=[...tally].sort((x,y)=>y[1]-x[1])[0][0];
 $('studyMainSource').textContent='Source for rows without their own location: '+main+'.';
 $('studyProvenanceRows').innerHTML=study.provenance.map(r=>`<tr><td>${esc(r.input)}<br><span class="prov prov-${r.status}">${PROVENANCE_LABEL[r.status]}</span></td><td>${esc(r.reported)}${r.source!==main?`<br><span class="tip">${esc(r.source)}</span>`:''}</td><td>${esc(r.used)}</td></tr>`).join('');
 $('studySourceCheck').textContent=study.sourceCheck||'';$('studySourceCheck').classList.toggle('hidden',!study.sourceCheck);
 const spec=study.explore;$('studyExplore').classList.toggle('hidden',!spec);
 if(spec&&$('studyExplore').dataset.study!==study.id){
  $('studyExplore').dataset.study=study.id;
  $('studyExploreLabel').textContent=spec.label+' ('+spec.min+'–'+spec.max+' '+spec.unit+')';
  $('studyExploreValue').min=spec.min;$('studyExploreValue').max=spec.max;$('studyExploreValue').value=spec.value;$('studyExploreUnit').textContent=spec.unit;
  $('studyExploreStatus').textContent='Changes only “'+spec.input+'”. The reconstruction uses '+spec.value+' '+spec.unit+'. Exploring saves the original reconstruction as a regimen when there is room, and Undo restores your settings.';
 }
}
function renderStudyStatus(){
 const select=$('studySelect'),status=$('studyStatus');if(!select||!status)return;
 const chosen=studyOverlay&&STUDIES?STUDIES.find(studyOverlay):null;
 renderStudyProvenance(chosen);
 if(!chosen){status.textContent='';if(select.value)select.value='';return;}
 if(select.value!==chosen.id)select.value=chosen.id;
 status.textContent=overlayStudy()?'Dots: '+chosen.pointsLabel+(chosen.n>1?', n='+chosen.n:', one patient')+(chosen.cmmgPoints?' (CMMG graph too)':'')+' '+chosen.cite+'.':'Settings no longer match this study, so its measured points are hidden. Choose it again to reload the regimen.';
}
let aboveLevelMg=null;
// Summary-card readouts tied to results. They show only for current results and are cleared
// while a calculation is pending or after one fails, so a stale value is never displayed.
function renderTimeAbove(rewrite=false){
 const output=$('timeAboveResult'),input=$('timeAboveLevel');if(!output||!input)return;
 $('timeAboveUnit').textContent=unitLabel();
 if(rewrite||document.activeElement!==input)input.value=aboveLevelMg===null?'':String(Number(shown(aboveLevelMg,'acyclovir').toPrecision(6)));
 const run=dataIsCurrent&&results?results[primary]:null,words=$('scenarioWords'),accumulation=$('accumulationResult');
 if(words)words.textContent=run?describeScenario(c,primary):'';
 if(accumulation){
  const ratio=run?accumulationRatio(run.time,run.plasma.median,run.doses.filter(d=>d.amount>0).map(d=>d.time)):null;
  accumulation.textContent=ratio===null?'':'Accumulation: the plasma peak after the last dose is '+ratio.toFixed(2)+'× the peak after the first dose (median curve).';
 }
 const cmmgRatio=$('cmmgRatioResult');
 if(cmmgRatio){
  const window24=run?cmmgAucRatio(run.time,run.plasma.median,run.cmmg.median):null;
  cmmgRatio.textContent=window24===null?'':'CMMG/acyclovir AUC ratio over hours '+window24.from.toFixed(0)+'–'+window24.to.toFixed(0)+': '+Math.round(100*window24.ratio)+'% (median curves, mass basis). For comparison, Kably 2025 estimated about 30% with eGFR above 90 and about 130% below 30 mL/min/1.73 m², at steady state on valacyclovir in liver transplant recipients [29].';
 }
 renderStudyStatus();
 if(aboveLevelMg===null||!run){output.textContent='';return;}
 const span=run.time[run.time.length-1]-run.time[0],hours=timeAbove(run.time,run.plasma.median,aboveLevelMg);
 output.textContent=`${hours.toFixed(1)} of ${span.toFixed(0)} hours (${span>0?Math.round(100*hours/span):0}%) for the median ${primary} curve.`;
}
function tableOpen(){return tab==='concentration'&&!!$('tablePanel')?.open;}
function requestedModes(all=false){return all||tableOpen()?[...modes]:modes.filter(m=>m===primary||visible.has(m));}
function setBusy(busy){
 $('calculationState').classList.toggle('hidden',!busy);
 if(typeof renderTimeAbove==='function')renderTimeAbove();
 document.querySelector('main').setAttribute('aria-busy',String(busy));
 $('csv').disabled=busy||!dataIsCurrent;
 $('saveBaseline').disabled=busy||!dataIsCurrent;
 if(typeof refreshLabelAdjust==='function')refreshLabelAdjust();
 if(typeof renderRegimens==='function'){renderRegimens();renderPostHd();}
 if(busy)$('status').textContent='Updating simulation';
}
function calculationError(error){
 dataIsCurrent=false;setBusy(false);
 alertMessage('Please correct input(s):\n'+error.message);
 $('status').textContent='Simulation not updated: invalid settings';
}
function acceptResults(data){
 results=data;resultsRevision++;dataIsCurrent=true;alertMessage(pendingNotice);pendingNotice='';setBusy(false);render();
 window.dispatchEvent(new Event('ayflux:results-updated'));
 if(pendingCsvExport){const format=pendingCsvExport;pendingCsvExport=false;if(format==='tidy')downloadTidyCSV();else if(format==='xlsx')downloadOSPWorkbook();else download();}
}
function finishJob(data,error){
 const job=activeJob;activeJob=null;
 if(job.id===calculationVersion){
  if(error){pendingCsvExport=false;calculationError(error);}
  else acceptResults(rememberResult(job.key,data));
 }
 startNextJob();
}
function startNextJob(){
 if(activeJob||!queuedJob)return;
 activeJob=queuedJob;queuedJob=null;
 if(!workerDisabled){
  try{
   if(!worker){
    // Same-origin Worker loads the model separately and keeps calculations off the UI thread.
    worker=new Worker('/assets/simulator-worker.js');
    worker.onmessage=event=>{
     if(activeJob&&event.data.id===activeJob.id)finishJob(event.data.data,event.data.error?new Error(event.data.error):null);
    };
    worker.onerror=event=>{
     event.preventDefault();worker.terminate();worker=null;workerDisabled=true;
     // Worker creation may fail under restricted browser policies; retain a functional fallback.
     if(!queuedJob)queuedJob=activeJob;activeJob=null;startNextJob();
    };
   }
   worker.postMessage(activeJob);return;
  }catch(error){if(worker)worker.terminate();worker=null;workerDisabled=true;}
 }
 // Yield a frame before synchronous fallback so the updating state can paint.
 setTimeout(()=>{
  if(activeJob.id!==calculationVersion){finishJob(null,null);return;}
  try{finishJob(E.simulateMany(activeJob.config),null);}catch(error){finishJob(null,error);}
 },0);
}
function timeLabel(t){const day=Math.floor((t+1e-8)/24)+1,h=t%24;return `Day ${day} ${String(Math.floor(h)).padStart(2,'0')}:${String(Math.round((h-Math.floor(h))*60)).padStart(2,'0')}`;}
function calculatedCrCl(){return E.cockcroftGault(c);}
const VIRUSES={
 'HSV-1':{min:0.02,max:13.5,name:'HSV-1'},
 'HSV-2':{min:0.01,max:9.9,name:'HSV-2'},
 'VZV':{min:0.12,max:10.8,name:'VZV'}
};
function fieldDef(id){let d=[...DEFS[id]];if(id==='dose')d[3]=E.MAX_DOSE_MG[c.route];return d;}
function numericField(id){let [lab,unit,min,max,step]=fieldDef(id);if(id==='dose')lab=c.route==='Valacyclovir oral'?'Valacyclovir oral dose':'Acyclovir IV dose';return `<div class="inputrow"><label for="num_${id}">${lab}</label><div class="entry"><input aria-label="${lab} slider" data-k="${id}" data-role="range" type="range" min="${min}" max="${max}" step="${step}" value="${c[id]}"><input aria-label="${lab} exact value" data-k="${id}" data-role="number" id="num_${id}" type="number" min="${min}" max="${max}" step="any" value="${c[id]}"></div><div class="unit">${unit}</div></div>`;}
function group(title,items,description=''){return `<h2>${title}</h2>${items.map(numericField).join('')}${description?`<p class="tip">${description}</p>`:''}`;}
function pdGroup(){
 const fields=['pdCl','pdVolume','pdGlucose','pdTransport','pdUfBase','pdAbsorb'];
 const prescription=c.pdMethod==='cycler'?['apdStart','apdHours','apdCycles','apdDwell','apdTurnover','apdFactor']:['capdDwell','capdExchanges'];
 return `<h2>Peritoneal dialysis prescription</h2><div class="inputrow"><label for="pdMethod">Exchange delivery</label><select id="pdMethod"><option value="manual" ${c.pdMethod==='manual'?'selected':''}>Manual exchanges (CAPD)</option><option value="cycler" ${c.pdMethod==='cycler'?'selected':''}>Automated cycler (APD)</option></select></div>`+
 fields.concat(prescription).map(numericField).join('')+`<button class="btn secondary" type="button" id="showPdRx">${c.pdRxEnabled?'Edit exchange table':'Configure individual exchanges'}</button><p class="tip">Optional: use an exchange table for separate dwell times, fill volumes, dextrose and measured net ultrafiltration.</p>`;
}
function modalControls(){if(primary==='No dialysis')return '';
 const HD=()=>group('Hemodialysis',['hdStart','hdDuration','hdRepeat','hdCl']);
 const CRRT=()=>group('Continuous kidney replacement therapy',['effluent','sieving','delivered']);
 if(primary==='Intermittent HD')return HD();
 if(primary==='Peritoneal dialysis')return pdGroup();
 if(primary==='CRRT')return CRRT();
 const types=new Set(c.schedule.map(x=>x.type));
 return `<p class="tip">Set treatment times in Custom timeline.</p>`+
 (types.has('HD')?group('HD parameters',['hdCl']):'')+
 (types.has('PD')?pdGroup():'')+(types.has('CRRT')?CRRT():'');
}
function renalInputs(){
 const method=`<div class="inputrow"><label for="crclSource">Creatinine clearance input</label><select id="crclSource"><option value="manual" ${c.crclSource==='manual'?'selected':''}>Enter CrCl</option><option value="estimated" ${c.crclSource==='estimated'?'selected':''}>Estimate (Cockcroft–Gault)</option></select></div>`;
 if(c.renalMode==='profile')return '';
 if(c.crclSource==='manual')return method+numericField('crcl');
 const estimated=calculatedCrCl();
 return method+`<div class="inputrow"><label for="cgAge">Age (years)</label><input id="cgAge" type="number" min="18" max="120" step="1" value="${c.age}" class="cg-field"></div>`+
 `<div class="inputrow"><label for="cgSex">Sex coefficient for Cockcroft–Gault</label><select id="cgSex"><option value="male" ${c.sex==='male'?'selected':''}>Male</option><option value="female" ${c.sex==='female'?'selected':''}>Female (×0.85)</option></select></div>`+
 `<div class="inputrow"><label for="cgScr">Serum creatinine (mg/dL)</label><input id="cgScr" type="number" min="0.1" max="25" step="0.01" value="${c.scr}" class="cg-field"></div>`+
 `<div class="calculated">Estimated CrCl: <strong id="cgOutput">${Number.isFinite(estimated)?estimated.toFixed(1):'—'} mL/min</strong></div>`+
 `<p class="tip">Uses actual weight. Estimates may be unreliable in acute kidney injury, dialysis, and altered muscle mass. Use measured clearance when available. <a class="source-id" href="#ref13">[13]</a></p>`;
}
function renalProfileControls(){
 const dynamic=c.renalMode==='profile';
 const selector=`<div class="inputrow"><label for="renalMode">Kidney function over time</label><select id="renalMode"><option value="constant" ${dynamic?'':'selected'}>Constant CrCl</option><option value="profile" ${dynamic?'selected':''}>Custom CrCl trajectory</option></select></div>`;
 if(!dynamic)return selector;
 const rows=renalDraft.map((r,i)=>`<div class="renal-profile-grid">
 <input type="number" aria-label="Time for CrCl point ${i+1} in hours" min="0" max="${c.horizon}" step="any" data-renal-row="${i}" data-renal-key="time" value="${r.time}" ${i===0?'disabled':''}>
 <input type="number" aria-label="CrCl value for point ${i+1} in mL/min" min="0" max="140" step="any" data-renal-row="${i}" data-renal-key="crcl" value="${r.crcl}">
 <button type="button" class="btn secondary small" data-renal-remove="${i}" ${i===0||renalDraft.length<=2?'disabled':''} aria-label="Remove CrCl point ${i+1}">×</button></div>`).join('');
 return selector+`<div class="renal-profile-panel">
 <div class="renal-profile-grid"><span class="renal-heading">Time (h)</span><span class="renal-heading">CrCl (mL/min)</span><span></span></div>
 ${rows}
 <div class="renal-profile-actions"><button type="button" class="btn secondary small" id="renalAdd">+ Time point</button><button type="button" class="btn small" id="renalApply">Apply profile</button></div>
 <p class="example-row"><span class="example-label">Load an example:</span><button class="example-chip" type="button" id="renalExample" title="Starting CrCl held to the halfway point, then falling to one fifth over the next quarter of the simulation and staying there">Kidney injury mid-course</button></p>
 <p class="tip">Linear change between points, with fixed endpoints. Hypothetical CrCl inputs, not a kidney recovery forecast.</p>
 <p id="renalProfileStatus" class="tip" role="status" aria-live="polite">${renalDirty?'Unapplied edits — click Apply profile.':'Current profile applied.'}</p>
 </div>`;
}
function activateRenalProfile(){
 c.crclSource='manual';
 c.renalMode='profile';
 if(!renalProfileEdited||E.validateRenalProfile(c).length){
  c.renalProfile=[{time:0,crcl:c.crcl},{time:c.horizon,crcl:c.crcl}];
 }
 renalDraft=structuredClone(c.renalProfile);
 renalDirty=false;
 renderInputs();defer();
}
function applyRenalDraft(){
 const fields=Array.from($('patientControls').querySelectorAll('[data-renal-row]'));
 if(fields.some(element=>!Number.isFinite(element.valueAsNumber))){
  const status=$('renalProfileStatus');if(status)status.textContent='Correct missing or invalid kidney function values before applying.';return;
 }
 const errors=E.validateRenalProfile({...c,renalMode:'profile',crclSource:'manual',renalProfile:renalDraft});
 const status=$('renalProfileStatus');
 if(errors.length){if(status)status.textContent=errors.join('; ');return;}
 c.renalProfile=structuredClone(renalDraft);
 c.crcl=renalDraft[0].crcl;
 renalDirty=false;renalProfileEdited=true;
 renderInputs();defer();
}
function renderRenalProfileChart(){
 if(!results||!dataIsCurrent||c.renalMode!=='profile')return;
 if(!chartNearViewport($('kidneyClearChart')))return;
 const signature=chartSignature('kidneyClear')+':dynamic';
 if(pendingPlots.get('kidneyClearChart')?.signature===signature||chartStates.get('kidneyClearChart')?.signature===signature)return;
 const d=results[primary],charts=window.AyFluxCharts;
 const series=[charts.line('Modeled renal acyclovir clearance',d.time,d.kidneyClear.median,'#0054e9',3),
  {...charts.line('User-entered CrCl',d.time,d.time.map(t=>E.renalCrClAt(c,t)),'#237d8c',3,'dashed'),yAxisIndex:1}];
 const option=layout('Acyclovir renal clearance (mL/min)',c.horizon,series);
 option.yAxis=[option.yAxis,{...option.yAxis,name:'Entered CrCl (mL/min)',splitLine:{show:false}}];
 option.grid.right=72;
 pendingPlots.set('kidneyClearChart',{key:'kidneyClear',option,signature});requestPlotFrame();
}
function renderInputs(){let keepAdvanced=$('advanced').open;
 $('patientControls').innerHTML=numericField('weight')+renalProfileControls()+renalInputs()+
 `<h2>Medication</h2><div class="inputrow"><label for="dosingMode">Dosing schedule</label><select id="dosingMode"><option value="repeat" ${c.dosingMode==='repeat'?'selected':''}>Repeat dose</option><option value="custom" ${c.dosingMode==='custom'?'selected':''}>Custom oral / IV schedule</option></select></div>`+
 (c.dosingMode==='repeat'?`<div class="inputrow"><label for="route">Drug and route</label><select id="route"><option value="Acyclovir IV" ${c.route==='Acyclovir IV'?'selected':''}>Acyclovir — IV</option><option value="Valacyclovir oral" ${c.route==='Valacyclovir oral'?'selected':''}>Valacyclovir — oral</option></select></div>`:'')+
 (c.dosingMode==='repeat'?['dose','every','doseCount'].concat(c.route==='Valacyclovir oral'?[]:['infusion']).map(numericField).join(''):
 `<button class="btn secondary" id="openDoses">Edit medication schedule</button><div class="advisory" id="customDoseSummary"></div>`)+
 medicationTools()+
 group('Simulation window',['horizon']);
 $('modeControls').innerHTML=modalControls();
 $('modeHint').textContent=primary==='Custom sequence'?'Define sequential treatments in Treatment timeline.':'';
 $('advancedControls').innerHTML=`<div class="inputrow"><label for="colorPalette">Graph colors</label><select id="colorPalette"><option value="standard" ${paletteMode==='standard'?'selected':''}>Standard</option><option value="accessible" ${paletteMode==='accessible'?'selected':''}>Colorblind-friendly</option></select><p class="tip">Colorblind-friendly uses Okabe–Ito curves and viridis heatmaps here and in the visual explorer.</p></div><div class="inputrow"><label for="virus">Virus susceptibility reference</label><select id="virus"><option value="VZV" ${c.virus==='VZV'?'selected':''}>Varicella-zoster virus (VZV)</option><option value="HSV-1" ${c.virus==='HSV-1'?'selected':''}>HSV-1</option><option value="HSV-2" ${c.virus==='HSV-2'?'selected':''}>HSV-2</option></select><p class="tip virus-note">Only the optional cell-culture IC₅₀ range changes with virus selection; PK predictions remain unchanged. This is not a therapeutic target. <a href="#ref11">[11]</a></p></div>`+group('CNS distribution',['csfRatio','csfLag','csfMetRatio','csfMetLag'])+
 group('CMMG model',['formFactor','metRenal','metDial'])+
 group('Uncertainty',c.dosingMode==='custom'||c.route==='Valacyclovir oral'?['valF','valKa','variability']:['variability'])+
 group('Peritoneal membrane',['pdSmallPore','pdSigma'])+group('Assay error',['assayCV'])+
 `<div class="inputrow"><label for="draws">Monte Carlo samples</label><select id="draws"><option>30</option><option>60</option><option>120</option><option>200</option></select></div><div class="inputrow"><label for="coverage">Concentration interval</label><select id="coverage"><option value="0.5">50%</option><option value="0.8">80%</option><option value="0.9">90%</option><option value="0.95">95%</option></select></div>`+
 [['showBands','Uncertainty bands'],['showShades','Dialysis session shading'],['showIC50','Cell-culture IC₅₀ range (not a treatment target)']].map(([id,lab])=>`<label class="check"><input type="checkbox" data-toggle="${id}" ${c[id]?'checked':''}> ${lab}</label>`).join('');
 $('draws').value=c.draws;$('coverage').value=c.coverage;$('advanced').open=keepAdvanced;
 $('drugCaution').classList.toggle('hidden',c.dosingMode!=='custom'&&c.route!=='Valacyclovir oral');
 updateDrugCaution();if(c.dosingMode==='custom')updateCustomDoseSummary();
}
// Label kidney-function adjustment for repeat IV acyclovir, and the probenecid option.
function labelAdjustmentState(){
 if(c.dosingMode!=='repeat')return {ok:false,text:'Label adjustment applies to a repeating regimen. Switch Dosing schedule to Repeat dose.'};
 if(c.route!=='Acyclovir IV')return {ok:false,text:'Label adjustments for oral valacyclovir depend on the indication, so AyFlux does not apply them automatically.'};
 if(c.renalMode==='profile')return {ok:false,text:'Label adjustment uses one CrCl. Switch kidney function to constant to apply it.'};
 if(!(Number.isFinite(c.labelBsa)&&c.labelBsa>0))return {ok:false,text:'Enter body surface area to compare absolute CrCl with the label’s indexed kidney-function bands.'};
 const indexedCrcl=c.crcl*1.73/c.labelBsa;
 const tier=E.labelRenalAdjustment(indexedCrcl),n=v=>String(Number(Number(v).toPrecision(4)));
 if(!tier)return {ok:false,text:''};
 const dose=c.dose*tier.fraction,target=n(dose)+' mg every '+tier.every+' h';
 if(c.every!==8)return {ok:false,text:'The label adjusts a standard every-8-hour regimen. Set the interval to 8 h first; this regimen is already every '+n(c.every)+' h.'};
 if(tier.every===8)return {ok:false,text:'At indexed CrCl '+n(indexedCrcl)+' mL/min/1.73 m² the US label needs no adjustment (above 50 mL/min) [10].'};
 return {ok:true,dose,every:tier.every,text:'At indexed CrCl '+n(indexedCrcl)+' mL/min/1.73 m² ('+tier.band+' band), the US label gives '+(tier.fraction<1?'50% of the dose':'the same dose')+' every '+tier.every+' h: '+target+' [10].'};
}
function medicationTools(){
 const state=labelAdjustmentState();
 return `<div class="label-adjust"><label for="labelBsa">Body surface area for label comparison (m²)</label><input id="labelBsa" type="number" min="0" step="any" inputmode="decimal" value="${c.labelBsa||''}" placeholder="Enter BSA"><p class="tip">Label CrCl = absolute CrCl × 1.73 ÷ body surface area. Used for this label comparison.</p><button type="button" class="btn secondary" id="labelAdjust" ${state.ok?'':'disabled'}>Apply label kidney adjustment</button><p class="tip" id="labelAdjustTip">${state.text}${state.ok?' The current curve is kept as a baseline for comparison.':''}</p></div>`+
  `<label class="check"><input type="checkbox" id="probenecid" ${c.probenecid?'checked':''}> Probenecid co-administration</label><p class="tip">Lowers acyclovir renal clearance by 32%, as measured in three adults by Laskin et al. [41]. CMMG clearance is unchanged. A single small study; illustrative only.</p>`;
}
function refreshLabelAdjust(){
 const button=$('labelAdjust'),tip=$('labelAdjustTip');if(!button||!tip)return;
 const state=labelAdjustmentState();button.disabled=!state.ok||!dataIsCurrent;
 tip.textContent=state.text+(state.ok?' The current curve is kept as a baseline for comparison.':'');
}
// ---------- Regimen comparison ----------
const REG=window.AyFluxRegimens,REGIMEN_COLORS=['#7a3e9d','#a8740b','#2e7d4f','#c2185b'];
const regimenEscape=text=>String(text).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[ch]);
// Dose and dialysis timeline in words, for the prediction exercise.
function regimenTimeline(config,mode){
 const eff=E.effectiveConfig(config),hours=v=>String(Number(v.toFixed(2)));
 const doses=E.buildDoses(eff),shown=doses.slice(0,10).map(d=>hours(d.time)).join(', ')+(doses.length>10?', …':'');
 const sessions=E.scheduleFor(mode,eff).filter(r=>r.type!=='No dialysis').map(r=>r.type+' '+hours(r.start)+'–'+hours(r.end)+' h');
 return 'Doses at hour '+shown+(sessions.length?' · '+sessions.slice(0,6).join(', ')+(sessions.length>6?', …':''):' · no dialysis');
}
function regimenRow(name,config,mode,data,T,color,index,hidden=false){
 const m=REG.metrics(data,E.buildDoses(E.effectiveConfig(config)),T),f=v=>hidden?'?':v===null?'—':Number(v.toPrecision(3)).toString();
 return `<tr><td>${color?`<span class="swatch" style="border-color:${color}"></span>`:''}${regimenEscape(name)}</td><td>${regimenEscape(describeScenario(config,mode))}${hidden?'<br><span class="tip">'+regimenEscape(regimenTimeline(config,mode))+'</span>':''}</td><td>${f(m.auc)}</td><td>${f(m.peak)}</td><td>${f(m.trough)}${hidden||m.troughTime===null?'':' <span class="tip">(h '+Number(m.troughTime.toFixed(2))+')</span>'}</td><td>${f(m.cmmgAuc)}</td><td>${f(m.cmmgPeak)}</td><td>${index===null?'':`<button type="button" class="btn secondary" data-remove-regimen="${index}">Remove</button>`}</td></tr>`;
}
function renderRegimens(){
 const body=$('regimenRows');if(!body||!REG)return;
 const current=dataIsCurrent&&results?.[primary]?results[primary]:null;
 $('saveRegimen').disabled=!current||savedRegimens.length>=REG.MAX_SAVED;
 $('regimenStatus').textContent=savedRegimens.length>=REG.MAX_SAVED?'Four regimens saved. Remove one to save another.':'Save the selected scenario under a name, change the dose, interval, timing or kidney function, and save again. Saved regimens are frozen: later edits do not change them. Up to four; they last until removed or the page is closed.';
 if(!savedRegimens.length&&!current){body.innerHTML='';$('regimenCaption').textContent='';return;}
 const T=regimenWindow(),hidden=predicting();
 body.innerHTML=savedRegimens.map((r,i)=>regimenRow(r.name,r.config,r.primary,r.data,T,REGIMEN_COLORS[i],i,hidden)).join('')+(current&&!hidden?regimenRow('Current settings (not saved)',c,primary,current,T,null,null):'');
 renderPredictControls();
 $('regimenCaption').textContent=`All values are from median curves of the selected scenario, in mg/L, over the common window 0–${Number(T.toFixed(2))} h (the shortest simulation among the rows). AUC is the plasma area under the curve from 0 to ${Number(T.toFixed(2))} h (mg·h/L). Trough is plasma acyclovir at the start of the last dose that begins after hour 0 and before hour ${Number(T.toFixed(2))}, immediately before that dose; its hour is shown. CMMG values are plasma 9-carboxymethoxymethylguanine: AUC over the same window (mg·h/L) and the highest concentration in it (mg/L). Saved curves appear as dashed lines on the plasma acyclovir and plasma CMMG graphs.`;
}
// ---------- Prediction exercise: hide results, predict, then reveal ----------
const PREDICT_METRICS={trough:'trough acyclovir',peak:'peak acyclovir',auc:'plasma acyclovir AUC',cmmgAuc:'plasma CMMG AUC'};
function regimenWindow(){return Math.min(c.horizon,...savedRegimens.map(r=>r.config.horizon));}
function predicting(){return !!$('predictMode')?.checked;}
function renderPredictControls(){
 const enough=savedRegimens.length>=2,choice=$('predictChoice'),keep=choice.value;
 $('predictMode').disabled=!enough&&!predicting();
 choice.innerHTML=savedRegimens.map((r,i)=>`<option value="${i}">${regimenEscape(r.name)}</option>`).join('');
 if(keep&&+keep<savedRegimens.length)choice.value=keep;
 for(const id of ['predictMetric','predictChoice','revealPrediction'])$(id).disabled=!predicting()||!enough;
 $('predictQuestion').textContent=predicting()?`Which saved regimen will have the highest ${PREDICT_METRICS[$('predictMetric').value]} over hours 0–${Number(regimenWindow().toFixed(2))}? Concentration graphs and summaries are hidden until you reveal.`:enough?'':'Save at least two regimens to run a prediction exercise.';
 document.querySelector('main').classList.toggle('predicting',predicting());
}
$('predictMode').addEventListener('change',()=>{$('predictResult').textContent='';renderRegimens();});
$('predictMetric').addEventListener('change',renderPredictControls);
$('revealPrediction').addEventListener('click',()=>{
 const key=$('predictMetric').value,T=regimenWindow();
 const values=savedRegimens.map(r=>REG.metrics(r.data,E.buildDoses(E.effectiveConfig(r.config)),T)[key]);
 const valid=values.map((v,i)=>[v,i]).filter(([v])=>v!==null);
 if(!valid.length){$('predictResult').textContent='No saved regimen has a value for this question (a single dose has no trough).';return;}
 const best=valid.reduce((a,b)=>b[0]>a[0]?b:a),picked=+$('predictChoice').value,ties=valid.filter(([v])=>Math.abs(v-best[0])<=1e-9*Math.max(1,best[0])).map(([,i])=>i);
 const unit=key==='trough'||key==='peak'?'mg/L':'mg·h/L',name=i=>savedRegimens[i].name;
 $('predictResult').textContent=(ties.includes(picked)?'Correct. ':'Not this time. ')+`Highest ${PREDICT_METRICS[key]}: ${ties.map(name).join(' and ')} (${Number(best[0].toPrecision(3))} ${unit}). `+valid.map(([v,i])=>`${name(i)}: ${Number(v.toPrecision(3))}`).join(' · ')+(valid.length<values.length?' · regimens without a value were skipped':'')+'.';
 $('predictMode').checked=false;renderRegimens();
});
$('saveRegimen').addEventListener('click',()=>{
 if(!dataIsCurrent||!results?.[primary]||savedRegimens.length>=REG.MAX_SAVED)return;
 const d=results[primary],name=($('regimenName').value.trim()||'Regimen '+(savedRegimens.length+1)).slice(0,40);
 savedRegimens.push({name,primary,config:structuredClone(c),data:{time:d.time.slice(),plasma:{median:d.plasma.median.slice()},cmmg:{median:d.cmmg.median.slice()}}});
 savedRevision++;$('regimenName').value='';renderRegimens();render();
});
$('regimenRows').addEventListener('click',e=>{const b=e.target.closest('[data-remove-regimen]');if(!b)return;savedRegimens.splice(+b.dataset.removeRegimen,1);savedRevision++;renderRegimens();render();});
// ---------- Dose timing around intermittent hemodialysis ----------
function currentPostHdPlan(){return REG.postHdPlan(E.effectiveConfig(c),E.scheduleFor(primary,E.effectiveConfig(c)),E.buildDoses(E.effectiveConfig(c)));}
function renderPostHd(){
 const panel=$('postHdRows');if(!panel||!REG)return;
 const plan=currentPostHdPlan(),n=v=>v===null?'—':String(Number(Number(v).toFixed(2)));
 $('applyPostHd').disabled=!plan.ok||!plan.apply;
 if(!plan.ok){$('postHdRule').textContent=plan.reason;panel.innerHTML='';$('postHdFlags').replaceChildren();return;}
 $('postHdRule').textContent=plan.ruleText+' '+plan.cite+(plan.apply?'':' No change is proposed for the current settings.');
 panel.innerHTML=plan.rows.map(r=>`<tr class="${r.change==='unchanged'?'':'changed'}"><td>${r.dose??'new'}</td><td>${n(r.original)}</td><td>${n(r.proposed)}</td><td>${regimenEscape(String(Number(r.amount.toPrecision(6))))} mg</td><td>${r.change==='added'?'Added after HD ('+n(r.session.start)+'–'+n(r.session.end)+' h)':r.change==='moved'?'Moved to end of HD ('+n(r.session.start)+'–'+n(r.session.end)+' h)':'Unchanged'}</td></tr>`).join('');
 $('postHdFlags').replaceChildren(...plan.flags.map(f=>{const li=document.createElement('li');li.className='flag-'+f.kind;li.textContent=({duplicate:'Check: ',drop:'Left out: ',gap:'Note: ',info:'Note: '})[f.kind]+f.text;return li;}));
}
$('applyPostHd').addEventListener('click',()=>{
 const plan=currentPostHdPlan();if(!plan.ok||!plan.apply)return;
 rememberVersion('Before post-dialysis dose timing');studyOverlay=null;
 c.dosingMode='custom';c.customDoses=structuredClone(plan.customDoses);
 renderInputs();
 showScenarioNote('Dose timing after hemodialysis',plan.ruleText+' '+plan.cite+' The regimen is now a custom schedule; open Medication schedule to see every dose. Teaching comparison only, not a dosing recommendation. Use Undo last import in Research tools to return to the previous settings.');
 defer();
});
function applyLabelAdjustment(){
 const state=labelAdjustmentState();if(!state.ok)return;
 if(!dataIsCurrent||!results?.[primary])return;
 baseline={primary,config:structuredClone(c),data:structuredClone(results[primary])};baselineRevision++;$('saveBaseline').textContent='Replace baseline with selected curve';
 rememberVersion('Before label kidney adjustment');studyOverlay=null;
 const before=c.dose+' mg every '+c.every+' h';
 c.dose=Number(state.dose.toPrecision(6));c.every=state.every;
 renderInputs();
 showScenarioNote('Label kidney adjustment','Changed '+before+' to '+c.dose+' mg every '+c.every+' h, following the US acyclovir injection label using body surface area '+c.labelBsa+' m² [10]. The previous curve is shown as the baseline. The label specifies an additional dose after each hemodialysis session. Preview and apply those supplemental doses in Dose timing around hemodialysis on the Concentration tab. This is a teaching comparison, not a dosing recommendation. Use Undo last import in Research tools to return to the previous settings.');
 defer();
}
function updateDrugCaution(){
 const oralDoses=c.dosingMode==='custom'?c.customDoses.filter(d=>d.route==='Valacyclovir oral').map(d=>d.amount):(c.route==='Valacyclovir oral'?[c.dose]:[]);
 if(!oralDoses.length){$('drugCaution').classList.add('hidden');return;}
 $('drugCaution').classList.remove('hidden');
 const high=oralDoses.some(x=>x>1000)?' HIGH-DOSE EXTRAPOLATION: One or more oral doses exceed 1,000 mg; constant fractional bioavailability is not validated at higher doses [8].':'';
 $('drugCaution').textContent='Oral valacyclovir is converted to acyclovir. The 54.5% bioavailability estimate is based on a 1-g healthy-volunteer study [8]. These oral exposure predictions are not validated for CNS infection treatment decisions. They should not be used to substitute oral treatment for indicated IV acyclovir in suspected encephalitis [9,14].'+high;
}
function updateCustomDoseSummary(){
 const x=$('customDoseSummary');if(!x)return;
 const events=E.buildDoses(c);const oral=events.filter(d=>d.route==='Valacyclovir oral').length;
 x.textContent=`${events.length} scheduled doses (${oral} oral, ${events.length-oral} IV) in this simulation. Edit precise times and amounts in the Custom timeline tab.`;
}
function renderChecks(){$('scenarioChecks').innerHTML=modes.map(m=>`<label class="scenario" style="--tone:${COLORS[m]}"><input type="checkbox" data-mode="${m}" ${visible.has(m)?'checked':''} ><span class="line-key" aria-hidden="true" style="border-top-style:${LEGEND_DASH[m]};border-top-color:${COLORS[m]}"></span>${m}</label>`).join('');
const rows=results?results[primary].rows:[];
const legend=$('shadeLegend'),label=document.createElement('span'),strong=document.createElement('strong');strong.textContent=primary;label.append('Background shading: ',strong,' schedule only'+(visible.has(primary)?'':' (curve hidden)'));legend.replaceChildren(label);
 for(const type of new Set(rows.map(r=>r.type))){const item=document.createElement('span'),key=document.createElement('i');key.style.background=typeColor(type);item.append(key,document.createTextNode(type+' active'));legend.append(item);}}
function typeColor(t){return ({HD:COLORS['Intermittent HD'],PD:COLORS['Peritoneal dialysis'],CAPD:COLORS['Peritoneal dialysis'],APD:COLORS['Peritoneal dialysis'],CRRT:COLORS.CRRT})[t]||'#888';}
function plotShade(rows){if(!c.showShades)return [];
 const shapes=[];for(const r of rows){if(r.end<=r.start)continue;
 let type=r.type,base={type:'rect',xref:'x',yref:'paper',line:{width:0},layer:'below'};
 if(type==='APD'){
 // Mark the cycler outline at the chart top, and show drug-exchange dwell blocks across the graph.
 shapes.push({...base,x0:r.start,x1:r.end,y0:.967,y1:1,fillcolor:rgba(typeColor('APD'),.4)});
 const cyc=c.apdDwell+c.apdTurnover;for(let j=0;j<c.apdCycles;j++){
 let from=r.start+j*cyc,to=Math.min(r.end,from+c.apdDwell);if(to>from)shapes.push({...base,x0:from,x1:to,y0:0,y1:.96,fillcolor:rgba(typeColor('APD'),.07)});}
 }else if(type==='HD')shapes.push({...base,x0:r.start,x1:r.end,y0:0,y1:1,fillcolor:rgba(typeColor('HD'),.09)});
 else shapes.push({...base,x0:r.start,x1:r.end,y0:.955,y1:1,fillcolor:rgba(typeColor(type),.42)});
 }return shapes;}
function rgba(hex,alpha){return `rgba(${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)},${alpha})`;}
const chartStates=new Map(),pendingPlots=new Map();
function chartNearViewport(target){
 if(!target||!target.getClientRects().length)return false;
 if(typeof IntersectionObserver==='undefined')return true;
 const rect=target.getBoundingClientRect();
 return rect.bottom>=-160&&rect.top<=window.innerHeight+160;
}
if(typeof IntersectionObserver!=='undefined'){
 const chartObserver=new IntersectionObserver(entries=>{
  if(entries.some(entry=>entry.isIntersecting))render();
 },{rootMargin:'160px 0px'});
 document.querySelectorAll('#concentration .chart, #clearance .chart').forEach(el=>chartObserver.observe(el));
}
let plotFrame=0,renderFrame=0,resizeFrame=0,plotRunning=false,activePlot=null;
function chartSignature(key){return JSON.stringify([key==='plasma'||key==='cmmg'?overlayStudy()?.id||null:null,key==='plasma'||key==='cmmg'?savedRevision:0,concUnit,resultsRevision,baselineRevision,primary,modes.filter(m=>visible.has(m)),paletteMode,c.coverage,c.showBands,c.showShades,key==='csf'&&c.showIC50,key==='csf'&&c.showIC50?c.virus:null]);}
let chartWait=null;
function requestPlotFrame(){
 if(!pendingPlots.size||plotFrame||plotRunning)return;
 if(!window.echarts?.init){
  if(!chartWait){
   chartWait=window.AyFluxCharts.ensure().then(()=>{
    chartWait=null;
    requestPlotFrame();
   }).catch(error=>{
    chartWait=null;
    pendingPlots.clear();
    alertMessage('Unable to load interactive charts. Check your connection or ');const liteLink=document.createElement('a');liteLink.href='/lite/';liteLink.textContent='open AyFlux Lite';$('alerts').append(liteLink,'.');
   });
  }
  return;
 }
 plotFrame=requestAnimationFrame(drawNextPlot);
}
function drawNextPlot(){
 plotFrame=0;
 const entry=pendingPlots.entries().next();if(entry.done)return;
 const [where,job]=entry.value;pendingPlots.delete(where);
 const target=$(where);
 if(!dataIsCurrent||!chartNearViewport(target)){requestPlotFrame();return;}
 plotRunning=true;activePlot={where,signature:job.signature};
 Promise.resolve().then(()=>window.AyFluxCharts.draw(target,job.option))
 .then(()=>{
  if(where==='plasmaChart'&&$('eventsPanel').open)window.AyFluxViews.timeline();
  const rect=target.getBoundingClientRect();
  chartStates.set(where,{signature:job.signature,width:rect.width,height:rect.height});
  if(document.documentElement.dataset.ayfluxReady!=='true'){
   document.documentElement.dataset.ayfluxReady='true';
   window.dispatchEvent(new Event('ayflux:charts-ready'));
  }
 }).catch(error=>{alertMessage('Unable to draw chart: '+error.message);})
 .finally(()=>{plotRunning=false;activePlot=null;requestPlotFrame();});
}
function resizeVisibleCharts(){
 if(resizeFrame)return;
 resizeFrame=requestAnimationFrame(()=>{
  resizeFrame=0;
  for(const [where,state] of chartStates){
   const target=$(where);if(!target.getClientRects().length)continue;
   const rect=target.getBoundingClientRect();
   if(rect.width!==state.width||rect.height!==state.height){
    state.width=rect.width;state.height=rect.height;
    window.echarts?.getInstanceByDom(target)?.resize();
   }
  }
 });
}
window.addEventListener('resize',resizeVisibleCharts,{passive:true});
if(typeof ResizeObserver!=='undefined')new ResizeObserver(resizeVisibleCharts).observe(document.querySelector('main'));
function layout(unit,horizon,series){
 const delta=window.innerWidth<650?Math.max(24,horizon<=72?6:horizon<=168?12:24):horizon<=72?6:horizon<=168?12:24;
 const yLabel=unit.includes('(mg/L)')?(unit.includes('CMMG')?(unit.includes('CSF')?'CSF CMMG (mg/L)':'Plasma CMMG (mg/L)'):unit.includes('dialysate')?'Dialysate acyclovir (mg/L)':unit.includes('CSF')?'CSF acyclovir (mg/L)':'Plasma acyclovir (mg/L)'):
  unit.includes('(mL/min')?'Clearance (mL/min)':unit.includes('(mg/hour)')?'Drug removal (mg/hour)':unit.includes('(mL/hour)')?'Ultrafiltration (mL/hour)':unit;
 const option=window.AyFluxCharts.options(series,'Time (day · hour)',yLabel);
 option.grid.left=window.innerWidth<650?70:84;
 Object.assign(option.xAxis,{max:horizon,interval:delta,axisLabel:{formatter:timeLabel,rotate:25,hideOverlap:true},nameGap:48});
 option.tooltip.axisPointer={label:{formatter:p=>timeLabel(p.value)}};
 const annotations={type:'line',data:[],silent:true,tooltip:{show:false},
  markLine:{symbol:'none',silent:true,label:{show:false},data:results[primary].doses.filter(d=>d.amount>0).map(d=>({
   xAxis:d.time,lineStyle:{color:d.route==='Valacyclovir oral'?'#19856e':'#b54b28',width:1.35,type:'dashed',opacity:.72}}))}};
 option.series=[...series,annotations];
 const shades=plotShade(results[primary].rows);
 if(shades.length)option.series.push({type:'custom',silent:true,z:0,clip:true,
  encode:{x:[0,1],y:[]},data:shades.map(s=>[s.x0,s.x1]),tooltip:{show:false},renderItem:(p,api)=>{
   const s=shades[p.dataIndex],g=p.coordSys,x=api.coord([s.x0,0])[0],end=api.coord([s.x1,0])[0];
   return {type:'rect',shape:{x,y:g.y+(1-s.y1)*g.height,width:end-x,height:(s.y1-s.y0)*g.height},style:{fill:s.fillcolor}};
  }});
 return option;
}
function curve(key,unit,where,ref=null){if(!results)return;
 if(!chartNearViewport($(where)))return;
 const signature=chartSignature(key);
 if(pendingPlots.get(where)?.signature===signature)return;
 if((activePlot?.where===where&&activePlot.signature===signature)||
    (chartStates.get(where)?.signature===signature&&activePlot?.where!==where)){
  pendingPlots.delete(where);return;
 }
 const charts=window.AyFluxCharts,series=[];
 const analyte=CONCENTRATION_KEYS[key],factor=analyte?unitFactor(analyte):1,scale=values=>factor===1?values:values.map(v=>v*factor);
 const dash={solid:'solid',dash:'dashed',dot:'dotted',dashdot:[6,3,2,3],longdash:[10,4]};
 for(const m of modes){
  if(!visible.has(m)||!results[m])continue;
  const d=results[m],z=d[key],color=COLORS[m];
  if(m===primary&&c.showBands)series.push(charts.band(Math.round(c.coverage*100)+'% '+(results._validation.fitted?'updated':'unfitted')+' model interval',d.time,scale(z.lower),scale(z.upper),rgba(color,.17)));
  series.push(charts.line(m+(m===primary?' (selected)':''),d.time,scale(z.median),color,m===primary?4.2:3.2,dash[LINE_DASH[m]]));
 }
 const comparison=baseline&&['plasma','csf','cmmg','csfCmmg'].includes(key);
 let horizon=comparison?Math.max(c.horizon,baseline.config.horizon):c.horizon;
 if(comparison)series.push(charts.line('Baseline: '+baseline.primary,baseline.data.time,scale(baseline.data[key].median),'#303846',2.5,[10,4,2,4]));
 if(key==='plasma'||key==='cmmg')savedRegimens.forEach((r,i)=>{series.push(charts.line(r.name,r.data.time,scale(r.data[key].median),REGIMEN_COLORS[i],2.6,'dashed'));horizon=Math.max(horizon,r.config.horizon);});
 const marker=key==='cmmg'?{value:E.MARKER*factor,label:'Neurotoxicity-associated CMMG level: '+(concUnit==='umol'?'10.8 µmol/L':'2.58 mg/L')+' [3]',color:'#cb496c'}:ref&&c.showStudy?ref:null;
 if(marker)series.push(charts.line(marker.label,[0,c.horizon],[marker.value,marker.value],marker.color,2,'dotted'));
 const study=key==='plasma'||key==='cmmg'?overlayStudy():null,studyPoints=study?(key==='plasma'?study.points:study.cmmgPoints):null;
 if(studyPoints)series.push({name:study.legend+' '+study.cite,type:'scatter',z:6,symbol:'circle',symbolSize:10,
  itemStyle:{color:'#1d2733',borderColor:'#ffffff',borderWidth:1.5},data:studyPoints.map(([t,v])=>[t,v*factor])});
 if(key==='csf'&&c.showIC50){
  const r=VIRUSES[c.virus];
  const low=r.min*factor,high=r.max*factor,text=v=>concUnit==='umol'?Number(v.toPrecision(3)):v;
  series.push(charts.band(c.virus+' in-vitro IC₅₀ range '+text(low)+'–'+text(high)+' '+unitLabel()+' [11]',[0,c.horizon],[low,low],[high,high],'rgba(177,145,56,.2)'));
 }
 const option=layout(unit,horizon,series);
 if(analyte&&option.yAxis?.name)option.yAxis.name=unitText(option.yAxis.name);
 option.toolbox.feature.saveAsImage.name='acyclovir_'+key;
 pendingPlots.set(where,{key,option,signature});requestPlotFrame();
}
function baselineChanges(saved,config,selected){
 const changes=[];
 if(saved.primary!==selected)changes.push('Selected scenario: '+saved.primary+' → '+selected);
 const names={route:'Route',dosingMode:'Dosing schedule',schedule:'Dialysis schedule',customDoses:'Custom doses',renalProfile:'Kidney function profile',renalMode:'Kidney function mode',crclSource:'CrCl source',observations:'Measurements',pdRxRows:'PD exchanges',pdRxEnabled:'Individual PD exchanges',pdMethod:'PD delivery',draws:'Model draws',coverage:'Interval coverage',age:'Age',sex:'Sex used in CrCl estimate',scr:'Serum creatinine'};
 for(const key of Object.keys(config)){
  if(presentationKeys.has(key)||key==='fitMode'||JSON.stringify(saved.config[key])===JSON.stringify(config[key]))continue;
  const def=DEFS[key],label=def?def[0]:names[key]||key;
  const format=value=>typeof value==='object'?JSON.stringify(value):String(value);
  changes.push(label+': '+format(saved.config[key])+' → '+format(config[key])+(def?' '+def[1]:''));
 }
 return changes;
}
function renderBaseline(){
 $('clearBaseline').disabled=!baseline;
 $('baselineDetails').classList.toggle('hidden',!baseline);
 $('baselineChanges').replaceChildren();$('baselineDelta').textContent='';
 if(!baseline){$('baselineStatus').textContent='Freeze the selected scenario, then change settings to compare concentration curves. The baseline lasts until cleared or this page is closed.';return;}
 $('baselineStatus').textContent='Frozen baseline: '+baseline.primary+'. Dark dash-dot lines show saved medians on the four concentration charts; shading, dose markers and uncertainty bands describe the current settings only.';
 const changes=baselineChanges(baseline,c,primary);
 for(const text of changes.length?changes:['No input settings changed.']){const li=document.createElement('li');li.textContent=text;$('baselineChanges').append(li);}
 const rows=[['Peak plasma acyclovir','peak','mg/L',2,'acyclovir'],['Plasma acyclovir AUC','auc','mg·h/L',0,'acyclovir'],['Peak CSF acyclovir','csfPeak','mg/L',2,'acyclovir'],['Peak plasma CMMG','mPeak','mg/L',2,'cmmg'],['Removed by dialysis','mass','mg',0]];
 const parts=rows.map(([label,key,unit,digits,analyte])=>{
  const before=shown(baseline.data.summary[key].median,analyte),after=shown(results[primary].summary[key].median,analyte);
  const change=before>0?` (${after>=before?'+':''}${Math.round(100*(after-before)/before)}%)`:'';
  return `${label}: ${before.toFixed(digits)} → ${after.toFixed(digits)} ${analyte?unitText(unit):unit}${change}`;
 });
 $('baselineDelta').textContent='Baseline → current, median values. '+parts.join(' · ')+'.'+(baseline.config.horizon!==c.horizon?' Simulation durations differ; each value covers its own run.':'');
}
$('saveBaseline').addEventListener('click',()=>{
 if(!dataIsCurrent||!results?.[primary])return;
 baseline={primary,config:structuredClone(c),data:structuredClone(results[primary])};baselineRevision++;
 $('saveBaseline').textContent='Replace baseline with selected curve';render();
});
$('clearBaseline').addEventListener('click',()=>{
 baseline=null;baselineRevision++;$('saveBaseline').textContent='Save selected curve as baseline';render();
});
function showStats(){let d=results[primary].summary;
 let arr=[['Peak plasma acyclovir',d.peak,'mg/L',1,'#ed766b','acyclovir'],['Plasma acyclovir AUC',d.auc,'mg·h/L',0,'#8660c1','acyclovir'],['Peak CSF acyclovir',d.csfPeak,'mg/L',1,'#179b89','acyclovir'],['CSF acyclovir AUC',d.csfAuc,'mg·h/L',0,'#d59c37','acyclovir'],['Peak plasma CMMG',d.mPeak,'mg/L',2,'#cb5891','cmmg'],['Acyclovir removed by dialysis',d.mass,'mg',0,'#3976bd'],['Plasma at simulation end',d.endPlasma,'mg/L',2,'#315d74','acyclovir']];
 if(d.endPdFluidMg.upper>0)arr.push(['Acyclovir remaining in PD fluid',d.endPdFluidMg,'mg',1,'#3976bd']);
 $('metrics').innerHTML=arr.map(([label,v,unit,dig,color,analyte])=>{const u=analyte?unitText(unit):unit,f=x=>shown(x,analyte).toFixed(dig);return `<div class="metric" style="--tone:${color}"><div class="key">${label}</div><div class="val">${f(v.median)} <span style="font-size:11px">${u}</span></div><div class="sub">${results._validation.fitted?"Updated":"Unfitted"} ${Math.round(c.coverage*100)}% model interval: ${f(v.lower)}–${f(v.upper)} ${u}</div></div>`;}).join('');}
function table(){const cols=[['peak','Peak plasma acyclovir (mg/L)',1,'acyclovir'],['auc','Plasma acyclovir AUC (mg·h/L)',0,'acyclovir'],['csfPeak','Peak CSF acyclovir (mg/L)',1,'acyclovir'],['csfAuc','CSF acyclovir AUC (mg·h/L)',0,'acyclovir'],['mPeak','Peak plasma CMMG (mg/L)',2,'cmmg'],['mass','Acyclovir removed by dialysis (mg)',0],['endPdFluidMg','Acyclovir remaining in PD fluid (mg)',1],['endPlasma','Plasma acyclovir at end (mg/L)',2,'acyclovir']];
 let rows=`<table><thead><tr><th>Modality</th>${cols.map(x=>`<th>${x[3]?unitText(x[1]):x[1]}</th>`).join('')}</tr></thead><tbody>`;
 for(let m of modes){let d=results[m].summary;rows+=`<tr><td style="font-weight:800;color:${COLORS[m]}">${m}</td>${cols.map(([id,_,n,analyte])=>`<td>${shown(d[id].median,analyte).toFixed(n)} <span style="color:#8b8593">[${shown(d[id].lower,analyte).toFixed(n)}–${shown(d[id].upper,analyte).toFixed(n)}]</span></td>`).join('')}</tr>`;} $('resultTable').innerHTML=rows+'</tbody></table>';}
let metricsSignature='',tableRevision=-1,validationSignature='';
function render(){if(!renderFrame)renderFrame=requestAnimationFrame(()=>{renderFrame=0;renderNow();});}
function renderNow(){if(!results||!dataIsCurrent)return;
 if(tab==='concentration'){renderChecks();renderBaseline();}
 const summarySignature=resultsRevision+':'+primary;
 if(tab==='concentration'&&metricsSignature!==summarySignature){showStats();metricsSignature=summarySignature;}
 if(tab==='concentration')renderTimeAbove();
 if(tableOpen()&&tableRevision!==resultsRevision&&modes.every(m=>results[m])){table();tableRevision=resultsRevision;}
 if(tab==='validation'&&validationSignature!==summarySignature){renderValidation();validationSignature=summarySignature;}
 if(tab==='research'){renderResearch();}
 if(tab==='concentration'){
 curve('plasma','Plasma acyclovir concentration (mg/L)','plasmaChart');
 curve('csf','CSF acyclovir concentration (mg/L)','csfChart');
 curve('cmmg','Plasma CMMG (mg/L)','cmmgChart');curve('csfCmmg','CSF CMMG (mg/L)','csfCmmgChart');
 }else if(tab==='clearance'){
 const dynamic=c.renalMode==='profile';$('kidneyDynamicPrompt').classList.toggle('hidden',dynamic);$('kidneyClearChart').classList.toggle('hidden',!dynamic);
 if(dynamic){renderRenalProfileChart();$('renalState').textContent='A user-defined, piecewise-linear CrCl profile drives time-varying acyclovir and CMMG renal clearance; no clinical GFR trajectory is inferred.';}
 else{pendingPlots.delete('kidneyClearChart');$('renalState').textContent=c.crcl===0?'Constant CrCl = 0 mL/min: renal clearance is zero. Nonrenal and dialytic clearance remain separate.':`Constant CrCl ${c.crcl} mL/min: select a time-varying profile to explore changes in kidney function.`;}

 curve('dialClear','Net dialytic transfer / plasma (mL/min; may be negative during PD)','dialClearChart');curve('clearance','Total acyclovir clearance — kidneys + nonrenal + dialysis (mL/min)','clearanceChart');curve('dialRate','Net acyclovir transfer toward dialysate (mg/hour)','dialRateChart');curve('pdUF','PD net ultrafiltration (mL/hour)','pdUfChart');curve('pdDialConc','PD dialysate acyclovir (mg/L)','pdConChart');}
 if(dataIsCurrent)$('status').textContent=`Simulation updated: ${results[primary].doses.length} administrations, ${c.draws} model draws.`;
 resizeVisibleCharts();
}
function alertMessage(msg){$('alerts').textContent=msg;$('alerts').classList.toggle('hidden',!msg);}
function calculate(forceAll=false){
 clearTimeout(timer);const id=++calculationVersion;dataIsCurrent=false;queuedJob=null;
 try{
  if(c.crclSource==='estimated'){c.crcl=calculatedCrCl();if(!Number.isFinite(c.crcl))throw Error('Enter valid Cockcroft–Gault inputs');}
  c.fitMode=primary;const v=E.validate(c,primary);if(v.length)throw Error(v.join('\n'));
  const jobConfig=structuredClone(c);jobConfig.requestedModes=requestedModes(forceAll);
  const key=resultKey(jobConfig),cached=completedResults.get(key);
  // Stop obsolete work once validated settings are ready; keep a warm Worker for
  // same-settings requests (e.g. adding a scenario uses the engine's mode cache).
  if(activeJob&&worker&&activeJob.key!==key){worker.terminate();worker=null;activeJob=null;}
  if(cached&&jobConfig.requestedModes.every(m=>cached[m])){
   completedResults.delete(key);completedResults.set(key,cached);acceptResults(cached);return;
  }
  queuedJob={id,key,config:jobConfig};setBusy(true);startNextJob();
 }catch(error){calculationError(error);}
}
function defer(){refreshLabelAdjust();pendingCsvExport=false;++calculationVersion;queuedJob=null;dataIsCurrent=false;setBusy(true);clearTimeout(timer);timer=setTimeout(calculate,180);}
function updateParam(target){let id=target.dataset.k;if(!id)return;let value=Number(target.value);if(target.value.trim()===''||!Number.isFinite(value))return;
 const def=fieldDef(id);if(value<def[2]||value>def[3]){if(target.dataset.role==='number')target.setCustomValidity(`Use ${def[2]}–${def[3]}`);return;}target.setCustomValidity?.('');if(c[id]===value)return;c[id]=value;if(id==='dose')updateDrugCaution();if(id==='weight'&&c.crclSource==='estimated'){c.crcl=calculatedCrCl();const out=$('cgOutput');if(out)out.textContent=c.crcl.toFixed(1)+' mL/min';}
 const same=document.querySelectorAll(`[data-k="${id}"]`);for(const el of same)if(el!==target)el.value=value;
 defer();}
function renderSchedule(){const rows=draft;
 $('scheduleRows').innerHTML=rows.map((r,i)=>`<div class="intervals" data-row="${i}"><div><label>Mode</label><select data-index="${i}" data-field="type">${E.TYPES.map(m=>`<option ${m===r.type?'selected':''}>${m}</option>`).join('')}</select></div><div><label>Start (h)</label><input type="number" step="0.25" min="0" data-index="${i}" data-field="start" value="${r.start}"></div><div><label>End (h)</label><input type="number" step="0.25" min="0" data-index="${i}" data-field="end" value="${r.end}"></div><button class="btn secondary small" data-delete="${i}" aria-label="Delete session ${i+1}">✕</button></div>`).join('');
 paintSchedule(draft);renderPdRxRows();}
function paintSchedule(rows){$('scheduleBar').innerHTML=rows.map(r=>`<span title="${r.type}: ${timeLabel(r.start)} → ${timeLabel(r.end)}" style="left:${100*r.start/c.horizon}%;width:${100*Math.max(0,r.end-r.start)/c.horizon}%;background:${typeColor(r.type)}"></span>`).join('');
 $('scheduleLegend').innerHTML=[...new Set(rows.map(r=>r.type))].map(t=>`<span><i style="background:${typeColor(t)}"></i>${t}</span>`).join('');}
function timelineErrors(errs){$('timelineErrors').textContent=errs.join('\n');$('timelineErrors').classList.toggle('hidden',!errs.length);}
function checkDraft(){return E.validate({...c,schedule:draft},'Custom sequence');}
function applyTimeline(){const errs=checkDraft();timelineErrors(errs);if(errs.length)return;
 c.schedule=structuredClone(draft);dirtyTimeline=false;$('timelinePending').classList.add('hidden');primary='Custom sequence';$('primary').value=primary;visible.add(primary);renderInputs();calculate();}
function switchTab(next){if(next==='doses')next='timeline';tab=next;for(const btn of document.querySelectorAll('[data-tab]'))btn.classList.toggle('active',btn.dataset.tab===tab);
 // Drug reference and methods share one tab; legacy 'reference' and 'table' targets still resolve.
 if(tab==='reference')tab='method';
 if(tab==='table'){tab='concentration';$('tablePanel').open=true;}
 for(const btn of document.querySelectorAll('[data-tab]'))btn.classList.toggle('active',btn.dataset.tab===tab);
 for(const name of ['concentration','clearance','timeline','validation','reference','method','research'])$(name).classList.toggle('hidden',name!==tab&&!(name==='reference'&&tab==='method'));
 if(tableOpen()&&(!dataIsCurrent||!results||modes.some(m=>!results[m])))calculate(true);
 else if(results)render();
 if(tab==='timeline'){renderSchedule();renderPdRxEditor();renderDoseRows();}
 if(tab==='research')renderResearch();
 if(tab==='method')renderScorecard();resizeVisibleCharts();}
function download(){if(!results)return;const heads=['time_hours','day_hour','mode','plasma_mg_L_median','plasma_mg_L_lower','plasma_mg_L_upper','csf_mg_L_median','csf_mg_L_lower','csf_mg_L_upper','cmmg_mg_L_median','cmmg_mg_L_lower','cmmg_mg_L_upper','residual_kidney_clearance_mL_min_median','cmmg_residual_kidney_clearance_mL_min_median','total_clearance_mL_min_median','dialysis_only_clearance_mL_min_median','dialysis_removal_mg_hour_median','medication_events_at_time','entered_residual_crcl_mL_min'];let lines=[heads.join(',')];
 for(const mode of modes){let d=results[mode];for(let i=0;i<d.time.length;i++){lines.push([d.time[i],JSON.stringify(timeLabel(d.time[i])),JSON.stringify(mode),d.plasma.median[i],d.plasma.lower[i],d.plasma.upper[i],d.csf.median[i],d.csf.lower[i],d.csf.upper[i],d.cmmg.median[i],d.cmmg.lower[i],d.cmmg.upper[i],d.kidneyClear.median[i],d.cmmgKidneyClear.median[i],d.clearance.median[i],d.dialClear.median[i],d.dialRate.median[i],JSON.stringify(d.doses.filter(x=>Math.abs(x.time-d.time[i])<1e-7).map(x=>`${x.route}: ${x.amount} mg${x.route==='Acyclovir IV'?` / ${x.infusion} h infusion`:''}`).join('; ')),E.renalCrClAt(c,d.time[i])].join(','));}}
 const a=document.createElement('a'),url=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/csv;charset=utf-8'}));a.href=url;a.download='ayflux_simulation_data.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
// Long-format result exchange is independent of AyFlux configuration JSON and the existing CSV.
function downloadTidyCSV(){
 if(!results||!dataIsCurrent)return;
 try{
  const csv=window.AyFluxExchange.exportTidyCSV(results,modes,{coverage:c.coverage});
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='ayflux_results_tidy.csv';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
 }catch(error){alertMessage('Unable to export R / OSP CSV: '+error.message);}
}

async function downloadOSPWorkbook(){
 if(!results||!dataIsCurrent)return;
 const snapshot=results;
 try{
  if(!window.AyFluxXlsx)await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='/assets/osp-xlsx.js';s.onload=resolve;s.onerror=()=>{s.remove();reject(Error('Workbook exporter could not load.'));};document.head.append(s);});
  const bytes=window.AyFluxXlsx.workbook(snapshot,modes,window.AyFluxVersion?.version||'AyFlux');
  const url=URL.createObjectURL(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  const a=document.createElement('a');a.href=url;a.download='AyFlux_PKSim_MoBi_predictions.xlsx';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
 }catch(error){alertMessage('Unable to export XLSX: '+error.message);}
}
let measureDraft=structuredClone(c.observations);
function renderMeasureRows(){
 $('measureRows').innerHTML=measureDraft.map((m,i)=>`<tr><td><input data-mi="${i}" data-mk="time" type="number" min="0" max="${c.horizon}" step="any" value="${m.time}"></td><td><select data-mi="${i}" data-mk="analyte">${[['plasma','Plasma acyclovir'],['csf','CSF acyclovir'],['cmmg','Plasma CMMG'],['csfCmmg','CSF CMMG']].map(([k,v])=>`<option value="${k}" ${m.analyte===k?'selected':''}>${v}</option>`).join('')}</select></td><td><input type="number" data-mi="${i}" data-mk="value" min="0" step="any" value="${m.value}"></td><td><select data-mi="${i}" data-mk="role"><option value="fit" ${m.role==='fit'?'selected':''}>Fit</option><option value="holdout" ${m.role==='holdout'?'selected':''}>Hold-out</option></select></td><td><button class="btn secondary" data-remove-measure="${i}" type="button">×</button></td></tr>`).join('');
}
function validationErrors(){let errors=[];for(const [i,m] of measureDraft.entries()){
 if(!Number.isFinite(m.time)||m.time<0||m.time>c.horizon)errors.push(`Measurement ${i+1}: time must be within 0–${c.horizon} h`);
 if(!Number.isFinite(m.value)||m.value<0||m.value>100000)errors.push(`Measurement ${i+1}: enter a valid nonnegative concentration`);
 }return errors;
}
function renderForecast(forecast, reveal=false) {
 const output = $('forecastOutput');
 for(const el of output.querySelectorAll('.forecast-chart'))window.AyFluxCharts.dispose(el);
 output.replaceChildren();
 $('revealForecast').hidden = !forecast?.targets.length || reveal;
 if (!forecast) { $('forecastSummary').textContent=''; return; }
 $('forecastCutoff').value=forecast.cutoff;
 $('forecastSummary').textContent=forecast.targets.length
   ? `Fitting measurements through ${forecast.cutoff} h: ${forecast.fitted}. Predictions are medians with 90% measurement intervals.`
   : 'No applied measurement follows this cutoff.';
 const labels={plasma:'Plasma acyclovir',csf:'CSF acyclovir',cmmg:'Plasma CMMG',csfCmmg:'CSF CMMG'};
 for (const target of forecast.targets) {
   const heading=document.createElement('h3');
   heading.textContent=`${labels[target.analyte]} at ${target.time} h`;
   output.append(heading);
   const figure=document.createElement('div');figure.className='forecast-chart';figure.style.height='260px';output.append(figure);
   const intervals=[target.population,target.updated],names=['Population','Updated'];
   const series=intervals.map((v,i)=>({name:names[i],type:'line',symbolSize:6,data:[[v.lower,i],[v.upper,i]],lineStyle:{width:3}}));
   series.push({type:'scatter',name:'Median',symbol:'diamond',symbolSize:12,data:intervals.map((v,i)=>[v.median,i])});
   if(reveal)series.push({name:'Observed',type:'scatter',symbol:'triangle',symbolSize:12,data:names.map((_,i)=>[target.observed,i])});
   const option=window.AyFluxCharts.options(series,'Concentration (mg/L)','');
   option.yAxis={type:'category',data:names};option.grid.left=82;option.tooltip.trigger='item';
   window.AyFluxCharts.ensure().then(()=>{if(figure.isConnected)window.AyFluxCharts.draw(figure,option);}).catch(()=>{figure.hidden=true;});
   for (const [label,interval] of [['Population',target.population],['Updated',target.updated]]) {
     const line=document.createElement('p');
     line.textContent=`${label}: ${interval.median.toFixed(2)} mg/L (${interval.lower.toFixed(2)}–${interval.upper.toFixed(2)}).`;
     if (reveal) {
       const error=interval.median-target.observed;
       const covered=target.observed>=interval.lower && target.observed<=interval.upper;
       line.textContent+=` Observed ${target.observed} mg/L. Predicted minus observed: ${error.toFixed(2)} mg/L. Observation ${covered?'inside':'outside'} interval.`;
     }
     output.append(line);
   }
 }
}
$('runForecast').addEventListener('click',()=>{
 const field=$('forecastCutoff');
 field.max=c.horizon;
 field.required=true;
 if (!field.reportValidity()) return;
 c.forecastCutoff=field.valueAsNumber;
 renderForecast(null);
 calculate();
 if (results?._validation?.forecast?.cutoff===c.forecastCutoff) renderForecast(results._validation.forecast);
});
$('revealForecast').addEventListener('click',()=>renderForecast(results?._validation?.forecast,true));
const analyteLabels={plasma:'Plasma acyclovir',csf:'CSF acyclovir',cmmg:'Plasma CMMG',csfCmmg:'CSF CMMG'};
let holdoutRevision=0;
function renderHoldoutFigure(){
 const revision=++holdoutRevision;
 const rows=results?._validation.lines||[],panel=$('holdoutFigure'),target=$('holdoutChart');
 panel.hidden=!rows.length;
 const charts=window.AyFluxCharts,button=$('holdoutSvg');
 button.disabled=true;
 if(!rows.length){charts.dispose(target);return;}
 const select=$('holdoutAnalyte'),previous=select.value;
 const analytes=Object.keys(analyteLabels).filter(key=>rows.some(row=>row.analyte===key));
 select.replaceChildren(...analytes.map(key=>new Option(analyteLabels[key],key)));
 if(analytes.includes(previous))select.value=previous;
 const selected=rows.filter(row=>row.analyte===select.value);
 const errors=selected.map(row=>row.predicted-row.observed);
 const mean=values=>values.reduce((sum,v)=>sum+v,0)/values.length;
 const fmt=v=>Number(v.toPrecision(4)).toString();
 $('holdoutSummary').textContent=selected.length+' held out · Mean error '+fmt(mean(errors))+' mg/L · RMSE '+fmt(Math.sqrt(mean(errors.map(v=>v*v))))+' mg/L · 90% interval coverage '+selected.filter(row=>row.hit).length+'/'+selected.length;
 $('holdoutData').replaceChildren(...selected.map((r,i)=>{
  const tr=document.createElement('tr');
  for(const v of [fmt(r.hour),fmt(r.observed),fmt(r.predicted),fmt(errors[i]),fmt(r.lo)+'–'+fmt(r.hi)])tr.insertCell().textContent=v;
  return tr;
 }));
 const agreement=$('holdoutView').value==='agreement';
 const limit=Math.max(1,...selected.map(r=>agreement?Math.max(r.observed,r.predicted):r.hour))*1.05;
 const reference=charts.line(agreement?'Identity':'Zero error',[0,limit],agreement?[0,limit]:[0,0],'#637789',1.5,'dashed');
 reference.silent=true;
 const points={name:analyteLabels[select.value],type:'scatter',symbolSize:9,itemStyle:{color:'#12649a'},
  data:selected.map((r,i)=>agreement?[r.observed,r.predicted]:[r.hour,errors[i]])};
 const option=charts.options([reference,points],agreement?'Observed concentration (mg/L)':'Sampling time (h)',agreement?'Predicted concentration (mg/L)':'Prediction error (mg/L)');
 option.xAxis.max=limit;
 if(agreement){option.yAxis.min=0;option.yAxis.max=limit;}
 option.title={text:analyteLabels[select.value],textStyle:{fontSize:14}};
 option.tooltip={trigger:'item',renderMode:'richText',formatter:p=>{
  const r=selected[p.dataIndex];
  return r.hour+' h · Observed '+fmt(r.observed)+' mg/L\nPredicted '+fmt(r.predicted)+' mg/L · Error '+fmt(errors[p.dataIndex])+' mg/L';
 }};
 charts.ensure().then(()=>{
  if(revision!==holdoutRevision||panel.hidden)return;
  if(tab!=='validation'){validationSignature='';return;}
  charts.draw(target,option);button.disabled=false;
 }).catch(()=>{if(revision===holdoutRevision)target.textContent='Chart unavailable. See Figure data.';});
}
$('holdoutAnalyte').addEventListener('change',renderHoldoutFigure);
$('holdoutView').addEventListener('change',renderHoldoutFigure);
$('holdoutSvg').addEventListener('click',()=>{
 const target=$('holdoutChart'),chart=window.echarts.getInstanceByDom(target);
 if(!chart)return;
 const option=chart.getOption();
 option.toolbox=[{show:false}];option.animation=false;
 const vector=window.echarts.init(null,null,{renderer:'svg',ssr:true,width:Math.max(720,chart.getWidth()),height:Math.max(400,chart.getHeight())});
 try{
  vector.setOption(option);
  const url=URL.createObjectURL(new Blob([vector.renderToSVGString()],{type:'image/svg+xml'}));
  const link=document.createElement('a');link.href=url;link.download='ayflux-'+$('holdoutAnalyte').value+'-'+$('holdoutView').value+'.svg';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 }finally{vector.dispose();}
});
$('forecastHeld').onchange=()=>{
 const at=Number($('forecastHeld').value);
 if(!$('forecastHeld').value)return;
 const previous=Math.max(0,...c.observations.filter(r=>r.time<at).map(r=>r.time));
 $('forecastCutoff').value=previous;$('runForecast').click();
};
function renderValidation(){
 const held=[...new Set(c.observations.filter(r=>r.role==='holdout'&&r.time>0).map(r=>r.time))].sort((a,b)=>a-b);
 $('forecastHeldLabel').hidden=!held.length;
 $('forecastHeld').replaceChildren(new Option('Select time',''),...held.map(t=>new Option(t+' h',t)));
 renderHoldoutFigure();if(!results)return;const v=results._validation;
 renderForecast(v.forecast);
 $('fitScenario').textContent=v.fitMode;
 $('covFraction').textContent=v.n?`${(v.fraction*100).toFixed(0)}%`:'Not assessed';
 $('covCount').textContent=v.n?`${v.covered} of ${v.n} held-out measurements inside the 90% predictive interval`:'No independent held-out measurements';
 $('covCI').textContent=v.n?`${(v.ci[0]*100).toFixed(0)}–${(v.ci[1]*100).toFixed(0)}%`:'—';
 $('posteriorESS').textContent=`${v.ess.toFixed(1)} / ${v.draws}`;
 $('posteriorNote').textContent=v.fitted?`${v.fitted} fitting measurements · Effective sample size reflects reweighting`:'No fitting observations (prior distribution)';
 $('validationResults').textContent=v.n?`${v.lines.map((x,i)=>`Hold-out ${i+1}: ${x.analyte} at ${x.hour} h, observed ${x.observed} mg/L; predictive 90% interval ${x.lo.toFixed(2)}–${x.hi.toFixed(2)} mg/L — ${x.hit?'inside':'outside'}.`).join(' ')} This is an internal diagnostic, NOT validated clinical coverage.`:'No observations held out. A central 90% simulated band does not establish 90% clinical accuracy.';
 if(v.fitted&&v.ess<Math.max(8,v.draws*.1))$('validationResults').textContent+=` Low effective sample size (${v.ess.toFixed(1)} of ${v.draws} parameter draws): few sampled parameter sets carry most of the posterior weight. Estimates may be unstable. Review the assay-error assumptions and model fit; consider a larger or better-targeted ensemble.`;
}
$('measureRows').addEventListener('input',e=>{const i=Number(e.target.dataset.mi),k=e.target.dataset.mk;if(!(k&&measureDraft[i]))return;measureDraft[i][k]=['value','time'].includes(k)?(e.target.value===''?NaN:Number(e.target.value)):e.target.value;});
$('measureRows').addEventListener('change',e=>{const i=Number(e.target.dataset.mi),k=e.target.dataset.mk;if(k&&measureDraft[i])measureDraft[i][k]=['value','time'].includes(k)?Number(e.target.value):e.target.value;});
$('measureRows').addEventListener('click',e=>{const b=e.target.closest('[data-remove-measure]');if(!b)return;measureDraft.splice(Number(b.dataset.removeMeasure),1);renderMeasureRows();});
$('addMeasure').addEventListener('click',()=>{measureDraft.push({time:12,analyte:'plasma',value:2,role:'fit'});renderMeasureRows();});
$('applyMeasures').addEventListener('click',()=>{const errors=validationErrors();$('measureWarning').textContent=errors.join('\n');$('measureWarning').classList.toggle('hidden',!errors.length);if(errors.length)return;c.observations=structuredClone(measureDraft);calculate();});
$('clearMeasures').addEventListener('click',()=>{measureDraft=[];c.observations=[];renderMeasureRows();calculate();});

function handleRenalRowChange(element){
 const index=Number(element.dataset.renalRow),key=element.dataset.renalKey;
 if(!Number.isInteger(index)||index<0||index>=renalDraft.length||!['time','crcl'].includes(key))return;
 const value=element.valueAsNumber;
 if(!Number.isFinite(value)){const status=$('renalProfileStatus');if(status)status.textContent='Enter a valid number in the kidney profile.';return;}
 renalDraft[index][key]=value;
 renalDirty=true;
 const status=$('renalProfileStatus');if(status)status.textContent='Edits not yet applied. Click Apply profile to update the graph.';
}
// Illustrative only: steady kidney function, then a fall to one fifth of the starting value that persists.
function kidneyInjuryExample(start,horizon){
 const round=value=>Number(value.toFixed(2)),low=round(Math.max(0,start*.2));
 return [{time:0,crcl:round(start)},{time:round(horizon*.5),crcl:round(start)},{time:round(horizon*.75),crcl:low},{time:round(horizon),crcl:low}];
}
function addRenalPoint(){
 if(renalDraft.length>=24)return;
 let index=-1,width=0;
 for(let i=1;i<renalDraft.length;i++){
  const gap=renalDraft[i].time-renalDraft[i-1].time;
  if(gap>width){width=gap;index=i;}
 }
 if(index<1||width<.002)return;
 const a=renalDraft[index-1],b=renalDraft[index];
 renalDraft.splice(index,0,{time:Number(((a.time+b.time)/2).toFixed(3)),crcl:Number(((a.crcl+b.crcl)/2).toFixed(2))});
 renalDirty=true;renderInputs();
}
$('patientControls').addEventListener('change',e=>{
 if(e.target.matches('[data-renal-row]'))handleRenalRowChange(e.target);
 else if(e.target.id==='renalMode'){
  if(e.target.value==='profile')activateRenalProfile();
  else {c.crcl=c.renalProfile?.[0]?.crcl??c.crcl;c.renalMode='constant';c.crclSource='manual';renalDraft=structuredClone(c.renalProfile);renalDirty=false;renderInputs();defer();}
 }
});
$('patientControls').addEventListener('click',e=>{
 if(e.target.id==='renalAdd')addRenalPoint();
 else if(e.target.id==='renalExample'){renalDraft=kidneyInjuryExample(renalDraft[0]?.crcl??c.crcl,c.horizon);renalDirty=true;renderInputs();}
 else if(e.target.id==='renalApply')applyRenalDraft();
 else if(e.target.hasAttribute('data-renal-remove')){
  const index=Number(e.target.dataset.renalRemove);
  if(Number.isInteger(index)&&index>0&&renalDraft.length>2){renalDraft.splice(index,1);renalDirty=true;renderInputs();}
 }
});
$('enableRenalProfile').addEventListener('click',()=>{
 activateRenalProfile();
 if(tab!=='clearance')switchTab('clearance');
});
$('patientControls').addEventListener('change',e=>{if(e.target.id==='crclSource'){c.crclSource=e.target.value;if(c.crclSource==='estimated')c.crcl=calculatedCrCl();renderInputs();defer();}else if(e.target.id==='cgSex'){c.sex=e.target.value;c.crcl=calculatedCrCl();renderInputs();defer();}else if(e.target.id==='route'){c.route=e.target.value;c.dose=c.route==='Valacyclovir oral'?1000:700;renderInputs();defer();}else if(e.target.id==='dosingMode'){c.dosingMode=e.target.value;renderInputs();defer();if(c.dosingMode==='custom')switchTab('doses');}});
$('patientControls').addEventListener('input',e=>{if(e.target.id==='cgAge'||e.target.id==='cgScr'){const v=Number(e.target.value);if(!Number.isFinite(v)||e.target.value==='')return;if(e.target.id==='cgAge')c.age=v;else c.scr=v;c.crcl=calculatedCrCl();const target=$('cgOutput');if(target)target.textContent=Number.isFinite(c.crcl)?c.crcl.toFixed(1)+' mL/min':'—';defer();}});
$('patientControls').addEventListener('click',e=>{if(e.target.id==='openDoses')switchTab('doses');else if(e.target.id==='labelAdjust')applyLabelAdjustment();});
$('patientControls').addEventListener('change',e=>{if(e.target.id==='probenecid'){c.probenecid=e.target.checked;defer();}else if(e.target.id==='labelBsa'){const value=e.target.valueAsNumber;if(e.target.value!==''&&(!Number.isFinite(value)||value<=0)){e.target.setCustomValidity('Enter a positive body surface area in m²');c.labelBsa=0;refreshLabelAdjust();return;}e.target.setCustomValidity('');c.labelBsa=e.target.value===''?0:value;refreshLabelAdjust();}});
$('modeControls').addEventListener('click',e=>{if(e.target.id==='showPdRx'){switchTab('timeline');$('pdRxPanel').scrollIntoView({block:'start',behavior:'smooth'});}});
$('primary').addEventListener('change',e=>{primary=e.target.value;renderInputs();defer();});
document.querySelector('aside').addEventListener('input',e=>{if(e.target.dataset.k)updateParam(e.target);});
document.querySelector('aside').addEventListener('change',e=>{if(e.target.id==='colorPalette'){setPalette(e.target.value);renderInputs();if(results)render();}else if(e.target.id==='virus'){c.virus=e.target.value;renderInputs();if(results)render();}else if(e.target.id==='pdMethod'){c.pdMethod=e.target.value;renderInputs();researchRenderedPrimary='';defer();}else if(e.target.id==='draws'){c.draws=+e.target.value;defer();}else if(e.target.id==='coverage'){c.coverage=+e.target.value;defer();}else if(e.target.dataset.toggle){c[e.target.dataset.toggle]=e.target.checked;if(results)render();}else if(e.target.dataset.k)updateParam(e.target);});
$('scenarioChecks').addEventListener('change',e=>{let m=e.target.dataset.mode;if(!m)return;e.target.checked?visible.add(m):visible.delete(m);if(e.target.checked&&(!results||!dataIsCurrent||!results[m]))calculate();else if(results)render();});
document.addEventListener('click',e=>{const ref=e.target.closest('a[href^="#ref"]');if(!ref)return;if(!document.querySelector(ref.getAttribute('href')))return;switchTab('method');setTimeout(()=>document.querySelector(ref.getAttribute('href'))?.scrollIntoView({block:'center',behavior:'smooth'}),90);});
$('tabs').addEventListener('click',e=>{let b=e.target.closest('[data-tab]');if(b)switchTab(b.dataset.tab);});
$('timeAboveLevel').addEventListener('input',e=>{const value=e.target.valueAsNumber;aboveLevelMg=Number.isFinite(value)&&value>=0?value/unitFactor('acyclovir'):null;renderTimeAbove();});
$('concUnit').addEventListener('change',e=>{setConcUnit(e.target.value);renderTimeAbove(true);metricsSignature='';tableRevision=-1;if(results)render();});
$('tablePanel').addEventListener('toggle',()=>{if(!tableOpen())return;if(!dataIsCurrent||!results||modes.some(m=>!results[m]))calculate(true);else render();});
document.querySelector('.ref-nav').addEventListener('click',e=>{const link=e.target.closest('a[href^="#"]');if(!link)return;const target=document.querySelector(link.getAttribute('href'));if(!target)return;e.preventDefault();target.scrollIntoView({block:'start',behavior:'smooth'});});
$('scheduleRows').addEventListener('input',e=>{let i=Number(e.target.dataset.index),key=e.target.dataset.field;if(!(key&&draft[i]))return;
 draft[i][key]=key==='type'?e.target.value:(e.target.value===''?NaN:Number(e.target.value));dirtyTimeline=true;timelineErrors(checkDraft());paintSchedule(draft);$('timelinePending').classList.remove('hidden');});
$('scheduleRows').addEventListener('click',e=>{const b=e.target.closest('[data-delete]');if(!b)return;draft.splice(Number(b.dataset.delete),1);dirtyTimeline=true;renderSchedule();});
$('addRow').addEventListener('click',()=>{let t=draft.length?Math.min(c.horizon-4,Math.max(0,Math.max(...draft.map(r=>r.end)))):18;draft.push({type:'HD',start:t,end:Math.min(c.horizon,t+4)});dirtyTimeline=true;renderSchedule();});
$('presetSwitch').addEventListener('click',()=>{if(c.horizon<60){c.horizon=96;renderInputs();}draft=[{type:'PD',start:0,end:24},{type:'PD',start:24,end:48},{type:'HD',start:54,end:58}];renderSchedule();dirtyTimeline=true;$('timelinePending').classList.remove('hidden');});
$('presetHD').addEventListener('click',()=>{draft=[{type:'HD',start:18,end:24}];renderSchedule();dirtyTimeline=true;$('timelinePending').classList.remove('hidden');});
$('applySchedule').addEventListener('click',applyTimeline);
$('applyFullTimeline').addEventListener('click',()=>{
 const useCustomDoses=dirtyDoses||c.dosingMode==='custom';
 const proposed={...c,schedule:draft,customDoses:doseDraft,dosingMode:useCustomDoses?'custom':c.dosingMode,
   pdRxEnabled:$('pdRxEnable').checked,pdRxRows:rxDraft};
 const err=E.validate(proposed,'Custom sequence');
 if(err.length){timelineErrors([...new Set(err)]);$('timelineErrors').scrollIntoView({block:'center'});return;}
 c.schedule=structuredClone(draft);c.customDoses=structuredClone(doseDraft);if(useCustomDoses)c.dosingMode='custom';
 c.pdRxEnabled=$('pdRxEnable').checked;c.pdRxRows=structuredClone(rxDraft);
 primary='Custom sequence';visible.add(primary);$('primary').value=primary;
 dirtyTimeline=false;dirtyDoses=false;$('timelinePending').classList.add('hidden');$('dosePending').classList.add('hidden');
 $('pdRxErrors').classList.add('hidden');timelineErrors([]);renderInputs();renderSchedule();renderDoseRows();renderPdRxRows();calculate();
 pdStatusText('Applied dialysis sessions, exchange prescriptions and medication administrations together.');
});
$('applyFullTimelineBottom').addEventListener('click',()=>$('applyFullTimeline').click());
$('csv').addEventListener('change',event=>{const format=event.target.value;event.target.value='';if(!dataIsCurrent||!['wide','tidy','xlsx'].includes(format))return;if(modes.some(m=>!results[m])){pendingCsvExport=format;calculate(true);}else if(format==='tidy')downloadTidyCSV();else if(format==='xlsx')downloadOSPWorkbook();else download();});
// Medication timeline is separate from dialysis timeline. Mixed routes share the same drug state.
function renderDoseRows(){
 const target=$('doseRows');if(!target)return;
 target.innerHTML=doseDraft.map((d,i)=>`<div class="dose-row ${d.route==='Acyclovir IV'?'':'dose-row--oral'}" data-dose-row="${i}">
 <div><label>Time (hours)</label><input type="number" step="any" min="0" data-dose-index="${i}" data-dose-field="time" value="${d.time}"></div>
 <div><label>Medication / route</label><select data-dose-index="${i}" data-dose-field="route">${E.ROUTES.map(r=>`<option value="${r}" ${r===d.route?'selected':''}>${r==='Acyclovir IV'?'Acyclovir · IV':'Valacyclovir · oral'}</option>`).join('')}</select></div>
 <div><label>Amount (mg)</label><input type="number" step="any" min="0.01" max="${E.MAX_DOSE_MG[d.route]}" data-dose-index="${i}" data-dose-field="amount" value="${d.amount}"></div>
 ${d.route==='Acyclovir IV'?`<div><label>IV infusion (hours)</label><input type="number" step="any" min="0.01" max="24" data-dose-index="${i}" data-dose-field="infusion" value="${d.infusion||1}"></div>`:''}
 <button class="btn secondary small" data-delete-dose="${i}" aria-label="Remove medication dose ${i+1}">✕</button></div>`).join('');
 $('doseCountPreview').textContent=`${doseDraft.length} planned administration${doseDraft.length===1?'':'s'} · Oral and IV amounts are in their own labeled drug milligrams, not equivalent doses.`;
 paintDoses();checkDoseDraft();
}
function paintDoses(){
 $('doseBar').replaceChildren(...doseDraft.filter(d=>Number.isFinite(d.time)&&d.time>=0&&d.time<c.horizon).map(d=>{const marker=document.createElement('span');marker.title=d.route+' '+d.amount+' mg @ '+timeLabel(d.time);marker.style.left=(100*d.time/c.horizon)+'%';marker.style.width='4px';marker.style.background=d.route==='Valacyclovir oral'?'#159b87':'#da5982';return marker;}));
}
function checkDoseDraft(){const e=E.validateDoses({...c,dosingMode:'custom',customDoses:doseDraft});
 $('doseErrors').textContent=e.join('\n');$('doseErrors').classList.toggle('hidden',!e.length);return e;}
function applyDoseDraft(){const errs=checkDoseDraft();if(errs.length)return;
 c.customDoses=structuredClone(doseDraft);c.dosingMode='custom';dirtyDoses=false;
 $('dosePending').classList.add('hidden');renderInputs();calculate();renderDoseRows();}
$('doseRows').addEventListener('input',e=>{let idx=Number(e.target.dataset.doseIndex),key=e.target.dataset.doseField;
 if(!(key&&doseDraft[idx]))return;
 if(key==='route'){doseDraft[idx].route=e.target.value;if(e.target.value==='Acyclovir IV'&&!doseDraft[idx].infusion)doseDraft[idx].infusion=1;renderDoseRows();}
 else doseDraft[idx][key]=e.target.value===''?NaN:Number(e.target.value);
 dirtyDoses=true;$('dosePending').classList.remove('hidden');checkDoseDraft();paintDoses();});
$('doseRows').addEventListener('click',e=>{let b=e.target.closest('[data-delete-dose]');if(!b)return;doseDraft.splice(Number(b.dataset.deleteDose),1);dirtyDoses=true;$('dosePending').classList.remove('hidden');renderDoseRows();});
$('addDose').addEventListener('click',()=>{let t=doseDraft.length?Math.min(c.horizon-1,Math.max(...doseDraft.map(d=>Number.isFinite(d.time)?d.time:0))+8):0;
 doseDraft.push({time:t,route:'Acyclovir IV',amount:250,infusion:1});dirtyDoses=true;$('dosePending').classList.remove('hidden');renderDoseRows();});
$('oralIVPreset').addEventListener('click',()=>{if(c.horizon<=49){c.horizon=96;renderInputs();}
 doseDraft=[{time:12,route:'Valacyclovir oral',amount:1000},{time:24,route:'Acyclovir IV',amount:250,infusion:1},{time:48,route:'Acyclovir IV',amount:250,infusion:1}];dirtyDoses=true;$('dosePending').classList.remove('hidden');renderDoseRows();});
$('applyDoses').addEventListener('click',applyDoseDraft);
$('exportDoses').addEventListener('click',()=>{
 const rows=[['time_hours','medication_route','amount_mg','iv_infusion_hours'].join(',')].concat(E.buildDoses(c).map(d=>[d.time,JSON.stringify(d.route),d.amount,d.infusion||''].join(',')));
 const a=document.createElement('a'),u=URL.createObjectURL(new Blob([rows.join('\n')],{type:'text/csv;charset=utf-8'}));a.href=u;a.download='acyclovir_medication_schedule.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),2000);
});
$('footerReferences').addEventListener('click',()=>switchTab('method'));

// Make source citations work even when Methods & citations is not the active tab.
document.querySelectorAll('a[href^="#ref"]').forEach(link=>{
  link.addEventListener('click',event=>{
    const ref=link.getAttribute('href');
    if(!/^#ref\d+$/.test(ref))return;
    const target=document.getElementById(ref.slice(1));
    if(!target)return;
    event.preventDefault();
    switchTab('method');
    requestAnimationFrame(()=>target.scrollIntoView({block:'start',behavior:'smooth'}));
  });
});


// V13 Research tools. All computations remain in-browser; configurations are never uploaded.
let rxDraft=structuredClone(c.pdRxRows);
const localStatus=$('researchStatus');
function researchStatus(text,problem=false){localStatus.textContent=text;localStatus.classList.toggle('warning',problem);}
function pdStatusText(text,problem=false){const el=$('pdRxStatus');el.textContent=text;el.classList.toggle('warning',problem);}
function nominalRx(){
 if(c.pdMethod==='cycler'){
  const n=c.apdCycles,cycle=c.apdDwell+c.apdTurnover;
  return Array.from({length:n},(_,i)=>({start:+(i*cycle).toFixed(3),dwell:c.apdDwell,fill:c.pdVolume,glucose:c.pdGlucose,uf:null}));
 }
 return Array.from({length:c.capdExchanges},(_,i)=>({start:+(i*c.capdDwell).toFixed(3),dwell:c.capdDwell,fill:c.pdVolume,glucose:c.pdGlucose,uf:null}));
}
function renderPdRxRows(){
 const pdWindows=draft.filter(x=>x.type==='PD'&&Number.isFinite(x.start));
 $('pdRxRows').innerHTML=rxDraft.map((r,i)=>`<tr>
 <td>${i+1}</td><td><select aria-label="PD window for exchange ${i+1}" data-rxi="${i}" data-rxk="sessionStart"><option value="all" ${r.sessionStart==null?'selected':''}>Each PD window</option>${pdWindows.map(w=>`<option value="${w.start}" ${r.sessionStart===w.start?'selected':''}>${w.start}–${w.end} h</option>`).join('')}</select></td><td><input aria-label="Exchange ${i+1} start hour" data-rxi="${i}" data-rxk="start" type="number" step="any" min="0" value="${r.start}"></td>
 <td><input aria-label="Exchange ${i+1} dwell hours" data-rxi="${i}" data-rxk="dwell" type="number" min="0.01" step="any" value="${r.dwell}"></td>
 <td><input aria-label="Exchange ${i+1} fill liters" data-rxi="${i}" data-rxk="fill" type="number" min="0.3" max="5" step="any" value="${r.fill}"></td>
 <td><input aria-label="Exchange ${i+1} dextrose percent" data-rxi="${i}" data-rxk="glucose" type="number" min="1.3" max="4.5" step="any" value="${r.glucose}"></td>
 <td><input aria-label="Exchange ${i+1} measured net ultrafiltration milliliters" data-rxi="${i}" data-rxk="uf" type="number" step="any" placeholder="Model" value="${r.uf??''}"></td>
 <td><button type="button" class="btn secondary small" data-rxdelete="${i}" aria-label="Delete exchange ${i+1}">×</button></td></tr>`).join('');
 $('pdRxEnable').checked=!!c.pdRxEnabled;
 $('pdRxMode').textContent=c.pdMethod==='cycler'?'Cycler exchanges (APD)':'Manual exchanges (CAPD)';
 $('pdRxErrors').textContent='';
}
$('pdRxRows').addEventListener('change',e=>{if(e.target.dataset.rxk==='sessionStart'){const row=rxDraft[Number(e.target.dataset.rxi)];if(row)row.sessionStart=e.target.value==='all'?null:Number(e.target.value);}});
$('pdRxRows').addEventListener('input',e=>{
 const i=Number(e.target.dataset.rxi),key=e.target.dataset.rxk;
 if(!key||!rxDraft[i])return;
 if(key==='sessionStart'){rxDraft[i].sessionStart=e.target.value==='all'?null:Number(e.target.value);return;}
 rxDraft[i][key]=(key==='uf'&&e.target.value.trim()==='')?null:
  (e.target.value.trim()===''?NaN:Number(e.target.value));
});
$('addPdRx').addEventListener('click',()=>{
 const last=rxDraft[rxDraft.length-1];let start=last?last.start+last.dwell:0;
 if(rxDraft.length>=48)return pdStatusText('Maximum 48 prescription exchanges.',true);
 let scope=last?.sessionStart??null;
 if(start>=24){const w=draft.find(x=>x.type==='PD');if(!w)return pdStatusText('Add a PD session to the dialysis timeline first.',true);scope=w.start;start=0;}
 rxDraft.push({sessionStart:scope,start:+start.toFixed(3),dwell:Math.max(.25,Math.min(24-start,c.capdDwell)),fill:c.pdVolume,glucose:c.pdGlucose,uf:null});renderPdRxRows();
});
$('pdRxRows').addEventListener('click',e=>{const b=e.target.closest('[data-rxdelete]');if(!b)return;rxDraft.splice(+b.dataset.rxdelete,1);renderPdRxRows();});
$('generatePdRx').addEventListener('click',()=>{rxDraft=nominalRx();renderPdRxRows();pdStatusText('Draft exchange table generated from current PD settings. Click Apply to use it.');});
$('pdRxEnable').addEventListener('change',e=>{pdStatusText(e.target.checked?'Individual exchange modeling will start after Apply.':'Uniform PD settings will resume after Apply.');});
$('applyPdRx').addEventListener('click',()=>{
 if(dirtyTimeline||dirtyDoses){$('applyFullTimeline').click();return;}
 const enabled=$('pdRxEnable').checked;
 const errs=E.validatePdRx({...c,schedule:draft,pdRxEnabled:enabled,pdRxRows:rxDraft});
 if(errs.length){$('pdRxErrors').textContent=errs.join('\n');$('pdRxErrors').classList.remove('hidden');pdStatusText('Correct the exchange table before applying.',true);return;}
 c.pdRxEnabled=enabled;c.pdRxRows=structuredClone(rxDraft);
 $('pdRxErrors').textContent='';$('pdRxErrors').classList.add('hidden');pdStatusText(enabled?`Applied ${rxDraft.length} exchange-specific PD prescriptions.`:'Using uniform PD prescription.');
 renderInputs();defer();
});
function benchmarkHtml(){
 const rows=E.benchmark(c);
 const fitActive=c.vcScale!==1||c.clearanceScale!==1;
 const sign=x=>`${x>=0?'+':''}${x.toFixed(1)}%`;
 $('benchmarkRows').innerHTML=rows.map(r=>`<tr><td>${r.mgkg} mg/kg IV q8h</td><td>${r.peak.toFixed(1)} / ${r.trough.toFixed(1)}</td><td>${r.modelPeak.toFixed(2)} / ${r.modelTrough.toFixed(2)}</td><td>${sign(r.errorPeakPct)} / ${sign(r.errorTroughPct)}</td><td>${r.n}</td></tr>`).join('');
 $('anuricRows').innerHTML=E.anuricBenchmark(c).map(r=>`<tr><td>${r.hour} h</td><td>${r.meanMg.toFixed(2)} ± ${r.sdMg.toFixed(2)}</td><td>${r.modelMg.toFixed(2)}</td><td>${(100*(r.modelMg/r.meanMg-1)).toFixed(1)}%</td></tr>`).join('');
 $('benchmarkParams').textContent=`Nominal 70 kg, CrCl 95 mL/min, 1-hour infusions, 10 doses. Central volume ×${c.vcScale.toFixed(3)}, renal/nonrenal clearance ×${c.clearanceScale.toFixed(3)}. ${fitActive?'Modified from default values.':'Default parameters.'}`;
}
$('fitPublished').addEventListener('click',()=>{
 researchStatus('Calculating aggregate-label parameter fit…');
 // Yield the main thread before synchronous, small-grid optimization.
 setTimeout(()=>{
  try{const fit=E.fitBenchmark(c);c.vcScale=+fit.vcScale.toFixed(4);c.clearanceScale=+fit.clearanceScale.toFixed(4);
   benchmarkHtml();renderInputs();defer();researchStatus(`Applied fit to four aggregate label values: volume ×${c.vcScale}, clearance ×${c.clearanceScale}. These values are not independently validated.`);
  }catch(e){researchStatus('Benchmark fitting failed: '+e.message,true);}
 },40);
});
$('resetPublished').addEventListener('click',()=>{c.vcScale=1;c.clearanceScale=1;benchmarkHtml();renderInputs();defer();researchStatus('Benchmark calibration multipliers reset to defaults.');});
function pctPair(p){if(!p)return '—';return `${p.down>=0?'+':''}${p.down.toFixed(1)}% / ${p.up>=0?'+':''}${p.up.toFixed(1)}%`;}
let sensitivityResult=null,tornadoRevision=0;
async function drawTornado(){
 const revision=++tornadoRevision,target=$('tornado'),status=$('tornadoStatus'),metric=$('tornadoMetric').value;
 const rows=(sensitivityResult?.outcomes||[]).filter(r=>r.effects?.[metric]).sort((a,b)=>{
  const magnitude=r=>Math.max(Math.abs(r.effects[metric].down),Math.abs(r.effects[metric].up));
  return magnitude(b)-magnitude(a);
 });
 target.hidden=!rows.length;
 if(!rows.length){
  window.AyFluxCharts.dispose(target);
  status.textContent=sensitivityResult?'Percentage change is undefined at a zero baseline outcome.':'';
  return;
 }
 target.style.height=(100+rows.length*40)+'px';
 status.textContent='Ranked by the larger absolute change in the selected outcome.';
 try{
  await window.AyFluxCharts.ensure();
  if(revision!==tornadoRevision)return;
  const series=[['down','−20% input','#2367a0'],['up','+20% input','#ba591d']].map(([key,name,color])=>({
   name,type:'bar',itemStyle:{color},barMaxWidth:10,data:rows.map(r=>r.effects[metric][key])
  }));
  const extent=Math.max(1,...series.flatMap(s=>s.data.map(Math.abs)))*1.05;
  const tornado=window.AyFluxCharts.draw(target,{animation:false,aria:{enabled:true},series,
   legend:{top:0},grid:{top:36,bottom:48,left:target.clientWidth<500?112:200,right:18},
   tooltip:{trigger:'axis',renderMode:'richText',confine:true,valueFormatter:v=>Number(v.toFixed(2))+'%'},
   xAxis:{type:'value',min:-extent,max:extent,name:'Change from baseline (%)',nameLocation:'middle',nameGap:28,axisLabel:{formatter:v=>Number(v.toPrecision(3))}},
   yAxis:{type:'category',inverse:true,data:rows.map(r=>r.label),axisLabel:{width:target.clientWidth<500?99:187,overflow:'break',fontSize:11}}});
  tornado.off('click');tornado.on('click',p=>window.AyFluxViews.selectFactor(p.name));
 }catch{status.textContent='Chart unavailable. Sensitivity estimates appear in the table.';}
}
$('tornadoMetric').addEventListener('change',drawTornado);
function renderSensitivity(){
 if(!dataIsCurrent){$('sensitivityRows').innerHTML='<tr><td colspan="5">Updating model…</td></tr>';return;}
 try{
  const s=E.sensitivity(c,primary);
  sensitivityResult=s;window.AyFluxViews.setFactors(s);drawTornado();
  $('sensitivityRows').innerHTML=s.outcomes.map(d=>`<tr><td>${d.label}</td>${d.na?'<td colspan="4">Not applicable at a zero baseline</td>':
   ['auc','csfPeak','mPeak','mass'].map(k=>`<td>${pctPair(d.effects[k])}</td>`).join('')}</tr>`).join('');
  $('sensitivityCaption').textContent=`Nominal one-at-a-time analysis: each parameter decreased by 20% / increased by 20%, relative to the current ${primary} setting. Drug exposure results are deterministic; correlations and uncertainty are not represented.`;
 }catch(error){sensitivityResult=null;drawTornado();$('sensitivityRows').innerHTML=`<tr><td colspan="5">Sensitivity unavailable: check current settings.</td></tr>`;}
}
let researchRenderedRevision=-1,researchRenderedPrimary='',sensitivityMode='';
function renderPdRxEditor(){
 if(!rxDraft.length&&c.pdRxRows.length)rxDraft=structuredClone(c.pdRxRows);
 if(!rxDraft.length)rxDraft=nominalRx();
 if(researchRenderedPrimary!==c.pdMethod){
  rxDraft=structuredClone(c.pdRxRows.length?c.pdRxRows:nominalRx());
  researchRenderedPrimary=c.pdMethod;renderPdRxRows();
 }else if(!$('pdRxRows').children.length)renderPdRxRows();
}
function renderResearch(){
 benchmarkHtml();
 if(resultsRevision!==researchRenderedRevision||primary!==sensitivityMode){renderSensitivity();researchRenderedRevision=resultsRevision;sensitivityMode=primary;}
}
function downloadJSON(obj,name){
 const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}));
 a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
// Session-only version history for imports. Nothing is written to storage or sent anywhere.
const importHistory=[],IMPORT_HISTORY_LIMIT=10;
function currentVersion(){return {config:structuredClone(c),primary,visible:[...visible],palette:paletteMode,unit:concUnit};}
function rememberVersion(label){
 importHistory.unshift({label:String(label).slice(0,120),savedAt:new Date(),state:currentVersion()});
 importHistory.length=Math.min(importHistory.length,IMPORT_HISTORY_LIMIT);
 renderImportHistory();
}
function applyVersion(state){
 Object.assign(c,structuredClone(state.config));setPalette(state.palette);setConcUnit(state.unit||concUnit);metricsSignature='';tableRevision=-1;primary=state.primary;
 visible=new Set(state.visible);
 draft=structuredClone(c.schedule);doseDraft=structuredClone(c.customDoses);
 renalDraft=structuredClone(c.renalProfile);renalDirty=false;renalProfileEdited=c.renalMode==='profile';
 measureDraft=structuredClone(c.observations);rxDraft=structuredClone(c.pdRxRows);
 $('primary').value=primary;researchRenderedPrimary='';renderInputs();renderSchedule();renderDoseRows();renderMeasureRows();renderPdRxRows();
}
function restoreVersion(index){
 const entry=importHistory[index];if(!entry)return;
 showScenarioNote('','');
 const restored=entry.state,label=entry.label,time=entry.savedAt.toLocaleTimeString();
 importHistory.splice(index,1);
 rememberVersion('Before restoring the '+time+' version');
 studyOverlay=null;
 applyVersion(restored);
 migratedPayload=null;$('downloadMigrated').classList.add('hidden');
 researchStatus('Restored the settings saved at '+time+' ('+label+'). Recalculating…');alertMessage('');defer();
}
function renderImportHistory(){
 const list=$('importHistoryList');list.replaceChildren();
 importHistory.forEach((entry,index)=>{
  const item=document.createElement('li'),button=document.createElement('button');
  item.textContent=entry.savedAt.toLocaleTimeString()+' — '+entry.label+' ('+entry.state.primary+')';
  button.type='button';button.className='btn secondary';button.textContent='Restore';button.dataset.restore=String(index);
  button.setAttribute('aria-label','Restore settings: '+entry.label);
  item.append(button);list.append(item);
 });
 $('undoImport').disabled=!importHistory.length;
 $('importHistoryCount').textContent=importHistory.length?'('+importHistory.length+' saved)':'(empty)';
}
// Validates a configuration object completely before anything is applied. Used by file imports and shared links.
function parseConfiguration(input){
  if(!input||typeof input!=='object'||Array.isArray(input)||input.format!=='acyclovir-pk-simulator')
    throw Error('This file is not an AyFlux simulation configuration. No settings were changed.');
  if(input.schemaVersion!==1&&input.schemaVersion!==2)
    throw Error(`Unsupported configuration schema (${String(input.schemaVersion??'missing')}). AyFlux supports schema 1 (v13–17) and schema 2 (v18 onward). No settings were changed.`);
  const migrating=input.schemaVersion===1;
  const src=input.config;
  if(!src||typeof src!=='object'||Array.isArray(src))throw Error('Configuration data is missing. No settings were changed.');
  const next=structuredClone(E.DEFAULTS);
  const required=Object.keys(next),number=x=>typeof x==='number'&&Number.isFinite(x);
  const missing=required.filter(key=>!['renalMode','renalProfile','probenecid','labelBsa'].includes(key)&&!Object.prototype.hasOwnProperty.call(src,key));
  if(missing.length)throw Error('Configuration is incomplete (missing '+missing.slice(0,4).join(', ')+'). No settings were changed.');
  for(const key of required){
   if(!Object.prototype.hasOwnProperty.call(src,key)&&['renalMode','renalProfile','probenecid','labelBsa'].includes(key))continue;
   const v=src[key];
   if(['schedule','customDoses','observations','pdRxRows','renalProfile'].includes(key)){
    if(!Array.isArray(v)||v.length>(key==='renalProfile'?24:key==='observations'?200:300))throw Error('Invalid or oversized '+key+' array');
    if(key==='renalProfile'&&!v.every(x=>x&&number(x.time)&&number(x.crcl)))throw Error('Invalid kidney function profile');
    if(key==='schedule'&&!v.every(x=>x&&E.TYPES.includes(x.type)&&number(x.start)&&number(x.end)))throw Error('Invalid dialysis session data');
    if(key==='customDoses'&&!v.every(x=>x&&E.ROUTES.includes(x.route)&&number(x.time)&&number(x.amount)&&
       (x.route!=='Acyclovir IV'||number(x.infusion))))throw Error('Invalid medication schedule data');
    if(key==='observations'&&!v.every(x=>x&&['plasma','csf','cmmg','csfCmmg'].includes(x.analyte)&&
       ['fit','holdout'].includes(x.role)&&number(x.time)&&x.time>=0&&x.time<=src.horizon&&number(x.value)&&x.value>=0))throw Error('Invalid measurement data');
    if(key==='pdRxRows'&&!v.every(x=>x&&number(x.start)&&number(x.dwell)&&number(x.fill)&&number(x.glucose)&&
       (x.uf===null||x.uf===undefined||number(x.uf))&&
       (x.sessionStart===null||x.sessionStart===undefined||number(x.sessionStart))))throw Error('Invalid PD exchange data');
    next[key]=structuredClone(v);
   }else{
    if(typeof v!==typeof next[key]||!['number','string','boolean'].includes(typeof v))throw Error('Invalid parameter type: '+key);
    if(typeof v==='number'&&!Number.isFinite(v))throw Error('Non-finite parameter: '+key);
    if(typeof v==='number'&&DEFS[key]){
      const [, , min,max]=fieldDef(key);
      if(v<min||v>max)throw Error(`${key} is outside the supported range (${min}–${max}).`);
    }
    next[key]=v;
   }
  }
  if(![30,60,120,200].includes(next.draws))throw Error('Monte Carlo samples must be 30, 60, 120, or 200.');
  if(![.5,.8,.9,.95].includes(next.coverage))throw Error('Unsupported model interval.');
  if(!['manual','estimated'].includes(next.crclSource)||!['manual','cycler'].includes(next.pdMethod)||
     !['repeat','custom'].includes(next.dosingMode)||!E.ROUTES.includes(next.route)||
     !['HSV-1','HSV-2','VZV'].includes(next.virus)||!['male','female'].includes(next.sex))throw Error('Unrecognized configuration option.');
  if(!number(next.age)||next.age<18||next.age>120||!number(next.scr)||next.scr<0.1||next.scr>25)throw Error('Age or serum creatinine is outside the supported range.');
  if(!E.MODES.includes(input.primary))throw Error('The selected dialysis scenario is not supported.');
  if(!Array.isArray(input.visibleScenarios)||!input.visibleScenarios.every(m=>E.MODES.includes(m)))throw Error('Invalid scenario visibility settings.');
  const extras=Object.keys(src).filter(key=>!required.includes(key));
  if(extras.length)throw Error('Configuration has unrecognized parameters ('+extras.slice(0,4).join(', ')+'). Import stopped to avoid discarding data. No settings were changed.');
  // Schema 1 (v13) did not store a palette; use the documented standard palette.
  const importedPalette=migrating&&!input.appearance?'standard':input.appearance?.palette;
  if(!['standard','accessible'].includes(importedPalette))throw Error('Invalid graph accessibility setting.');
  // Validate all scenarios before committing the import; comparison calculations remain on demand.
  const errors=[...new Set(E.MODES.flatMap(mode=>E.validate(next,mode)))];
  if(errors.length)throw Error('Configuration fails model validation: '+errors.slice(0,3).join('; '));
  // Only now, after all shape and numerical checks, apply the loaded configuration.
  const converted={format:'acyclovir-pk-simulator',schemaVersion:2,appVersion:'0.25.0',savedAt:new Date().toISOString(),
    config:structuredClone(next),primary:input.primary,visibleScenarios:[...input.visibleScenarios],appearance:{palette:importedPalette}};
  if(migrating)converted.migratedFrom={schemaVersion:1,appVersion:String(input.appVersion??'unknown'),savedAt:input.savedAt??null};
  return {next,primary:input.primary,visible:[...input.visibleScenarios],palette:importedPalette,migrating,converted};
}
// ---------- Shareable links ----------
// The whole scenario travels in the URL fragment (#s=…), which browsers never send to a server.
// Only settings that differ from the defaults are included; measured concentrations are never included.
const SHARE_PREFIX='#s=',SHARE_LIMIT=6000;
function encodeShare(text){
 const bytes=new TextEncoder().encode(text);let binary='';for(const b of bytes)binary+=String.fromCharCode(b);
 return btoa(binary).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
}
function decodeShare(code){
 if(!/^[A-Za-z0-9_-]+$/.test(code))throw Error('The link is damaged or incomplete.');
 const binary=atob(code.replaceAll('-','+').replaceAll('_','/'));
 return new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(binary,ch=>ch.charCodeAt(0)));
}
function shareLink(){
 const changed={};
 for(const key of Object.keys(E.DEFAULTS)){
  if(key==='observations')continue;
  if(JSON.stringify(c[key])!==JSON.stringify(E.DEFAULTS[key]))changed[key]=c[key];
 }
 const code=encodeShare(JSON.stringify({v:1,c:changed,p:primary,s:[...visible],a:paletteMode,u:concUnit}));
 if(code.length>SHARE_LIMIT)throw Error('This scenario is too large for a link. Use Save configuration (JSON) instead.');
 return location.origin+location.pathname+SHARE_PREFIX+code;
}
function readShare(hash){
 let data;
 try{data=JSON.parse(decodeShare(hash.slice(SHARE_PREFIX.length)));}catch(_){throw Error('The link is damaged or incomplete.');}
 if(!data||typeof data!=='object'||Array.isArray(data)||data.v!==1||!data.c||typeof data.c!=='object'||Array.isArray(data.c))throw Error('The link is not an AyFlux scenario link.');
 if(Object.prototype.hasOwnProperty.call(data.c,'observations'))throw Error('Links cannot carry measurements.');
 const parsed=parseConfiguration({format:'acyclovir-pk-simulator',schemaVersion:2,config:{...structuredClone(E.DEFAULTS),...data.c},primary:data.p,visibleScenarios:data.s,appearance:{palette:data.a}});
 if(data.u!==undefined&&data.u!=='mg'&&data.u!=='umol')throw Error('Unrecognized concentration unit.');
 return {config:parsed.next,primary:parsed.primary,visible:parsed.visible,palette:parsed.palette,unit:data.u||'mg'};
}
function openSharedLink(initial){
 if(!location.hash.startsWith(SHARE_PREFIX))return false;
 const hash=location.hash;
 // Remove the scenario from the address bar straight away so it is not bookmarked, re-applied, or read by later scripts.
 try{history.replaceState(null,'',location.pathname+location.search);}catch(_){}
 try{
  const state=readShare(hash);
  if(!initial)rememberVersion('Before opening a shared link');
  applyVersion(state);
  migratedPayload=null;$('downloadMigrated').classList.add('hidden');
  sharedNotice='Scenario loaded from a shared link. All settings were validated; measurements are never included in links.';
  researchStatus(sharedNotice);
  if(!initial){alertMessage('');defer();}
  return true;
 }catch(error){
  sharedNotice='';
  const message='Shared link not loaded: '+error.message+' Default settings are shown.';
  researchStatus(message,true);alertMessage(message);if(initial)pendingNotice=message;
  return false;
 }
}
let sharedNotice='';
window.addEventListener('hashchange',()=>openSharedLink(false));
$('copyShareLink').addEventListener('click',async()=>{
 const field=$('shareLinkField');
 try{
  const link=shareLink();
  field.value=link;field.classList.remove('hidden');
  let copied=false;
  try{await navigator.clipboard.writeText(link);copied=true;}catch(_){field.focus();field.select();}
  researchStatus((copied?'Link copied. ':'Select and copy the link below. ')+'It contains this scenario’s settings (not measurements) inside the link itself; nothing is uploaded. Anyone with the link can open the same scenario.');
 }catch(error){field.classList.add('hidden');researchStatus(error.message,true);}
});
// ---------- Guided scenarios ----------
// Teaching presets built on the defaults. Each is validated by the engine before it is applied.
function guidedScenarios(){
 const base=()=>({...structuredClone(E.DEFAULTS),observations:[]});
 return [
  {id:'noKidney',label:'Unadjusted IV dosing with no kidney function',primary:'No dialysis',visible:['No dialysis','Intermittent HD'],
   config:{...base(),crcl:0,renalMode:'constant',crclSource:'manual'},
   note:'The default 700 mg IV every 8 hours, but with creatinine clearance set to 0 and no dose change. Plasma acyclovir no longer returns to baseline between doses, and CMMG climbs past the dotted reference line. The Intermittent HD curve shows what a 4-hour session every 48 hours takes back out. Freeze a baseline, then lower the dose or lengthen the interval to see the effect.'},
  {id:'kidneyInjury',label:'Oral valacyclovir with kidney injury mid-course',primary:'No dialysis',visible:['No dialysis'],
   config:(()=>{const config={...base(),route:'Valacyclovir oral',dosingMode:'repeat',dose:1000,every:8,doseCount:21,horizon:168,crcl:95,renalMode:'profile',crclSource:'manual'};config.renalProfile=kidneyInjuryExample(95,168);return config;})(),
   note:'Valacyclovir 1,000 mg every 8 hours for 7 days. Kidney function is normal until day 3.5, then falls to one fifth by day 5.25 and stays there, the general pattern described in published neurotoxicity case reports [22][23]. It is not a reconstruction of any patient. Watch the troughs rise after the fall begins while the dose stays the same, and CMMG rise proportionally more than acyclovir. The Clearance & sessions tab shows the kidney function curve.'},
  {id:'modalities',label:'Same dose, three dialysis modalities',primary:'Intermittent HD',visible:['No dialysis','Intermittent HD','Peritoneal dialysis','CRRT'],
   config:{...base(),crcl:0,renalMode:'constant',crclSource:'manual',dose:350,every:24,doseCount:4},
   note:'350 mg IV once daily with no kidney function, shown with no dialysis, intermittent HD, peritoneal dialysis and CRRT as separate what-if curves. Open the Dialysis comparison table at the bottom of this tab and compare “Acyclovir removed by dialysis”: one HD session removes drug quickly but briefly, CRRT removes it continuously, and PD removes little.'}
 ];
}
function showScenarioNote(title,text){
 $('scenarioNoteTitle').textContent=title;$('scenarioNoteText').textContent=text;
 $('scenarioNote').classList.toggle('hidden',!title);
}
function loadGuidedScenario(id){
 const scenario=guidedScenarios().find(item=>item.id===id);if(!scenario)return;
 const errors=[...new Set(scenario.visible.concat(scenario.primary).flatMap(mode=>E.validate(scenario.config,mode)))];
 if(errors.length){researchStatus('Guided scenario could not be loaded: '+errors.slice(0,2).join('; '),true);return;}
 rememberVersion('Before guided scenario: '+scenario.label);
 studyOverlay=null;
 applyVersion({config:scenario.config,primary:scenario.primary,visible:scenario.visible,palette:paletteMode,unit:concUnit});
 migratedPayload=null;$('downloadMigrated').classList.add('hidden');
 researchStatus('Loaded guided scenario: '+scenario.label+'.');alertMessage('');
 showScenarioNote('Guided scenario: '+scenario.label,scenario.note);
 switchTab('concentration');defer();
}
for(const scenario of guidedScenarios()){
 const button=document.createElement('button');
 button.type='button';button.className='btn secondary';button.dataset.guided=scenario.id;button.textContent=scenario.label;
 $('guidedButtons').append(button);
}
$('guidedButtons').addEventListener('click',e=>{const button=e.target.closest('[data-guided]');if(button)loadGuidedScenario(button.dataset.guided);});
$('resetDefaults').addEventListener('click',()=>{
 rememberVersion('Before reset to defaults');
 studyOverlay=null;
 applyVersion({config:{...structuredClone(E.DEFAULTS),observations:[]},primary:'No dialysis',visible:['No dialysis','Intermittent HD','Custom sequence'],palette:paletteMode,unit:concUnit});
 migratedPayload=null;$('downloadMigrated').classList.add('hidden');showScenarioNote('','');
 researchStatus('All settings reset to defaults. Use Undo last import to go back.');alertMessage('');defer();
});
$('scenarioNoteClose').addEventListener('click',()=>showScenarioNote('',''));
$('undoImport').addEventListener('click',()=>restoreVersion(0));
$('importHistoryList').addEventListener('click',e=>{const button=e.target.closest('[data-restore]');if(button)restoreVersion(Number(button.dataset.restore));});
$('downloadMigrated').addEventListener('click',()=>{if(migratedPayload)downloadJSON(migratedPayload,'ayflux_migrated_schema2.json');});
// ---------- Published-study overlay ----------
function loadStudy(id){
 const study=STUDIES?.find(id);
 if(!study){studyOverlay=null;renderStudyStatus();if(results)render();return;}
 const config=STUDIES.configFor(study,E,{vcScale:c.vcScale,clearanceScale:c.clearanceScale}),errors=E.validate(config,study.mode);
 if(errors.length){researchStatus('Study regimen could not be loaded: '+errors.slice(0,2).join('; '),true);studyOverlay=null;renderStudyStatus();return;}
 rememberVersion('Before study comparison: '+study.short);
 applyVersion({config,primary:study.mode,visible:[study.mode],palette:paletteMode,unit:concUnit});
 studyOverlay=study.id;migratedPayload=null;$('downloadMigrated').classList.add('hidden');alertMessage('');
 researchStatus('Loaded the '+study.short+' regimen for comparison.');
 showScenarioNote('Published study: '+study.label,study.note+' Use Undo last import in Research tools to return to your previous settings.');
 renderStudyStatus();switchTab('concentration');defer();
}
if(STUDIES)for(const study of STUDIES.STUDIES){const option=document.createElement('option');option.value=study.id;option.textContent=study.label;$('studySelect').append(option);}
$('studySelect').addEventListener('change',e=>loadStudy(e.target.value));
// Vary one reconstruction assumption (from #68). The published values are unchanged; the measured
// points hide because the settings no longer match the reconstruction.
$('studyExploreRun').addEventListener('click',()=>{
 const study=studyOverlay&&STUDIES?STUDIES.find(studyOverlay):null;if(!study?.explore)return;
 try{
  const raw=$('studyExploreValue').value;if(!raw.trim())throw new Error('Enter a value for the assumption.');
  const value=Number(raw),calibration={vcScale:c.vcScale,clearanceScale:c.clearanceScale};
  const original=STUDIES.configFor(study,E,calibration),config=STUDIES.exploreConfig(study,E,value,calibration);
  const errors=E.validate(config,study.mode);if(errors.length)throw new Error(errors[0]);
  let kept=false;
  if(savedRegimens.length<REG.MAX_SAVED&&!savedRegimens.some(r=>r.name===('Original: '+study.short).slice(0,40))){
   const d=E.simulateMany({...original,variability:0,draws:1,requestedModes:[study.mode]})[study.mode];
   savedRegimens.push({name:('Original: '+study.short).slice(0,40),primary:study.mode,config:structuredClone(original),data:{time:d.time.slice(),plasma:{median:d.plasma.median.slice()},cmmg:{median:d.cmmg.median.slice()}}});
   savedRevision++;kept=true;
  }
  rememberVersion('Before exploring an assumption: '+study.short);
  applyVersion({config,primary:study.mode,visible:[study.mode],palette:paletteMode,unit:concUnit});
  studyOverlay=study.id;
  const spec=study.explore;
  showScenarioNote('Hypothetical assumption: '+study.short,spec.label+' set to '+value+' '+spec.unit+' (the reconstruction uses '+spec.value+' '+spec.unit+'). '+(kept?'The original reconstruction is saved as a regimen for comparison. ':'')+'The published measurements are unchanged but hidden, because the settings no longer match the reconstruction. Use Undo last import in Research tools to return to your previous settings.');
  $('studyExploreStatus').textContent='Exploring '+value+' '+spec.unit+'.';
  renderRegimens();renderStudyStatus();switchTab('concentration');defer();
 }catch(error){$('studyExploreStatus').textContent=error.message;}
});
// Evidence scorecard on the Methods tab. Recomputed only when calibration multipliers change.
let scorecardKey='',scorecardRun=0,scorecardScores=[],scorecardCalibration=null;
function renderScorecard(){
 const body=$('scorecardRows');if(!body||!STUDIES)return;
 const calibration={vcScale:c.vcScale,clearanceScale:c.clearanceScale},key=JSON.stringify(calibration);
 if(key===scorecardKey)return;
 scorecardKey=key;const run=++scorecardRun,rows=[],scores=[];
 scorecardScores=[];$('scorecardCsv').disabled=true;
 body.innerHTML='<tr><td colspan="7">Calculating…</td></tr>';
 const next=index=>setTimeout(()=>{
  if(run!==scorecardRun)return;
  const study=STUDIES.STUDIES[index];
  try{const r=STUDIES.score(study,E,{calibration,draws:400});scores.push(r);
   rows.push(`<tr><td>${study.short} <a class="source-id" href="#${study.ref}">${study.cite}</a></td><td>${study.regimen}<details class="study-assumptions"><summary>Study assumptions and source data</summary><p>${study.note}</p></details></td><td>${r.total} ${study.pointsLabel} (${study.n>1?'n='+study.n:'one patient'})</td><td>${r.gmr.toFixed(2)}</td><td>${r.inside} of ${r.total}</td><td>${provenanceSummary(study)}</td><td><button type="button" class="btn secondary" data-study="${study.id}">Show on chart</button></td></tr>`);
  }catch(error){rows.push(`<tr><td>${study.short}</td><td colspan="6">Could not be calculated: ${error.message.replace(/[<>&]/g,'')}</td></tr>`);}
  if(index+1<STUDIES.STUDIES.length){body.innerHTML=rows.join('')+'<tr><td colspan="7">Calculating…</td></tr>';next(index+1);return;}
  body.innerHTML=rows.join('');scorecardScores=scores;scorecardCalibration=calibration;$('scorecardCsv').disabled=!scores.length;
  const summary=STUDIES.summarize(scores),overall=summary.overall;
  const description=r=>r.total+' points; bias ratio '+r.gmr.toFixed(2)+'; geometric mean absolute fold error '+r.absoluteFoldError.toFixed(2)+'; '+r.withinTwo+'/'+r.total+' within twofold; '+r.inside+'/'+r.total+' inside assumed model bands.';
  $('scorecardCaption').textContent=(calibration.vcScale===1&&calibration.clearanceScale===1?'Default parameters. ':'Calibration multipliers active: central volume ×'+calibration.vcScale+', clearance ×'+calibration.clearanceScale+'. ')+
   summary.scenarios+' comparison scenarios from '+summary.sources+' reference sources. '+(overall?description(overall):'No results.')+
   ' The pooled ratio measures bias, not accuracy; opposite errors cancel. Repeated samples, group means and author-fitted values have equal point weight, not independent patient weight. Band inclusion is descriptive, not validated predictive coverage. Label values are not independent after label-based calibration.';
  $('scorecardGroups').textContent=summary.groups.filter(r=>r.total).map(r=>r.name+': '+description(r)).join('\n');
  drawScorecardFigure();drawResidualFigure();
 },30);
 next(0);
}
async function drawScorecardFigure(){
 const target=$('scorecardFigure'),status=$('scorecardFigureStatus');if(!target||!scorecardScores.length)return;
 const groups=[['Plasma acyclovir, no dialysis','#2367a0','circle',s=>s.mode==='No dialysis'],['Plasma acyclovir, dialysis','#ba591d','diamond',s=>s.mode!=='No dialysis']];
 const point=(study,r)=>[r.observed,r.predicted,study.short+' '+study.cite+', '+(r.analyte==='cmmg'?'CMMG':'acyclovir')+' at '+Number(r.time.toFixed(2))+' h'];
 const series=groups.map(([name,color,symbol,test])=>({name,type:'scatter',symbol,symbolSize:10,itemStyle:{color,borderColor:'#fff',borderWidth:1},
  data:scorecardScores.flatMap(score=>{const study=STUDIES.find(score.id);return test(study)?score.rows.filter(r=>r.analyte==='plasma').map(r=>point(study,r)):[];})}));
 series.push({name:'Plasma CMMG',type:'scatter',symbol:'triangle',symbolSize:11,itemStyle:{color:'#6b3fa0',borderColor:'#fff',borderWidth:1},
  data:scorecardScores.flatMap(score=>{const study=STUDIES.find(score.id);return score.rows.filter(r=>r.analyte==='cmmg').map(r=>point(study,r));})});
 const values=scorecardScores.flatMap(s=>s.rows.flatMap(r=>[r.observed,r.predicted]));
 const lo=10**Math.floor(Math.log10(Math.min(...values)/2)),hi=10**Math.ceil(Math.log10(Math.max(...values)*2));
 const guide=(name,k,type)=>({name,type:'line',silent:true,showSymbol:false,tooltip:{show:false},itemStyle:{color:'#5b6670'},lineStyle:{color:'#5b6670',width:k===1?1.6:1,type},data:[[lo,lo*k],[hi,hi*k]]});
 series.push(guide('Perfect agreement',1,'solid'),guide('Twofold',2,'dashed'),{...guide('Twofold',.5,'dashed'),name:'Twofold '});
 try{
  await window.AyFluxCharts.ensure();
  window.AyFluxCharts.draw(target,{animation:false,aria:{enabled:true,label:{description:'Predicted versus observed concentration for each published point, log scales, with lines for perfect agreement and twofold error.'}},series,
   legend:{bottom:0,data:groups.map(g=>g[0]).concat('Plasma CMMG','Perfect agreement','Twofold')},grid:{top:16,left:70,right:20,bottom:84},
   tooltip:{trigger:'item',confine:true,formatter:p=>p.data?.[2]?p.data[2]+'\nObserved '+Number(p.data[0].toPrecision(3))+' mg/L, predicted '+Number(p.data[1].toPrecision(3))+' mg/L':''},
   xAxis:{type:'log',min:lo,max:hi,name:'Published (mg/L)',nameLocation:'middle',nameGap:30},
   yAxis:{type:'log',min:lo,max:hi,name:'AyFlux nominal prediction (mg/L)',nameLocation:'middle',nameGap:46}});
  status.textContent='Points above the solid line are overpredicted, points below underpredicted. Dashed lines mark twofold error.';
 }catch{status.textContent='Figure unavailable. The table and CSV contain the same values.';}
}
// Residuals: predicted/observed for each published value against hours since the most recent dose,
// marked by the sample type each source reports.
function renderResidualTable(){
 const body=$('residualRows');if(!body||!scorecardScores.length)return;
 const two=v=>v.toFixed(2),h=v=>String(Number(v.toFixed(2)));
 const listed=(list,fitted)=>list.length?list.map(r=>two(r.ratio)+' at '+h(r.time)+' h'+(r.analyte==='cmmg'?' (CMMG)':'')).join('; ')+(fitted?' (author-fitted)':''):'—';
 const direction={below:'All below 1 (underpredicted)',above:'All above 1 (overpredicted)',mixed:'Mixed'};
 body.replaceChildren(...STUDIES.residualsByStudy(scorecardScores).map(s=>{
  const tr=document.createElement('tr'),cell=text=>{const td=document.createElement('td');td.textContent=text;tr.append(td);};
  cell(s.short+' '+s.cite);cell(String(s.total));cell(two(s.median));cell(two(s.min)+'–'+two(s.max));cell(direction[s.direction]);
  cell(listed(s.peaks,s.fitted));cell(listed(s.troughs,s.fitted));return tr;
 }));
}
async function drawResidualFigure(){
 renderResidualTable();
 const target=$('residualFigure');if(!target||!scorecardScores.length)return;
 const KIND={peak:['Peak','triangle'],trough:['Trough','path://M0,0L10,0L5,10Z'],'post-infusion':['Post-infusion','rect'],'hd-start':['HD inlet','diamond'],'hd-end':['HD inlet','diamond'],serial:['Serial (no peak/trough label)','circle']};
 const SETTING=[['No dialysis','#2367a0',(s,r)=>r.analyte==='plasma'&&s.mode==='No dialysis'],['Dialysis','#ba591d',(s,r)=>r.analyte==='plasma'&&s.mode!=='No dialysis'],['CMMG','#6b3fa0',(s,r)=>r.analyte==='cmmg']];
 const series=[],ratios=[];
 for(const [setting,color,test] of SETTING)for(const kind of ['peak','trough','post-infusion','hd','serial']){
  const data=[];
  for(const score of scorecardScores){const study=STUDIES.find(score.id);for(const r of score.rows){
   const k=r.kind.startsWith('hd-')?'hd':r.kind;
   if(k!==kind||!test(study,r)||r.sinceDose===null)continue;
   const ratio=r.predicted/r.observed;ratios.push(ratio);
   data.push([r.sinceDose,ratio,study.short+' '+study.cite+' · '+KIND[r.kind][0].toLowerCase()+' '+(r.analyte==='cmmg'?'CMMG':'acyclovir')+' at hour '+Number(r.time.toFixed(2))]);
  }}
  if(data.length)series.push({name:setting+' · '+KIND[kind==='hd'?'hd-start':kind][0],type:'scatter',symbol:KIND[kind==='hd'?'hd-start':kind][1],symbolSize:kind==='serial'?8:12,itemStyle:{color,borderColor:'#fff',borderWidth:1},data});
 }
 const lo=Math.min(.25,...ratios)/1.15,hi=Math.max(4,...ratios)*1.15,xmax=Math.ceil(Math.max(...scorecardScores.flatMap(s=>s.rows.map(r=>r.sinceDose??0)))+1);
 const guide=(name,y,width,type)=>({name,type:'line',silent:true,showSymbol:false,tooltip:{show:false},itemStyle:{color:'#5b6670'},lineStyle:{color:'#5b6670',width,type},data:[[0,y],[xmax,y]]});
 series.push(guide('Predicted = observed',1,1.8,'solid'),guide('Twofold',2,1,'dashed'),{...guide('Twofold',.5,1,'dashed'),name:'Twofold '});
 try{
  await window.AyFluxCharts.ensure();
  window.AyFluxCharts.draw(target,{animation:false,aria:{enabled:true,label:{description:'Predicted over observed ratio for each published value against hours since the most recent dose, by sample type.'}},series,
   legend:{bottom:0,itemGap:12},grid:{top:16,left:70,right:20,bottom:110},
   tooltip:{trigger:'item',confine:true,formatter:p=>p.data?.[2]?p.data[2]+'\nPredicted/observed '+p.data[1].toFixed(2)+', '+Number(p.data[0].toFixed(2))+' h after dose start':''},
   xAxis:{type:'value',min:0,max:xmax,name:'Hours since the start of the most recent dose',nameLocation:'middle',nameGap:30},
   yAxis:{type:'log',min:lo,max:hi,name:'Predicted / observed',nameLocation:'middle',nameGap:46,axisLabel:{formatter:v=>Number(v.toPrecision(2))}}});
  $('residualFigureStatus').textContent='Points above 1 are overpredicted, below 1 underpredicted; dashed lines mark twofold. Shape gives the sample type as each source reports it; serial time courses have no peak or trough label.';
 }catch{$('residualFigureStatus').textContent='Figure unavailable. The CSV contains the same values.';}
}
$('scorecardCsv').addEventListener('click',()=>{
 if(!scorecardScores.length)return;
 const a=document.createElement('a'),url=URL.createObjectURL(new Blob([STUDIES.csv(scorecardScores,scorecardCalibration)],{type:'text/csv;charset=utf-8'}));
 a.href=url;a.download='ayflux_evidence_scorecard.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
});
$('scorecardRows').addEventListener('click',e=>{const button=e.target.closest('[data-study]');if(button)loadStudy(button.dataset.study);});
$('saveConfig').addEventListener('click',()=>{
 const data={format:'acyclovir-pk-simulator',schemaVersion:2,appVersion:'0.25.0',savedAt:new Date().toISOString(),config:structuredClone(c),primary,visibleScenarios:[...visible],appearance:{palette:paletteMode}};
 downloadJSON(data,'ayflux_simulation_v0.25.0.json');researchStatus('Configuration exported as JSON; stored locally in your download folder.');
});
$('loadConfig').addEventListener('change',async e=>{
 const file=e.target.files?.[0];if(!file)return;
 migratedPayload=null;$('downloadMigrated').classList.add('hidden');
 try{
  if(file.size>1000000)throw Error('File is too large (maximum 1 MB). No settings were changed.');
  let input;
  try{input=JSON.parse(await file.text());}
  catch(_){throw Error('This is not valid JSON. Export a configuration using Save configuration (JSON).');}
  const {next,palette:importedPalette,migrating,converted}=parseConfiguration(input);
  rememberVersion('Before importing '+file.name);
  applyVersion({config:next,primary:input.primary,visible:input.visibleScenarios,palette:importedPalette,unit:concUnit});
  migratedPayload=migrating?converted:null;
  $('downloadMigrated').classList.toggle('hidden',!migratedPayload);
  const note=migrating?`Migrated schema 1 (Version ${String(input.appVersion??'unknown')}) to schema 2. ${input.appearance?'PK settings preserved.':'PK settings preserved; standard graph palette applied (not saved in this old file).'} Download the converted JSON to keep a reusable copy.`:'AyFlux configuration loaded. All parameters validated.';
  researchStatus(note+' Recalculating…');alertMessage('');defer();
 }catch(error){
  const message='Configuration not loaded: '+error.message;
  researchStatus(message,true);alertMessage(message);
  $('status').textContent=message;
 }
 finally{e.target.value='';}
});

openSharedLink(true);
$('primary').value=primary;renderInputs();renderSchedule();renderDoseRows();renderMeasureRows();renderPdRxEditor();calculate();
})();




