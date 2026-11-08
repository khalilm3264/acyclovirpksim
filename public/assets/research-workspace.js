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
function renderExternal(){
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
 const unitName=key==="plasma"?"Plasma acyclovir":key==="csf"?"CSF acyclovir":key==="cmmg"?"Plasma CMMG":"CSF CMMG";
 const layout={
  margin:{l:69,r:16,t:38,b:52},paper_bgcolor:"#fff",plot_bgcolor:"#fff",showlegend:true,
  title:{text:unitName+" — modeled curve comparison",font:{size:14}},
  xaxis:{title:"Time since simulation start (hours)"},yaxis:{title:"Concentration (mg/L)"}
 };
 $('ospPlot').classList.remove("hidden");$('ospDifference').classList.remove("hidden");
 Plotly.react('ospPlot',[
  {x:model.time,y:model.concentration,mode:"lines",type:"scatter",name:"AyFlux median",line:{color:"#0054e9",width:2}},
  {x:raw.time,y:raw.concentration,mode:"lines",type:"scatter",name:"Imported model",line:{color:"#b45a24",width:2,dash:"dash"}}
 ],layout,{responsive:true,displaylogo:false});
 Plotly.react('ospDifference',[{
   x:difference.points.map(p=>p.time),y:difference.points.map(p=>p.difference),
   mode:"lines",type:"scatter",name:"AyFlux − import",line:{color:"#396e74",width:2}
  }],{...layout,showlegend:false,title:{text:"Curve difference: AyFlux minus imported (mg/L)",font:{size:14}},yaxis:{title:"Difference (mg/L)"}},{responsive:true,displaylogo:false});
 const fix=v=>v.toPrecision(4);
 updateText("ospMetrics",difference.points.length+" overlapping samples · RMSE "+fix(difference.rmse)+" mg/L · MAE "+fix(difference.mae)+" mg/L · mean bias "+fix(difference.bias)+" mg/L. These are curve-to-curve discrepancies, not a clinical goodness-of-fit assessment.");
 updateText("ospStatus","Compared with AyFlux "+snapshot.primary+". Re-run comparison if the model settings change.");
 lastExternal={time:raw.time,concentration:raw.concentration,unitName,metrics:difference};
}
$('ospCompare').addEventListener("click",()=>{
 try{renderExternal();}catch(error){updateText("ospStatus","Comparison error: "+error.message);}
});
$('ospClear').addEventListener("click",()=>{
 $('ospFile').value="";externalTable=null;lastExternal=null;
 for(const id of ["ospPlot","ospDifference"]){const el=$(id);try{if(el&&el.data)Plotly.purge(el);}catch(_){}el.classList.add("hidden");}
 updateText("ospMetrics","");updateText("ospStatus","Import cleared; no file data were uploaded.");
});
window.addEventListener("ayflux:results-updated",()=>{
 if(lastExternal)updateText("ospStatus","AyFlux simulation changed. Click Compare curves to refresh the overlay.");
});
const pause=()=>new Promise(resolve=>setTimeout(resolve,0));
// Only users who open the heatmap download the larger Cartesian trace bundle.
let cartesianPromise=null;
function loadCartesianForHeatmap(){
 if(cartesianPromise)return cartesianPromise;
 cartesianPromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src='/assets/vendor/plotly-cartesian-3.3.1.min.js';
  script.async=true;
  script.onload=()=>resolve(window.Plotly);
  script.onerror=()=>reject(new Error('Optional heatmap bundle could not be loaded'));
  document.head.append(script);
 }).catch(error=>{cartesianPromise=null;throw error;});
 return cartesianPromise;
}
$('runHeatmap').addEventListener("click",async ()=>{
 const button=$('runHeatmap');button.disabled=true;
 try{
  const snapshot=getSnapshot();
  const config={...snapshot.config,crclSource:"manual",draws:1,variability:0,horizon:Math.min(96,snapshot.config.horizon)};
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
    const shade=Math.round(244-110*pct);
    td.style.backgroundColor="rgb("+shade+","+Math.round(248-72*pct)+","+Math.round(250-48*pct)+")";
    td.style.color="#203c50";td.textContent=value.toFixed(value>=100?0:2);
    td.title="HD "+yValues[j]+" mL/min; CrCl "+xValues[i]+" mL/min";
    tr.append(td);
   });
   tbody.append(tr);
  });
  table.append(tbody);
  $('heatmapArea').replaceChildren(table);
  const label=metric==='auc'?'Plasma acyclovir AUC (mg·h/L)':'Peak plasma acyclovir (mg/L)';
  try{
   const renderer=await loadCartesianForHeatmap();
   const target=$('heatmapPlot');
   target.classList.remove('hidden');
   await renderer.react(target,[{
    type:'heatmap',x:xValues,y:yValues,z:values,
    colorscale:[[0,'#edf3f6'],[0.33,'#b5d0df'],[0.66,'#6598b5'],[1,'#2b5f82']],
    hovertemplate:'CrCl %{x} mL/min<br>HD clearance %{y} mL/min<br>'+label+': %{z:.3f}<extra></extra>',
    colorbar:{title:{text:metric==='auc'?'mg·h/L':'mg/L',side:'right'},thickness:15},
    xgap:2,ygap:2
   }],{
    margin:{l:74,r:68,t:32,b:70},paper_bgcolor:'#fff',plot_bgcolor:'#fff',
    xaxis:{title:'Residual CrCl (mL/min)',tickmode:'array',tickvals:xValues},
    yaxis:{title:'HD clearance (mL/min)',tickmode:'array',tickvals:yValues},
    font:{color:'#28485e',size:11}
   },{responsive:true,displaylogo:false});
   $('heatmapArea').parentElement.open=false;
   updateText('heatmapStatus','Interactive Cartesian heatmap ready (49 deterministic simulations). Hover for values; expand the numeric table for accessible data.');
  }catch(error){
   $('heatmapPlot').classList.add('hidden');
   $('heatmapArea').parentElement.open=true;
   updateText('heatmapStatus','49 simulations completed. Interactive plot unavailable; numeric table shown. '+error.message);
  }
 }catch(error){updateText("heatmapStatus","Unable to produce heatmap: "+error.message);}
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
  await Plotly.newPlot(target,[
   {x:time,y:series.lower,mode:'lines',type:'scatter',line:{width:0},
    hoverinfo:'skip',showlegend:false},
   {x:time,y:series.upper,mode:'lines',type:'scatter',line:{width:0},
    fill:'tonexty',fillcolor:'rgba(46,96,132,0.14)',hoverinfo:'skip',
    name:'Model interval',showlegend:true},
   {x:time,y:series.median,mode:'lines',type:'scatter',
    name:'Model median',line:{color,width:2.5}}
  ],{
   width:960,height:270,autosize:false,
   margin:{l:72,r:23,t:30,b:54},
   title:{text:label,font:{size:15,color:'#28485e'}},
   xaxis:{title:'Time (hours)',color:'#34586c',tickfont:{size:11}},
   yaxis:{title:'Concentration (mg/L)',color:'#34586c',rangemode:'tozero'},
   font:{family:'Arial, sans-serif',color:'#28485e'},
   paper_bgcolor:'#ffffff',plot_bgcolor:'#ffffff',
   legend:{orientation:'h',x:0.4,y:-0.29,font:{size:10}}
  },{staticPlot:true,displayModeBar:false,responsive:false});
  return await Plotly.toImage(target,{format:'png',width:960,height:270,scale:1.5});
 }finally{
  try{Plotly.purge(target);}catch(_){}
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
  '<p class="meta">Generated '+escapeHtml(date)+' · AyFlux '+escapeHtml(window.AyFluxVersion?.version||'0.21.0')+
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
  const values=[
   ['Release','v0.21.0 (research preview)'],['Scenario',snap.primary],
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
