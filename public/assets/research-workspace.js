/*
 * AyFlux v0.20 research workspace — optional tools over existing model output.
 * Copyright (C) 2026 Muhammad Khalil
 * SPDX-License-Identifier: AGPL-3.0-only
 * Browser-side only. No network upload, clinical validation, or dosing advice.
 */
(function () {
"use strict";
const $=id=>document.getElementById(id);
const bridge=window.AyFluxResearchBridge;
const pk=window.RenalPKV7, importer=window.AyFluxOspImport, integrity=window.AyFluxIntegrity;
if(!bridge||!pk||!importer||!integrity)return;
$('openVisualExplorer')?.addEventListener('click',event=>{
 try{
  const snap=getSnapshot();
  const config=structuredClone(snap.config);config.observations=[];
  sessionStorage.setItem('ayflux-explorer',JSON.stringify({config,mode:snap.primary}));
 }catch(error){event.preventDefault();$('visualExplorerStatus').textContent=error.message+' Settings could not be copied.';}
});
let externalTable=null, lastExternal=null;
const getSnapshot=()=>{
 const snapshot=bridge.snapshot();
 if(!snapshot.updated||!snapshot.results?.[snapshot.primary])throw Error("Run a successful simulation first.");
 return snapshot;
};
const updateText=(id,text)=>{const el=$(id);if(el)el.textContent=text;};
function selection(select,headers,preferred){
 select.replaceChildren();
 for(const h of headers){const o=document.createElement("option");o.value=h;o.textContent=h;select.append(o);}
 const index=headers.findIndex(h=>preferred.test(h));
 if(index>=0)select.selectedIndex=index;
}
$('ospFile').addEventListener("change",async event=>{
 try{
  const file=event.target.files?.[0];externalTable=null;lastExternal=null;
  $('ospPlot').classList.add("hidden");$('ospDifference').classList.add("hidden");updateText("ospMetrics","");
  if(!file)return;
  if(file.size>4*1024*1024)throw Error("Choose a CSV smaller than 4 MB.");
  externalTable=importer.parseCSV(await file.text());
  selection($('ospTimeColumn'),externalTable.headers,/(^time$|time|hour|minute)/i);
  selection($('ospValueColumn'),externalTable.headers,/(acyclovir|aciclovir|concentration|plasma|blood|cmmg)/i);
  if($('ospTimeColumn').value===$('ospValueColumn').value&&externalTable.headers.length>1)$('ospValueColumn').selectedIndex=1;
  updateText("ospStatus",externalTable.rows.length+" rows loaded locally. Confirm the two columns, their units, and target analyte.");
 }catch(error){externalTable=null;updateText("ospStatus","Import error: "+error.message);}
});
async function renderExternal(){
 if(!externalTable)throw Error("Select a CSV file first.");
 const snapshot=getSnapshot(),key=$('ospTarget').value;
 const raw=importer.selectSeries(externalTable,{
  timeColumn:$('ospTimeColumn').value,
  concentrationColumn:$('ospValueColumn').value,
  timeUnit:$('ospTimeUnit').value,
  concentrationUnit:$('ospConcUnit').value,
  analyte:key==="cmmg"||key==="csfCmmg"?"cmmg":"acyclovir"
 });
 const simulation=snapshot.results[snapshot.primary];
 const model={time:simulation.time,concentration:simulation[key].median};
 const difference=importer.compareCurves(model,raw);
 await window.AyFluxCharts.ensure();
 const unitName=key==="plasma"?"Plasma acyclovir":key==="csf"?"CSF acyclovir":key==="cmmg"?"Plasma CMMG":"CSF CMMG";
 const charts=window.AyFluxCharts;
 $('ospPlot').classList.remove('hidden');$('ospDifference').classList.remove('hidden');
 const option=charts.options([charts.line('AyFlux median',model.time,model.concentration,'#0054e9'),
  charts.line('Imported model',raw.time,raw.concentration,'#b45a24',2,'dashed')],'Time since simulation start (hours)','Concentration (mg/L)');
 option.title={text:unitName+' comparison',textStyle:{fontSize:14}};
 charts.draw($('ospPlot'),option);
 const residual=charts.options([charts.line('AyFlux − import',difference.points.map(p=>p.time),difference.points.map(p=>p.difference),'#396e74')],'Time (hours)','Difference (mg/L)');
 charts.draw($('ospDifference'),residual);
 const fix=v=>v.toPrecision(4);
 updateText("ospMetrics",difference.points.length+" overlapping samples · RMSE "+fix(difference.rmse)+" mg/L · MAE "+fix(difference.mae)+" mg/L · mean bias "+fix(difference.bias)+" mg/L. These are curve-to-curve discrepancies, not a clinical goodness-of-fit assessment.");
 updateText("ospStatus","Compared with AyFlux "+snapshot.primary+". Re-run comparison if the model settings change.");
 lastExternal={time:raw.time,concentration:raw.concentration,unitName,metrics:difference};
}
$('ospCompare').addEventListener("click",async ()=>{
 try{await renderExternal();}catch(error){updateText("ospStatus","Comparison error: "+error.message);}
});
$('ospClear').addEventListener("click",()=>{
 $('ospFile').value="";externalTable=null;lastExternal=null;
 for(const id of ["ospPlot","ospDifference"]){const el=$(id);window.AyFluxCharts.dispose(el);el.classList.add("hidden");}
 updateText("ospMetrics","");updateText("ospStatus","Import cleared; no file data were uploaded.");
});
window.addEventListener("ayflux:results-updated",()=>{
 if(lastExternal)updateText("ospStatus","AyFlux simulation changed. Click Compare curves to refresh the overlay.");
});
const pause=()=>new Promise(resolve=>setTimeout(resolve,0));
$('runHeatmap').addEventListener("click",async ()=>{
 const button=$('runHeatmap');button.disabled=true;
 try{
  const snapshot=getSnapshot();
  const config={...snapshot.config,crclSource:"manual",draws:1,variability:0};
  const xValues=[0,10,25,50,75,100,150],yValues=[0,25,50,75,100,150,200];
  const metric=$('heatmapMetric').value,values=[];
  for(let j=0;j<yValues.length;j++){
   const row=[];
   updateText("heatmapStatus","Computing "+(j+1)+" of "+yValues.length+" rows…");
   await pause();
   for(const crcl of xValues){
    const c={...config,renalMode:'constant',crcl,hdCl:yValues[j]};
    const simulated=pk.simulate(c,"Intermittent HD");
    const value=simulated.summary[metric].median;
    if(!Number.isFinite(value))throw Error("Nonfinite model result in grid.");
    row.push(value);
   }
   values.push(row);
  }
  lastHeatmap={values,metric,xValues,yValues};
  await drawHeatmap(lastHeatmap);
 }catch(error){updateText("heatmapStatus","Unable to produce heatmap: "+error.message);}
 finally{button.disabled=false;}
});
let lastHeatmap=null;
window.addEventListener('ayflux:palette',()=>{if(lastHeatmap)drawHeatmap(lastHeatmap).catch(()=>{});});
async function drawHeatmap({values,metric,xValues,yValues}){
 {
  const charts=window.AyFluxCharts;
  const all=values.flat(),lo=Math.min(...all),hi=Math.max(...all);
  const table=document.createElement("table");table.id="heatmapTable";
  const caption=document.createElement("caption");caption.textContent=(metric==="auc"?"Plasma AUC (mg·h/L)":"Peak plasma concentration (mg/L)")+"; rows: HD clearance (mL/min), columns: CrCl (mL/min)";
  table.append(caption);
  const thead=document.createElement("thead"),header=document.createElement("tr");
  for(const label of ["HD / CrCl",...xValues.map(String)]){const th=document.createElement("th");th.textContent=label;header.append(th);}
  thead.append(header);table.append(thead);
  const tbody=document.createElement("tbody");
  values.forEach((row,j)=>{
   const tr=document.createElement("tr"),th=document.createElement("th");th.scope="row";th.textContent=String(yValues[j]);tr.append(th);
   row.forEach((value,i)=>{
    const td=document.createElement("td"),pct=hi===lo?0:(value-lo)/(hi-lo);
    const tone=charts.heatColorAt(pct);
    td.style.backgroundColor=tone.fill;
    td.style.color=tone.text;td.textContent=value.toFixed(value>=100?0:2);
    td.title="HD "+yValues[j]+" mL/min; CrCl "+xValues[i]+" mL/min";
    tr.append(td);
   });
   tbody.append(tr);
  });
  table.append(tbody);
  $('heatmapArea').replaceChildren(table);
  const label=metric==='auc'?'Plasma acyclovir AUC (mg·h/L)':'Peak plasma acyclovir (mg/L)';
  try{
   await window.AyFluxCharts.ensure();
   const target=$('heatmapPlot');
   target.classList.remove('hidden');
   window.AyFluxCharts.draw(target,{animation:false,grid:{left:70,right:22,top:16,bottom:96},
    xAxis:{type:'category',data:xValues,name:'Residual CrCl (mL/min)',nameLocation:'middle',nameGap:28},
    yAxis:{type:'category',data:yValues,name:'HD clearance (mL/min)',nameLocation:'middle',nameGap:42},
    visualMap:{min:lo,max:hi===lo?lo+1:hi,orient:'horizontal',bottom:2,left:'center',inRange:{color:charts.heatColors()}},
    tooltip:{renderMode:'richText',formatter:({value:[i,j,v]})=>'CrCl '+xValues[i]+' mL/min, HD '+yValues[j]+' mL/min\n'+label+' '+v.toFixed(3)},
    series:[{type:'heatmap',itemStyle:{borderColor:'#fff',borderWidth:1},
     // Each cell label takes the dark or light text color that contrasts with its own fill.
     data:values.flatMap((row,j)=>row.map((v,i)=>({value:[i,j,v],label:{color:charts.heatColorAt(hi===lo?0:(v-lo)/(hi-lo)).text}}))),
     label:{show:true,fontSize:11,fontWeight:600,formatter:p=>{const v=p.value[2];return v>=100?v.toFixed(0):v.toFixed(1);}}}]});
   $('heatmapArea').parentElement.open=false;
   updateText('heatmapStatus','Interactive Cartesian heatmap ready (49 deterministic simulations). Hover for values; expand the numeric table for accessible data.');
  }catch(error){
   $('heatmapPlot').classList.add('hidden');
   $('heatmapArea').parentElement.open=true;
   updateText('heatmapStatus','49 simulations completed. Interactive plot unavailable; numeric table shown. '+error.message);
  }
 }
}
// One HD session moved across the window; every point reruns the same dose schedule with nominal parameters.
function hdTimingPlan(config){
 // The simulation keeps its full duration, so kidney-function points and doses after hour 96 stay valid.
 // Only the session start times are limited, to the first 96 hours.
 const horizon=config.horizon,window=Math.min(96,horizon),duration=Math.min(config.hdDuration,24,window),last=window-duration;
 // Hourly starts (never coarser), on a half-hour grid. A coarse step would alias against the dose interval.
 const step=Math.max(.5,Math.ceil(last/96*2)/2),starts=[];
 for(let start=0;start<=last+1e-9;start+=step)starts.push(Number(start.toFixed(2)));
 return {horizon,window,duration,starts};
}
// Exactly one HD session, expressed as a custom sequence so it cannot repeat inside a long simulation.
function hdTimingConfig(config,plan,start){
 return {...config,crclSource:'manual',draws:1,variability:0,schedule:[{type:'HD',start,end:Number((start+plan.duration).toFixed(2))}]};
}
$('runHdTiming').addEventListener('click',async ()=>{
 const button=$('runHdTiming');button.disabled=true;
 try{
  const snapshot=getSnapshot();
  const plan=hdTimingPlan(snapshot.config);
  const config=snapshot.config;
  const problems=pk.validate(hdTimingConfig(config,plan,plan.starts[plan.starts.length-1]),'Custom sequence');
  if(problems.length)throw Error(problems.slice(0,2).join('; '));
  const reference=pk.simulate({...config,crclSource:'manual',draws:1,variability:0},'No dialysis').summary;
  const rows=[];
  for(const [index,start] of plan.starts.entries()){
   if(index%8===0){updateText('hdTimingStatus','Computing '+(index+1)+' of '+plan.starts.length+' session times…');await pause();}
   const summary=pk.simulate(hdTimingConfig(config,plan,start),'Custom sequence').summary;
   const row={start,removed:summary.mass.median,auc:summary.auc.median,peak:summary.peak.median,cmmg:summary.mPeak.median};
   if(!Object.values(row).every(Number.isFinite))throw Error('Nonfinite model result in sweep.');
   rows.push(row);
  }
  const doses=snapshot.results[snapshot.primary].doses.filter(d=>d.amount>0&&d.time<=plan.window).map(d=>d.time);
  const table=document.createElement('table'),head=table.createTHead().insertRow();
  const caption=table.createCaption();caption.textContent='One '+plan.duration+'-hour HD session, by start time. Values cover the full '+plan.horizon+'-hour simulation. Without dialysis: plasma AUC '+reference.auc.median.toFixed(0)+' mg·h/L.';
  for(const label of ['Session start (h)','Acyclovir removed (mg)','Plasma AUC (mg·h/L)','Peak plasma (mg/L)','Peak CMMG (mg/L)']){const th=document.createElement('th');th.scope='col';th.textContent=label;head.append(th);}
  const body=table.createTBody();
  for(const row of rows){const tr=body.insertRow();for(const text of [row.start,row.removed.toFixed(1),row.auc.toFixed(0),row.peak.toFixed(2),row.cmmg.toFixed(2)])tr.insertCell().textContent=String(text);}
  $('hdTimingArea').replaceChildren(table);
  const best=rows.reduce((a,b)=>b.removed>a.removed?b:a),worst=rows.reduce((a,b)=>b.removed<a.removed?b:a);
  const summaryText=plan.starts.length+' simulations. Most drug removed when the session starts at hour '+best.start+' ('+best.removed.toFixed(0)+' mg); least at hour '+worst.start+' ('+worst.removed.toFixed(0)+' mg). Dashed lines mark dose times.';
  try{
   await window.AyFluxCharts.ensure();
   const charts=window.AyFluxCharts,target=$('hdTimingPlot');target.classList.remove('hidden');
   const option=charts.options([
    charts.line('Acyclovir removed by the session (mg)',rows.map(r=>r.start),rows.map(r=>r.removed),'#285a7b',3),
    {...charts.line('Plasma AUC over the simulation (mg·h/L)',rows.map(r=>r.start),rows.map(r=>r.auc),'#b55b16',3,'dashed'),yAxisIndex:1}
   ],'HD session start (hours from first dose)','Acyclovir removed (mg)');
   option.xAxis.max=plan.window;option.grid.right=74;
   option.yAxis=[option.yAxis,{type:'value',name:'Plasma AUC (mg·h/L)',nameLocation:'middle',nameGap:52,min:0,splitLine:{show:false}}];
   option.dataZoom=option.dataZoom.filter(z=>z.id!=='ayNavY');option.toolbox.feature.dataZoom.yAxisIndex='none';
   option.series.push({type:'line',data:[],silent:true,tooltip:{show:false},markLine:{symbol:'none',silent:true,label:{show:false},lineStyle:{color:'#8a97a3',type:'dashed',width:1},data:doses.map(time=>({xAxis:time}))}});
   option.toolbox.feature.saveAsImage.name='acyclovir_hd_timing';
   charts.draw(target,option);
   $('hdTimingArea').parentElement.open=false;
   updateText('hdTimingStatus',summaryText);
  }catch(error){
   $('hdTimingPlot').classList.add('hidden');$('hdTimingArea').parentElement.open=true;
   updateText('hdTimingStatus',summaryText+' Interactive plot unavailable; numeric table shown. '+error.message);
  }
 }catch(error){updateText('hdTimingStatus','Unable to run the timing sweep: '+error.message);}
 finally{button.disabled=false;}
});
$('runIntegrity').addEventListener("click",async ()=>{
 const button=$('runIntegrity');button.disabled=true;updateText("integrityStatus","Checking numerical consistency…");
 try{
  const snap=getSnapshot(),current=integrity.checkSimulation(snap.results[snap.primary],snap.config);
  await pause();
  const convergence=integrity.checkConvergence(pk,snap.config,snap.primary);
  const fraction=convergence.administeredAcyclovirEqMg>0?100*Math.abs(convergence.massBalanceErrorMg)/convergence.administeredAcyclovirEqMg:null;
  const lines=[
   "Output arrays: "+(current.passed?"PASS":"REVIEW"),
   ...(current.issues.length?current.issues:[]),
   "Time-step AUC difference: "+(100*convergence.aucRelativeDifference).toFixed(3)+"%",
   "Time-step peak difference: "+(100*convergence.peakRelativeDifference).toFixed(3)+"%",
   "Mass-balance residual: "+(convergence.massBalanceErrorMg===null?"not available":convergence.massBalanceErrorMg.toFixed(4)+" mg"+(fraction===null?"":" ("+fraction.toFixed(3)+"% of administered acyclovir-equivalent mass)")),
   "These are computational consistency checks, not proof of scientific or clinical validity."
  ];
  updateText("integrityStatus",lines.join("\n"));
 }catch(error){updateText("integrityStatus","Diagnostic error: "+error.message);}
 finally{button.disabled=false;}
});
(function library(){
 const refs=[
  {label:"US acyclovir IV label: 5 mg/kg q8h",details:"Steady-state plasma mean peak 9.8 mg/L, trough 0.7 mg/L (n=8), 1-hour IV infusion. Aggregate observations.",url:"https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=889bccd1-3793-40ce-bca2-c8c9cf6b7488"},
  {label:"US acyclovir IV label: 10 mg/kg q8h",details:"Steady-state plasma mean peak 22.9 mg/L, trough 1.9 mg/L (n=7), 1-hour IV infusion. Aggregate observations.",url:"https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=889bccd1-3793-40ce-bca2-c8c9cf6b7488"},
  {label:"Laskin et al. (1982): anuric HD cohort",details:"Historical plasma concentration benchmarks for a 2.5 mg/kg IV study. Nominal assumptions are not matched patient measurements.",url:"https://pubmed.ncbi.nlm.nih.gov/7075109/"}
 ];
 const list=document.createElement("ul");
 for(const item of refs){
  const li=document.createElement("li"),a=document.createElement("a");
  a.href=item.url;a.target="_blank";a.rel="noopener noreferrer";a.textContent=item.label;
  li.append(a,document.createTextNode(" — "+item.details));list.append(li);
 }
 $('referenceLibrary').replaceChildren(list);
})();
function escapeHtml(s){return String(s).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));}
// Build print-specific chart images from the selected scenario, not the live
// overlay chart (which may contain counterfactual scenarios or be hidden).
async function renderReportChart(sim,key,label,color){
 const target=document.createElement('div');
 target.style.cssText='position:fixed;left:-12000px;top:0;width:960px;height:270px;pointer-events:none;';
 target.setAttribute('aria-hidden','true');
 document.body.append(target);
 const series=sim[key],time=sim.time;
 try{
  const charts=window.AyFluxCharts;
  const option=charts.options([charts.band('Model interval',time,series.lower,series.upper,'rgba(46,96,132,.18)'),
   charts.line('Model median',time,series.median,color,2.5)],'Time (hours)','Concentration (mg/L)');
  option.title={text:label,textStyle:{fontSize:15}};option.toolbox.show=false;
  const chart=charts.draw(target,option);
  return chart.getDataURL({type:'png',pixelRatio:1.5,backgroundColor:'#fff'});
 }finally{
  window.AyFluxCharts.dispose(target);
  target.remove();
 }
}
function buildResearchReportHtml({date,values,metrics,charts,diagnostic,scenario}){
 const tableRow=(label,value)=>'<tr><th scope="row">'+escapeHtml(label)+'</th><td>'+
  escapeHtml(value===undefined||value===null?'Not available':
   typeof value==='number'?Number(value.toPrecision(6)):value)+'</td></tr>';
 const figure=(item,i)=>'<figure class="report-figure">'+
  '<img src="'+item.image+'" width="960" height="270" alt="'+escapeHtml(item.name)+' concentration prediction" loading="eager">'+
  '<figcaption>Figure '+(i+1)+'. '+escapeHtml(item.name)+'; the band shows the selected model interval, not measured clinical variability.</figcaption>'+
  '</figure>';
 return '<!doctype html><html lang="en"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width, initial-scale=1"><title>AyFlux research report</title>'+
  '<style>'+
  '@page{size:A4;margin:13mm 14mm}'+
  '*{box-sizing:border-box}html,body{padding:0;margin:0}'+
  'body{font:11px/1.4 Arial,Helvetica,sans-serif;color:#263e52;background:#fff}'+
  'h1{font-size:21px;color:#28485e;border-bottom:3px solid #829dad;padding-bottom:7px;margin:0 0 10px}'+
  'h2{font-size:14px;color:#28485e;margin:14px 0 7px;break-after:avoid;page-break-after:avoid}'+
  '.meta{font-size:10px;color:#526979;margin-bottom:12px}'+
  '.note{background:#fdf6e5;border-left:3px solid #a79851;padding:8px;margin:0 0 14px}'+
  'table{border-collapse:collapse;width:100%;margin:0 0 10px;table-layout:fixed}'+
  'tr{break-inside:avoid;page-break-inside:avoid}'+
  'th,td{border:1px solid #adbfca;padding:5px 8px;text-align:left;overflow-wrap:anywhere;vertical-align:top}'+
  'th{width:52%;font-weight:700;background:#edf2f5}'+
  '.report-charts{break-before:page;page-break-before:always}'+
  '.chart-header{margin-top:0}'+
  '.report-figure{margin:0 0 7px;display:block;break-inside:avoid;page-break-inside:avoid}'+
  '.report-figure img{display:block;width:100%;height:auto;max-height:220px;object-fit:contain;break-inside:avoid;page-break-inside:avoid}'+
  'figcaption{font-size:9px;color:#546c7b;margin:1px 0 6px}'+
  '.report-extras{break-inside:avoid;page-break-inside:avoid}'+
  '.sources{font-size:9px;overflow-wrap:anywhere;color:#536c7f}'+
  '.screen-help{padding:7px 10px;background:#edf2f5;margin:10px 0;font-weight:700}'+
  '@media print{.screen-help{display:none}.report-charts{break-before:page;page-break-before:always}'+
  '.report-figure,.report-figure img,.report-extras{break-inside:avoid;page-break-inside:avoid}}'+
  '</style></head><body>'+
  '<p class="screen-help">Use your browser Print command (Ctrl+P / Cmd+P) and select Save as PDF.</p>'+
  '<section class="report-summary"><h1>AyFlux — educational PK research report</h1>'+
  '<p class="meta">Generated '+escapeHtml(date)+' · AyFlux '+escapeHtml(window.AyFluxVersion?.version||'0.25.0')+
  ' · Configuration schema 2</p>'+
  '<p class="note"><strong>EDUCATIONAL USE ONLY.</strong> Simulated, non-validated concentration estimates. Not for prescribing, toxicity assessment, clinical decisions, or dialysis planning.</p>'+
  '<h2>Simulation assumptions</h2><table>'+values.map(r=>tableRow(...r)).join('')+'</table>'+
  '<h2>Model summary (medians)</h2><table>'+metrics.map(r=>tableRow(...r)).join('')+'</table>'+
  '</section>'+
  '<section class="report-charts"><h2 class="chart-header">Concentration curves — '+escapeHtml(scenario)+'</h2>'+
  charts.map(figure).join('')+
  '<section class="report-extras"><h2>Numerical diagnostics</h2><p>'+escapeHtml(diagnostic)+'</p>'+
  '<h2>Limitations and references</h2>'+
  '<p>All traces are modeled estimates, not observed concentrations. Model intervals do not establish prospective clinical coverage. Predictions depend on assumed renal, nonrenal, distribution, metabolism, and dialysis processes; external patient-level validation is not established.</p>'+
  '<p class="sources">Source: github.com/khalilm3264/acyclovirpksim · License: AGPL-3.0-only · References: ayflux.org/learn/model-methods/ · ayflux.org/cite/</p>'+
  '</section></section></body></html>';
}
$('printResearchReport').addEventListener('click',async ()=>{
 const popup=window.open('','_blank');
 if(!popup){
  updateText('reportStatus','Allow pop-ups for ayflux.org to prepare the printable report.');
  return;
 }
 popup.document.write('<!doctype html><html><head><title>Preparing AyFlux report</title></head><body><p>Preparing print-ready charts…</p></body></html>');
 popup.document.close();
 const button=$('printResearchReport');button.disabled=true;
 updateText('reportStatus','Preparing print-ready chart images…');
 try{
  const snap=getSnapshot(),config=snap.config,sim=snap.results[snap.primary];
  await window.AyFluxCharts.ensure();
  const values=[
   ['Release','v0.25.0 (research preview)'],['Scenario',snap.primary],
   ['Medication schedule',config.dosingMode==='custom'?'Custom doses':'Repeating regimen'],
   ['Drug and route',config.dosingMode==='custom'?'See saved configuration':config.route],
   ['Dose (mg)',config.dosingMode==='custom'?'See custom schedule':config.dose],
   ['Dose interval (hours)',config.dosingMode==='custom'?'—':config.every],
   ['Scheduled doses',config.dosingMode==='custom'?config.customDoses.length:config.doseCount],
   ['Body weight (kg)',config.weight],
   ['Kidney function mode',config.renalMode==='profile'?'User-entered dynamic CrCl':'Constant CrCl'],
   ['Initial CrCl (mL/min)',config.renalMode==='profile'?config.renalProfile[0].crcl:config.crcl],
   ['CrCl time points (hour: mL/min)',config.renalMode==='profile'?
    config.renalProfile.map(p=>p.time+': '+p.crcl).join('; '):'Constant throughout'],
   ['Simulation horizon (hours)',config.horizon],
   ['Monte Carlo draws',config.draws],
   ['Model interval',Math.round(100*config.coverage)+'%'],
   ['Central volume multiplier',config.vcScale],
   ['Plasma clearance multiplier',config.clearanceScale]
  ];
  const metrics=[
   ['Peak plasma acyclovir (mg/L)',sim.summary.peak?.median],
   ['Plasma acyclovir AUC (mg·h/L)',sim.summary.auc?.median],
   ['Peak CSF acyclovir (mg/L)',sim.summary.csfPeak?.median],
   ['Peak plasma CMMG (mg/L)',sim.summary.mPeak?.median]
  ];
  let diagnostic='Not performed';
  try{
   const result=integrity.checkConvergence(pk,config,snap.primary);
   diagnostic='AUC step-size difference (0.25 vs 0.125 h): '+
    (100*result.aucRelativeDifference).toFixed(3)+'%. Mass-balance residual: '+
    (result.massBalanceErrorMg??0).toFixed(4)+' mg. Numerical checks do not validate clinical predictions.';
  }catch(error){diagnostic='Diagnostic unavailable: '+error.message;}
  const chartDefs=[
   ['plasma','Plasma acyclovir','#295f8b'],
   ['csf','CSF acyclovir','#168677'],
   ['cmmg','Plasma CMMG','#a65a2a']
  ];
  const charts=[];
  for(const [key,name,color] of chartDefs){
   const image=await renderReportChart(sim,key,name,color);
   charts.push({name,image});
  }
  const report=buildResearchReportHtml({
   date:new Date().toLocaleString(),scenario:snap.primary,
   values,metrics,charts,diagnostic
  });
  popup.document.open();popup.document.write(report);popup.document.close();
  // Do not invoke Print until every embedded image has decoded.
  await Promise.all(Array.from(popup.document.images,im=>
   im.decode?im.decode():new Promise((resolve,reject)=>{im.onload=resolve;im.onerror=reject;})
  ));
  if(popup.document.fonts?.ready)await popup.document.fonts.ready;
  popup.focus();
  popup.print();
  updateText('reportStatus','Print-ready report opened. Select Save as PDF; the chart page is kept intact.');
 }catch(error){
  popup.close();
  updateText('reportStatus','Unable to prepare research report: '+error.message);
 }finally{button.disabled=false;}
});
})();

