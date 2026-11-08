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
const E=window.RenalPKV7,$=id=>document.getElementById(id),modes=E.MODES;
// Dedicated visualization palettes; chart calculations are independent of these colors.
const PALETTES={
 standard:{'No dialysis':'#88949F','Intermittent HD':'#E23D25','Peritoneal dialysis':'#009A69','CRRT':'#9B5E00','Custom sequence':'#0054E9'},
 accessible:{'No dialysis':'#8A8A8A','Intermittent HD':'#E69F00','Peritoneal dialysis':'#009E73','CRRT':'#CC79A7','Custom sequence':'#0072B2'}
};
const LINE_DASH={'No dialysis':'solid','Intermittent HD':'dash','Peritoneal dialysis':'dot','CRRT':'dashdot','Custom sequence':'longdash'};
const LEGEND_DASH={'No dialysis':'solid','Intermittent HD':'dashed','Peritoneal dialysis':'dotted','CRRT':'dashed','Custom sequence':'solid'};
let paletteMode='standard',COLORS=PALETTES.standard;
function setPalette(value){paletteMode=Object.prototype.hasOwnProperty.call(PALETTES,value)?value:'standard';COLORS=PALETTES[paletteMode];}

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
let renalDraft=structuredClone(c.renalProfile),renalDirty=false,renalProfileEdited=false;
// Narrow read-only integration point for optional research workspace.
window.AyFluxResearchBridge=Object.freeze({snapshot:()=>({results,config:structuredClone(c),primary,updated:dataIsCurrent,revision:resultsRevision})});
function requestedModes(all=false){return all||tab==='table'?[...modes]:modes.filter(m=>m===primary||visible.has(m));}
function setBusy(busy){
 $('calculationState').classList.toggle('hidden',!busy);
 document.querySelector('main').setAttribute('aria-busy',String(busy));
 $('csv').disabled=busy||!dataIsCurrent;
 if(busy)$('status').textContent='Updating simulation';
}
function calculationError(error){
 dataIsCurrent=false;setBusy(false);
 alertMessage('Please correct input(s):\n'+error.message);
 $('status').textContent='Simulation not updated: invalid settings';
}
function finishJob(data,error){
 const job=activeJob;activeJob=null;
 if(job.id===calculationVersion){
  if(error){pendingCsvExport=false;calculationError(error);}
  else{results=data;resultsRevision++;dataIsCurrent=true;alertMessage('');setBusy(false);render();window.dispatchEvent(new Event('ayflux:results-updated'));if(tab==='research')renderResearch();if(pendingCsvExport){const format=pendingCsvExport;pendingCsvExport=false;if(format==='tidy')downloadTidyCSV();else download();}}
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
 const signature=chartSignature('kidneyClear')+':dynamic';
 if(pendingPlots.get('kidneyClearChart')?.signature===signature||chartStates.get('kidneyClearChart')?.signature===signature)return;
 const d=results[primary],ll=layout('Acyclovir renal clearance (mL/min)');
 ll.yaxis2={title:{text:'Entered CrCl (mL/min)'},overlaying:'y',side:'right',showgrid:false,color:'#237d8c'};
 ll.margin={...ll.margin,r:68};
 const traces=[
 {x:d.time,y:d.kidneyClear.median,mode:'lines',type:'scatter',name:'Modeled renal acyclovir clearance',line:{color:'#0054e9',width:3},hovertemplate:'Time %{x:.2f} h<br>Renal acyclovir clearance %{y:.2f} mL/min<extra></extra>'},
 {x:d.time,y:d.time.map(t=>E.renalCrClAt(c,t)),yaxis:'y2',mode:'lines',type:'scatter',name:'User-entered CrCl',line:{color:'#237d8c',width:3,dash:'dash'},hovertemplate:'Time %{x:.2f} h<br>CrCl %{y:.2f} mL/min<extra></extra>'}
 ];
 pendingPlots.set('kidneyClearChart',{key:'kidneyClear',traces,layout:ll,signature});requestPlotFrame();
}
function renderInputs(){let keepAdvanced=$('advanced').open;
 $('patientControls').innerHTML=numericField('weight')+renalProfileControls()+renalInputs()+
 `<h2>Medication</h2><div class="inputrow"><label for="dosingMode">Dosing schedule</label><select id="dosingMode"><option value="repeat" ${c.dosingMode==='repeat'?'selected':''}>Repeat dose</option><option value="custom" ${c.dosingMode==='custom'?'selected':''}>Custom oral / IV schedule</option></select></div>`+
 (c.dosingMode==='repeat'?`<div class="inputrow"><label for="route">Drug and route</label><select id="route"><option value="Acyclovir IV" ${c.route==='Acyclovir IV'?'selected':''}>Acyclovir — IV</option><option value="Valacyclovir oral" ${c.route==='Valacyclovir oral'?'selected':''}>Valacyclovir — oral</option></select></div>`:'')+
 (c.dosingMode==='repeat'?['dose','every','doseCount'].concat(c.route==='Valacyclovir oral'?[]:['infusion']).map(numericField).join(''):
 `<button class="btn secondary" id="openDoses">Edit medication schedule</button><div class="advisory" id="customDoseSummary"></div>`)+
 group('Simulation window',['horizon']);
 $('modeControls').innerHTML=modalControls();
 $('modeHint').textContent=primary==='Custom sequence'?'Define sequential treatments in Treatment timeline.':'';
 $('advancedControls').innerHTML=`<div class="inputrow"><label for="colorPalette">Graph accessibility</label><select id="colorPalette"><option value="standard" ${paletteMode==='standard'?'selected':''}>High-contrast colors</option><option value="accessible" ${paletteMode==='accessible'?'selected':''}>Colorblind-friendly (Okabe–Ito)</option></select></div><div class="inputrow"><label for="virus">Virus susceptibility reference</label><select id="virus"><option value="VZV" ${c.virus==='VZV'?'selected':''}>Varicella-zoster virus (VZV)</option><option value="HSV-1" ${c.virus==='HSV-1'?'selected':''}>HSV-1</option><option value="HSV-2" ${c.virus==='HSV-2'?'selected':''}>HSV-2</option></select><p class="tip virus-note">Only the optional cell-culture IC₅₀ range changes with virus selection; PK predictions remain unchanged. This is not a therapeutic target. <a href="#ref11">[11]</a></p></div>`+group('CNS distribution',['csfRatio','csfLag','csfMetRatio','csfMetLag'])+
 group('CMMG model',['formFactor','metRenal','metDial'])+
 group('Uncertainty',c.dosingMode==='custom'||c.route==='Valacyclovir oral'?['valF','valKa','variability']:['variability'])+
 group('Peritoneal membrane',['pdSmallPore','pdSigma'])+group('Assay error',['assayCV'])+
 `<div class="inputrow"><label for="draws">Monte Carlo samples</label><select id="draws"><option>30</option><option>60</option><option>120</option><option>200</option></select></div><div class="inputrow"><label for="coverage">Concentration interval</label><select id="coverage"><option value="0.5">50%</option><option value="0.8">80%</option><option value="0.9">90%</option><option value="0.95">95%</option></select></div>`+
 [['showBands','Uncertainty bands'],['showShades','Dialysis session shading'],['showIC50','Cell-culture IC₅₀ range (not a treatment target)']].map(([id,lab])=>`<label class="check"><input type="checkbox" data-toggle="${id}" ${c[id]?'checked':''}> ${lab}</label>`).join('');
 $('draws').value=c.draws;$('coverage').value=c.coverage;$('advanced').open=keepAdvanced;
 $('drugCaution').classList.toggle('hidden',c.dosingMode!=='custom'&&c.route!=='Valacyclovir oral');
 updateDrugCaution();if(c.dosingMode==='custom')updateCustomDoseSummary();
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
$('shadeLegend').innerHTML=`<span>Background shading: <strong>${primary}</strong> schedule only${visible.has(primary)?'':' (curve hidden)'}</span>`+
 [...new Set(rows.map(r=>r.type))].map(type=>`<span><i style="background:${typeColor(type)}"></i>${type} active</span>`).join('');}
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
const timeLabelCache=new WeakMap(),chartStates=new Map(),pendingPlots=new Map();
let plotFrame=0,renderFrame=0,resizeFrame=0,plotRunning=false,activePlot=null;
function labelsFor(time){
 if(!timeLabelCache.has(time))timeLabelCache.set(time,time.map(timeLabel));
 return timeLabelCache.get(time);
}
function chartSignature(key){return JSON.stringify([resultsRevision,primary,modes.filter(m=>visible.has(m)),paletteMode,c.coverage,c.showBands,c.showShades,key==='csf'&&c.showIC50,key==='csf'&&c.showIC50?c.virus:null]);}
function requestPlotFrame(){if(!plotFrame&&!plotRunning)plotFrame=requestAnimationFrame(drawNextPlot);}
function drawNextPlot(){
 plotFrame=0;
 const entry=pendingPlots.entries().next();if(entry.done)return;
 const [where,job]=entry.value;pendingPlots.delete(where);
 const target=$(where);
 if(!target.getClientRects().length){requestPlotFrame();return;}
 plotRunning=true;activePlot={where,signature:job.signature};
 Promise.resolve().then(()=>Plotly.react(target,job.traces,job.layout,{responsive:false,displaylogo:false,toImageButtonOptions:{format:'png',filename:'acyclovir_'+job.key,scale:2}}))
 .then(()=>{
  const rect=target.getBoundingClientRect();
  chartStates.set(where,{signature:job.signature,width:rect.width,height:rect.height});
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
    Plotly.Plots.resize(target);
   }
  }
 });
}
window.addEventListener('resize',resizeVisibleCharts,{passive:true});
if(typeof ResizeObserver!=='undefined')new ResizeObserver(resizeVisibleCharts).observe(document.querySelector('main'));
function layout(unit){let ticks=[],texts=[],delta=c.horizon<=72?6:c.horizon<=168?12:24;if(window.innerWidth<650)delta=Math.max(delta,24);
 for(let t=0;t<=c.horizon+.01;t+=delta){ticks.push(t);texts.push(timeLabel(t));}
 const yLabel=unit.includes('(mg/L)')?(unit.includes('CMMG')?(unit.includes('CSF')?'CSF CMMG (mg/L)':'Plasma CMMG (mg/L)'):unit.includes('dialysate')?'Dialysate acyclovir (mg/L)':unit.includes('CSF')?'CSF acyclovir (mg/L)':'Plasma acyclovir (mg/L)'):
  unit.includes('(mL/min')?'Clearance (mL/min)':unit.includes('(mg/hour)')?'Drug removal (mg/hour)':unit.includes('(mL/hour)')?'Ultrafiltration (mL/hour)':unit;
 return {autosize:true,paper_bgcolor:'#fff',plot_bgcolor:'#fff',margin:{l:window.innerWidth<650?76:87,r:9,t:12,b:78},font:{family:'Arial,Helvetica,sans-serif',size:11,color:'#35485b'},
 xaxis:{title:'Time (day · hour)',tickmode:'array',tickvals:ticks,ticktext:texts,tickangle:-28,range:[0,c.horizon],gridcolor:'#e5ebf0',zeroline:false},
 yaxis:{title:{text:yLabel,standoff:4,font:{size:11,color:'#24384b'}},side:'left',anchor:'x',ticklabelposition:'outside left',ticks:'outside',ticklen:5,tickcolor:'#64798b',showline:true,linecolor:'#64798b',automargin:true,gridcolor:'#e5ebf0',rangemode:'tozero',zeroline:false},shapes:plotShade(results[primary].rows).concat(results[primary].doses.filter(d=>d.amount>0).map(d=>({type:'line',xref:'x',yref:'paper',x0:d.time,x1:d.time,y0:0,y1:1,opacity:.72,line:{color:d.route==='Valacyclovir oral'?'#19856e':'#b54b28',width:1.35,dash:'dash'}}))),showlegend:true,legend:{orientation:'h',y:-.42,x:0},hovermode:'x unified'};}
function curve(key,unit,where,ref=null){if(!results)return;
 const signature=chartSignature(key);
 if(pendingPlots.get(where)?.signature===signature)return;
 if((activePlot?.where===where&&activePlot.signature===signature)||
    (chartStates.get(where)?.signature===signature&&activePlot?.where!==where)){
  pendingPlots.delete(where);return;
 }
 let traces=[];
 for(const m of modes){if(!visible.has(m)||!results[m])continue;let d=results[m],z=d[key],col=COLORS[m];
 if(m===primary&&c.showBands){traces.push({x:d.time,y:z.lower,mode:'lines',line:{width:0},hoverinfo:'skip',showlegend:false});traces.push({x:d.time,y:z.upper,mode:'lines',line:{width:0},fill:'tonexty',fillcolor:rgba(col,.17),name:`${Math.round(c.coverage*100)}% ${results._validation.fitted?"updated model":"unfitted model"} interval`,hoverinfo:'skip'});}
 traces.push({x:d.time,y:z.median,text:labelsFor(d.time),type:'scatter',mode:'lines',name:m+(m===primary?' (selected)':''),line:{color:col,width:m===primary?4.2:3.2,dash:LINE_DASH[m]},hovertemplate:`%{text}<br>%{y:.3f} ${unit}<extra>${m}</extra>`});}
 const ll=layout(unit);let v=null;
 if(key==='cmmg')v={value:E.MARKER,label:'Neurotoxicity-associated CMMG level: 2.58 mg/L [3]',color:'#cb496c'};
 else if(ref&&c.showStudy)v=ref;
 if(v){ll.shapes.push({type:'line',xref:'x',yref:'y',x0:0,x1:c.horizon,y0:v.value,y1:v.value,line:{color:v.color,width:2,dash:'dot'}});
 traces.push({x:[null],y:[null],mode:'lines',line:{color:v.color,dash:'dot'},name:v.label});}
 if(key==='csf'&&c.showIC50){const r=VIRUSES[c.virus];
 ll.shapes.push({type:'rect',xref:'x',yref:'y',x0:0,x1:c.horizon,y0:r.min,y1:r.max,fillcolor:'rgba(177,145,56,.12)',line:{width:0},layer:'below'});
 traces.push({x:[0,c.horizon],y:[r.min,r.max],mode:'markers',marker:{size:1,opacity:0},hoverinfo:'skip',showlegend:false});
 traces.push({x:[null],y:[null],mode:'lines',line:{color:'#a98a33',width:6},name:`${c.virus} in-vitro IC₅₀ range ${r.min}–${r.max} mg/L [11] (not a target)`});} 
 pendingPlots.set(where,{key,traces,layout:ll,signature});requestPlotFrame();
}
function showStats(){let d=results[primary].summary;
 let arr=[['Peak plasma acyclovir',d.peak,'mg/L',1,'#ed766b'],['Plasma acyclovir AUC',d.auc,'mg·h/L',0,'#8660c1'],['Peak CSF acyclovir',d.csfPeak,'mg/L',1,'#179b89'],['CSF acyclovir AUC',d.csfAuc,'mg·h/L',0,'#d59c37'],['Peak plasma CMMG',d.mPeak,'mg/L',2,'#cb5891'],['Acyclovir removed by dialysis',d.mass,'mg',0,'#3976bd'],['Plasma at simulation end',d.endPlasma,'mg/L',2,'#315d74']];
 $('metrics').innerHTML=arr.map(([label,v,unit,dig,color])=>`<div class="metric" style="--tone:${color}"><div class="key">${label}</div><div class="val">${v.median.toFixed(dig)} <span style="font-size:11px">${unit}</span></div><div class="sub">${results._validation.fitted?"Updated":"Unfitted"} ${Math.round(c.coverage*100)}% model interval: ${v.lower.toFixed(dig)}–${v.upper.toFixed(dig)} ${unit}</div></div>`).join('');}
function table(){const cols=[['peak','Peak plasma acyclovir (mg/L)',1],['auc','Plasma acyclovir AUC (mg·h/L)',0],['csfPeak','Peak CSF acyclovir (mg/L)',1],['csfAuc','CSF acyclovir AUC (mg·h/L)',0],['mPeak','Peak plasma CMMG (mg/L)',2],['mass','Acyclovir removed by dialysis (mg)',0],['endPlasma','Plasma acyclovir at end (mg/L)',2]];
 let rows=`<table><thead><tr><th>Modality</th>${cols.map(x=>`<th>${x[1]}</th>`).join('')}</tr></thead><tbody>`;
 for(let m of modes){let d=results[m].summary;rows+=`<tr><td style="font-weight:800;color:${COLORS[m]}">${m}</td>${cols.map(([id,_,n])=>`<td>${d[id].median.toFixed(n)} <span style="color:#8b8593">[${d[id].lower.toFixed(n)}–${d[id].upper.toFixed(n)}]</span></td>`).join('')}</tr>`;} $('resultTable').innerHTML=rows+'</tbody></table>';}
let metricsSignature='',tableRevision=-1,validationSignature='';
function render(){if(!renderFrame)renderFrame=requestAnimationFrame(()=>{renderFrame=0;renderNow();});}
function renderNow(){if(!results||!dataIsCurrent)return;
 renderChecks();
 const summarySignature=resultsRevision+':'+primary;
 if(metricsSignature!==summarySignature){showStats();metricsSignature=summarySignature;}
 if(tab==='table'&&tableRevision!==resultsRevision&&modes.every(m=>results[m])){table();tableRevision=resultsRevision;}
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
  queuedJob={id,config:jobConfig};setBusy(true);startNextJob();
 }catch(error){calculationError(error);}
}
function defer(){pendingCsvExport=false;++calculationVersion;queuedJob=null;dataIsCurrent=false;setBusy(true);clearTimeout(timer);timer=setTimeout(calculate,180);}
function updateParam(target){let id=target.dataset.k;if(!id)return;let value=Number(target.value);if(target.value.trim()===''||!Number.isFinite(value))return;
 const def=fieldDef(id);if(value<def[2]||value>def[3]){if(target.dataset.role==='number')target.setCustomValidity(`Use ${def[2]}–${def[3]}`);return;}target.setCustomValidity?.('');c[id]=value;if(id==='dose')updateDrugCaution();if(id==='weight'&&c.crclSource==='estimated'){c.crcl=calculatedCrCl();const out=$('cgOutput');if(out)out.textContent=c.crcl.toFixed(1)+' mL/min';}
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
 for(const name of ['concentration','clearance','timeline','validation','reference','table','method','research'])$(name).classList.toggle('hidden',name!==tab);
 if(tab==='table'&&(!dataIsCurrent||!results||modes.some(m=>!results[m])))calculate(true);
 else if(results)render();
 if(tab==='timeline'){renderSchedule();renderPdRxEditor();renderDoseRows();}
 if(tab==='research')renderResearch();resizeVisibleCharts();}
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

let measureDraft=structuredClone(c.observations);
function renderMeasureRows(){
 $('measureRows').innerHTML=measureDraft.map((m,i)=>`<tr><td><input data-mi="${i}" data-mk="time" type="number" min="0" max="${c.horizon}" step="any" value="${m.time}"></td><td><select data-mi="${i}" data-mk="analyte">${[['plasma','Plasma acyclovir'],['csf','CSF acyclovir'],['cmmg','Plasma CMMG'],['csfCmmg','CSF CMMG']].map(([k,v])=>`<option value="${k}" ${m.analyte===k?'selected':''}>${v}</option>`).join('')}</select></td><td><input type="number" data-mi="${i}" data-mk="value" min="0" step="any" value="${m.value}"></td><td><select data-mi="${i}" data-mk="role"><option value="fit" ${m.role==='fit'?'selected':''}>Fit</option><option value="holdout" ${m.role==='holdout'?'selected':''}>Hold-out</option></select></td><td><button class="btn secondary" data-remove-measure="${i}" type="button">×</button></td></tr>`).join('');
}
function validationErrors(){let errors=[];for(const [i,m] of measureDraft.entries()){
 if(!Number.isFinite(m.time)||m.time<0||m.time>c.horizon)errors.push(`Measurement ${i+1}: time must be within 0–${c.horizon} h`);
 if(!Number.isFinite(m.value)||m.value<0||m.value>100000)errors.push(`Measurement ${i+1}: enter a valid nonnegative concentration`);
 }return errors;
}
function renderValidation(){if(!results)return;const v=results._validation;
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
$('patientControls').addEventListener('click',e=>{if(e.target.id==='openDoses')switchTab('doses');});
$('modeControls').addEventListener('click',e=>{if(e.target.id==='showPdRx'){switchTab('timeline');$('pdRxPanel').scrollIntoView({block:'start',behavior:'smooth'});}});
$('primary').addEventListener('change',e=>{primary=e.target.value;renderInputs();defer();});
document.querySelector('aside').addEventListener('input',e=>{if(e.target.dataset.k)updateParam(e.target);});
document.querySelector('aside').addEventListener('change',e=>{if(e.target.id==='colorPalette'){setPalette(e.target.value);renderInputs();if(results)render();}else if(e.target.id==='virus'){c.virus=e.target.value;renderInputs();if(results)render();}else if(e.target.id==='pdMethod'){c.pdMethod=e.target.value;renderInputs();researchRenderedPrimary='';defer();}else if(e.target.id==='draws'){c.draws=+e.target.value;defer();}else if(e.target.id==='coverage'){c.coverage=+e.target.value;defer();}else if(e.target.dataset.toggle){c[e.target.dataset.toggle]=e.target.checked;if(results)render();}else if(e.target.dataset.k)updateParam(e.target);});
$('scenarioChecks').addEventListener('change',e=>{let m=e.target.dataset.mode;if(!m)return;e.target.checked?visible.add(m):visible.delete(m);if(e.target.checked&&(!results||!dataIsCurrent||!results[m]))calculate();else if(results)render();});
document.addEventListener('click',e=>{const ref=e.target.closest('a[href^="#ref"]');if(!ref)return;if(!document.querySelector(ref.getAttribute('href')))return;switchTab('method');setTimeout(()=>document.querySelector(ref.getAttribute('href'))?.scrollIntoView({block:'center',behavior:'smooth'}),90);});
$('tabs').addEventListener('click',e=>{let b=e.target.closest('[data-tab]');if(b)switchTab(b.dataset.tab);});
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
$('csv').addEventListener('change',event=>{const format=event.target.value;event.target.value='';if(!dataIsCurrent||!['wide','tidy'].includes(format))return;if(modes.some(m=>!results[m])){pendingCsvExport=format;calculate(true);}else if(format==='tidy')downloadTidyCSV();else download();});
// Medication timeline is separate from dialysis timeline. Mixed routes share the same drug state.
function renderDoseRows(){
 const target=$('doseRows');if(!target)return;
 target.innerHTML=doseDraft.map((d,i)=>`<div class="dose-row" data-dose-row="${i}">
 <div><label>Time (hours)</label><input type="number" step="any" min="0" data-dose-index="${i}" data-dose-field="time" value="${d.time}"></div>
 <div><label>Medication / route</label><select data-dose-index="${i}" data-dose-field="route">${E.ROUTES.map(r=>`<option value="${r}" ${r===d.route?'selected':''}>${r==='Acyclovir IV'?'Acyclovir · IV':'Valacyclovir · oral'}</option>`).join('')}</select></div>
 <div><label>Amount (mg)</label><input type="number" step="any" min="0.01" max="${E.MAX_DOSE_MG[d.route]}" data-dose-index="${i}" data-dose-field="amount" value="${d.amount}"></div>
 <div><label>IV infusion (hours)</label><input type="number" step="any" min="0.01" max="24" data-dose-index="${i}" data-dose-field="infusion" value="${d.infusion||1}" ${d.route==='Valacyclovir oral'?'disabled':''}></div>
 <button class="btn secondary small" data-delete-dose="${i}" aria-label="Remove medication dose ${i+1}">✕</button></div>`).join('');
 $('doseCountPreview').textContent=`${doseDraft.length} planned administration${doseDraft.length===1?'':'s'} · Oral and IV amounts are in their own labeled drug milligrams, not equivalent doses.`;
 paintDoses();checkDoseDraft();
}
function paintDoses(){
 $('doseBar').innerHTML=doseDraft.filter(d=>Number.isFinite(d.time)&&d.time>=0&&d.time<c.horizon).map((d,i)=>`<span title="${d.route} ${d.amount} mg @ ${timeLabel(d.time)}" style="left:${100*d.time/c.horizon}%;width:4px;background:${d.route==='Valacyclovir oral'?'#159b87':'#da5982'}"></span>`).join('');
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
function renderSensitivity(){
 if(!dataIsCurrent){$('sensitivityRows').innerHTML='<tr><td colspan="5">Updating model…</td></tr>';return;}
 try{
  const s=E.sensitivity(c,primary);
  $('sensitivityRows').innerHTML=s.outcomes.map(d=>`<tr><td>${d.label}</td>${d.na?'<td colspan="4">Not applicable at a zero baseline</td>':
   ['auc','csfPeak','mPeak','mass'].map(k=>`<td>${pctPair(d.effects[k])}</td>`).join('')}</tr>`).join('');
  $('sensitivityCaption').textContent=`Nominal one-at-a-time analysis: each parameter decreased by 20% / increased by 20%, relative to the current ${primary} setting. Drug exposure results are deterministic; correlations and uncertainty are not represented.`;
 }catch(error){$('sensitivityRows').innerHTML=`<tr><td colspan="5">Sensitivity unavailable: check current settings.</td></tr>`;}
}
let researchRenderedRevision=-1,researchRenderedPrimary='';
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
 if(resultsRevision!==researchRenderedRevision){renderSensitivity();researchRenderedRevision=resultsRevision;}
}
function downloadJSON(obj,name){
 const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}));
 a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
$('downloadMigrated').addEventListener('click',()=>{if(migratedPayload)downloadJSON(migratedPayload,'ayflux_migrated_schema2.json');});
$('saveConfig').addEventListener('click',()=>{
 const data={format:'acyclovir-pk-simulator',schemaVersion:2,appVersion:'0.21.0',savedAt:new Date().toISOString(),config:structuredClone(c),primary,visibleScenarios:[...visible],appearance:{palette:paletteMode}};
 downloadJSON(data,'ayflux_simulation_v0.21.0.json');researchStatus('Configuration exported as JSON; stored locally in your download folder.');
});
$('loadConfig').addEventListener('change',async e=>{
 const file=e.target.files?.[0];if(!file)return;
 migratedPayload=null;$('downloadMigrated').classList.add('hidden');
 try{
  if(file.size>1000000)throw Error('File is too large (maximum 1 MB). No settings were changed.');
  let input;
  try{input=JSON.parse(await file.text());}
  catch(_){throw Error('This is not valid JSON. Export a configuration using Save configuration (JSON).');}
  if(!input||typeof input!=='object'||Array.isArray(input)||input.format!=='acyclovir-pk-simulator')
    throw Error('This file is not an AyFlux simulation configuration. No settings were changed.');
  if(input.schemaVersion!==1&&input.schemaVersion!==2)
    throw Error(`Unsupported configuration schema (${String(input.schemaVersion??'missing')}). AyFlux supports schema 1 (v13–17) and schema 2 (v18 onward). No settings were changed.`);
  const migrating=input.schemaVersion===1;
  const src=input.config;
  if(!src||typeof src!=='object'||Array.isArray(src))throw Error('Configuration data is missing. No settings were changed.');
  const next=structuredClone(E.DEFAULTS);
  const required=Object.keys(next),number=x=>typeof x==='number'&&Number.isFinite(x);
  const missing=required.filter(key=>!['renalMode','renalProfile'].includes(key)&&!Object.prototype.hasOwnProperty.call(src,key));
  if(missing.length)throw Error('Configuration is incomplete (missing '+missing.slice(0,4).join(', ')+'). No settings were changed.');
  for(const key of required){
   if(!Object.prototype.hasOwnProperty.call(src,key)&&['renalMode','renalProfile'].includes(key))continue;
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
  const converted={format:'acyclovir-pk-simulator',schemaVersion:2,appVersion:'0.21.0',savedAt:new Date().toISOString(),
    config:structuredClone(next),primary:input.primary,visibleScenarios:[...input.visibleScenarios],appearance:{palette:importedPalette}};
  if(migrating)converted.migratedFrom={schemaVersion:1,appVersion:String(input.appVersion??'unknown'),savedAt:input.savedAt??null};
  Object.assign(c,next);setPalette(importedPalette);primary=input.primary;
  visible=new Set(input.visibleScenarios);
  draft=structuredClone(c.schedule);doseDraft=structuredClone(c.customDoses);
  renalDraft=structuredClone(c.renalProfile);renalDirty=false;renalProfileEdited=c.renalMode==='profile';
  measureDraft=structuredClone(c.observations);rxDraft=structuredClone(c.pdRxRows);
  $('primary').value=primary;researchRenderedPrimary='';renderInputs();renderSchedule();renderDoseRows();renderMeasureRows();renderPdRxRows();
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

$('primary').value=primary;renderInputs();renderSchedule();renderDoseRows();renderMeasureRows();renderPdRxEditor();calculate();
})();


