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
  updateText("heatmapStatus","49 deterministic model runs completed; changing other assumptions or the current dose schedule requires regenerating this table.");
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
$('printResearchReport').addEventListener("click",async ()=>{
 const popup=window.open("","_blank");
 if(!popup){updateText("reportStatus","Your browser blocked the print window. Allow popups for ayflux.org and retry.");return;}
 updateText("reportStatus","Preparing chart images and report…");
 try{
  const snap=getSnapshot(),config=snap.config,sim=snap.results[snap.primary];
  const values=[
   ["Release","v0.20.0 (research preview)"],["Scenario",snap.primary],["Dose route",config.route],["Dose (mg)",config.dose],
   ["Dose interval (hours)",config.every],["Dose administrations",config.doseCount],["Body mass (kg)",config.weight],
   ["Creatinine clearance (mL/min)",config.crcl],["Simulation horizon (hours)",config.horizon],
   ["Monte Carlo draws",config.draws],["Model interval fraction",config.coverage],
   ["Central volume multiplier",config.vcScale],["Plasma clearance multiplier",config.clearanceScale]
  ];
  const metrics=[["Peak plasma acyclovir (mg/L)",sim.summary.peak?.median],
   ["Plasma AUC (mg·h/L)",sim.summary.auc?.median],
   ["Peak CSF acyclovir (mg/L)",sim.summary.csfPeak?.median],
   ["Peak plasma CMMG (mg/L)",sim.summary.mPeak?.median]];
  const row=(label,value)=>"<tr><th>"+escapeHtml(label)+"</th><td>"+escapeHtml(value===undefined||value===null?"Not available":typeof value==="number"?Number(value.toPrecision(5)):value)+"</td></tr>";
  let diagnostic="Not performed";
  try{
   const result=integrity.checkConvergence(pk,config,snap.primary);
   diagnostic="AUC difference between 0.25 and 0.125 h steps: "+(100*result.aucRelativeDifference).toFixed(3)+"%; mass-balance residual: "+(result.massBalanceErrorMg??0).toFixed(4)+" mg";
  }catch(error){diagnostic="Not available: "+error.message;}
  let chartImage="";
  try{
    const chart=$('plasmaChart');
    if(chart?.data&&typeof Plotly.toImage==="function")chartImage=await Plotly.toImage(chart,{format:"png",width:950,height:430,scale:1});
  }catch(_){}
  const chart=chartImage?'<h2>Plasma concentration chart</h2><img src="'+chartImage+'" alt="AyFlux plasma concentration model plot" style="max-width:100%;height:auto">':'<p>Plasma chart image was not available. Refer to tabular results and CSV exports.</p>';
  const report='<!doctype html><html lang="en"><head><meta charset="utf-8"><title>AyFlux research report</title><style>'+
  '@page{size:A4;margin:17mm}body{font:12px/1.55 Arial,sans-serif;color:#263e52}h1{font-size:23px;color:#28485e;border-bottom:3px solid #829dad;padding-bottom:8px}h2{font-size:15px;color:#28485e;margin:20px 0 8px}table{border-collapse:collapse;width:100%;margin:8px 0}th,td{border:1px solid #adbfca;padding:6px 9px;text-align:left}th{width:55%;background:#edf2f5}.note{background:#fdf6e5;border-left:3px solid #a79851;padding:9px}.sources{font-size:10px;word-break:break-word}.meta{color:#5a6b77}img{display:block;margin:8px 0}'+
  '</style></head><body><h1>AyFlux — educational PK research report</h1>'+
  '<p class="meta">Generated '+escapeHtml(new Date().toLocaleString())+' · AyFlux v0.20.0 · Configuration schema 2</p>'+
  '<p class="note"><strong>EDUCATIONAL USE ONLY.</strong> This report contains simulated, non-validated concentration estimates. It must not determine medication dosing, diagnosis, toxicity assessment, dialysis prescription, or patient care.</p>'+
  '<h2>Simulation assumptions</h2><table>'+values.map(r=>row(...r)).join('')+'</table>'+
  '<h2>Model summary (medians)</h2><table>'+metrics.map(r=>row(...r)).join('')+'</table>'+
  chart+
  '<h2>Numerical diagnostics</h2><p>'+escapeHtml(diagnostic)+'</p>'+
  '<h2>Limitations and references</h2><p>Predictions depend on assumed pharmacokinetic distributions, kidney function, drug administration and dialysis transport. Monte Carlo intervals do not establish prospective clinical coverage. A matched clinical validation of these specific scenarios has not been performed.</p>'+
  '<p class="sources">Software/source: https://github.com/khalilm3264/acyclovirpksim · License AGPL-3.0-only · Study references: https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=889bccd1-3793-40ce-bca2-c8c9cf6b7488 and https://pubmed.ncbi.nlm.nih.gov/7075109/</p>'+
  '</body></html>';
  popup.document.open();popup.document.write(report);popup.document.close();
  await new Promise(resolve=>setTimeout(resolve,250));
  popup.focus();popup.print();
  updateText("reportStatus","Report opened for printing. Select 'Save as PDF' in the print destination.");
 }catch(error){popup.close();updateText("reportStatus","Unable to prepare report: "+error.message);}
});
})();
