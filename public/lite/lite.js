/*
 * AyFlux Lite — v2-style controls, canonical AyFlux PK model and chart fallback.
 * Copyright (C) 2026 Muhammad Khalil. SPDX-License-Identifier: AGPL-3.0-only
 * Deterministic educational simulator, not clinical validation.
 */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root&&root.document){
  const run=()=>api.mount(root.document,root.RenalPKV7);
  if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",run,{once:true});
  else run();
 }
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const MODES=Object.freeze([
  {id:"none",mode:"No dialysis",label:"No dialysis",pdMethod:"manual",color:"#8a959f",dash:[]},
  {id:"hd",mode:"Intermittent HD",label:"Hemodialysis",pdMethod:"manual",color:"#d9523e",dash:[7,4]},
  {id:"capd",mode:"Peritoneal dialysis",label:"CAPD",pdMethod:"manual",color:"#07856d",dash:[3,4]},
  {id:"apd",mode:"Peritoneal dialysis",label:"APD",pdMethod:"cycler",color:"#b48630",dash:[7,3,2,3]},
  {id:"crrt",mode:"CRRT",label:"CRRT",pdMethod:"manual",color:"#376dbc",dash:[]}
 ]);
 // These are exploration bounds, not approved clinical doses or prescriptions.
 const INPUT_LIMITS=Object.freeze({
  weight:[30,150],crcl:[0,120],dose:[0,6000],every:[8,48],horizon:[24,168],
  hdStart:[0,72],hdDuration:[2,8],hdRepeat:[24,72],hdCl:[30,180],
  effluent:[0,50],pdVolume:[1,3]
 });
 const DEFAULT_INPUTS=Object.freeze({
  route:"Acyclovir IV",weight:70,crcl:5,dose:350,every:24,horizon:96,
  hdStart:24,hdDuration:4,hdRepeat:48,hdCl:81.8,effluent:25,pdVolume:2
 });
 const SERIES=Object.freeze({
  plasma:{title:"Plasma acyclovir",unit:"mg/L"},
  cmmg:{title:"Plasma CMMG",unit:"mg/L"},
  clearance:{title:"Total acyclovir clearance",unit:"mL/min"},
  dialRate:{title:"Drug transfer to dialysis",unit:"mg/h"}
 });
 function fixedConfiguration(engine,overrides={}){
  if(!engine||!engine.DEFAULTS)throw Error("AyFlux model is unavailable.");
  for(const key of Object.keys(overrides)){
   if(key==="route"){
    if(!["Acyclovir IV","Valacyclovir oral"].includes(overrides.route))throw Error("Unknown medication route.");
   }else if(Object.hasOwn(INPUT_LIMITS,key)){
    const number=overrides[key],bounds=INPUT_LIMITS[key];
    if(!Number.isFinite(number)||number<bounds[0]||number>bounds[1]){
     throw Error(key+" must be between "+bounds[0]+" and "+bounds[1]+".");
    }
   }else throw Error("Unsupported Lite input: "+key);
  }
  const i={...DEFAULT_INPUTS,...overrides};
  if(i.route==="Acyclovir IV"&&i.dose>2000)throw Error("IV demonstration dose must not exceed 2000 mg.");
  if(i.hdDuration>i.hdRepeat)throw Error("HD session duration must be shorter than its repeat interval.");
  const n=Math.floor((i.horizon-1e-9)/i.every)+1;
  return {...engine.DEFAULTS,
   ...i,
   crclSource:"manual",renalMode:"constant",
   dosingMode:"repeat",doseCount:n,infusion:1,
   variability:0,draws:1,coverage:0.9,
   pdRxEnabled:false,pdMethod:"manual",
   capdDwell:6,capdExchanges:4,
   apdStart:20,apdHours:10,apdCycles:5,apdDwell:1.5,apdTurnover:.25,
   sieving:.95,delivered:.85
  };
 }
 function compute(engine,overrides={}){
  if(!engine||typeof engine.simulate!=="function")throw Error("AyFlux PK engine is unavailable.");
  const cfg=fixedConfiguration(engine,overrides);
  return MODES.map(meta=>{
   const selected={...cfg,pdMethod:meta.pdMethod};
   const result=engine.simulate(selected,meta.mode);
   const time=result.time;
   if(!Array.isArray(time)||time.length<2||time.at(-1)<cfg.horizon-1e-6)
    throw Error(meta.label+": incomplete model time axis");
   const out={...meta,time,rows:result.rows,summary:{
    peak:result.summary.peak.median,auc:result.summary.auc.median,
    cmmgPeak:result.summary.mPeak.median,mass:result.summary.mass.median
   }};
   for(const key of Object.keys(SERIES)){
    const values=result[key]?.median;
    if(!Array.isArray(values)||values.length!==time.length||
       values.some(v=>!Number.isFinite(v)))throw Error(meta.label+": invalid "+key+" values");
    out[key]=values;
   }
   return out;
  });
 }
 function ticks(max){
  if(!(max>0))return {max:1,step:.25};
  const rough=max/4,scale=Math.pow(10,Math.floor(Math.log10(rough)));
  const scaled=rough/scale;
  const step=(scaled<=1?1:scaled<=2?2:scaled<=2.5?2.5:scaled<=5?5:10)*scale;
  return {max:Math.ceil(max/step)*step,step};
 }
 function tickLabel(v){
  if(v===0)return "0";
  if(Math.abs(v)>=100)return v.toFixed(0);
  if(Math.abs(v)>=10)return v.toFixed(1).replace(/\.0$/,"");
  if(Math.abs(v)>=1)return v.toFixed(2).replace(/\.?0+$/,"");
  return v.toFixed(3).replace(/\.?0+$/,"");
 }
 function closest(time,hour){
  let lo=0,hi=time.length-1;
  while(lo<hi){const mid=(lo+hi)>>1;if(time[mid]<hour)lo=mid+1;else hi=mid;}
  if(lo>0&&Math.abs(time[lo-1]-hour)<Math.abs(time[lo]-hour))return lo-1;
  return lo;
 }
 function draw(canvas,scenarios,key,horizon,highlight,shown,hoverHour=null){
  if(!canvas||typeof canvas.getContext!=="function")return;
  const ctx=canvas.getContext("2d");if(!ctx)return;
  const rect=canvas.getBoundingClientRect(),width=Math.max(280,rect.width||700);
  const height=Math.max(210,rect.height||290),scale=Math.min(2,window.devicePixelRatio||1);
  if(canvas.width!==Math.round(width*scale)||canvas.height!==Math.round(height*scale)){
   canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);
  }
  ctx.setTransform(scale,0,0,scale,0,0);
  ctx.clearRect(0,0,width,height);
  const left=53,right=15,top=14,bottom=40,plotW=width-left-right,plotH=height-top-bottom;
  const selected=scenarios.filter(s=>shown.has(s.id));
  const observed=selected.reduce((max,s)=>Math.max(max,...s[key].filter(Number.isFinite)),0);
  const y=ticks(observed*1.06);
  const px=t=>left+plotW*t/horizon,py=v=>top+plotH-plotH*v/y.max;
  ctx.font='11px system-ui,"Segoe UI",sans-serif';
  ctx.strokeStyle="#dce6eb";ctx.lineWidth=1;ctx.setLineDash([]);
  const steps=Math.round(y.max/y.step);
  for(let i=0;i<=steps;i++){
   const value=i*y.step;
   ctx.beginPath();ctx.moveTo(left,py(value));ctx.lineTo(left+plotW,py(value));ctx.stroke();
   ctx.textAlign="right";ctx.textBaseline="middle";ctx.fillStyle="#526f7c";ctx.fillText(tickLabel(value),left-7,py(value));
  }
  const every=horizon<=48?12:horizon<=96?24:48;
  for(let t=0;t<=horizon;t+=every){
   const x=px(t);ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,top+plotH);ctx.stroke();
   ctx.textAlign="center";ctx.textBaseline="top";ctx.fillText(String(t),x,top+plotH+8);
  }
  if(horizon%every!==0){
   ctx.textAlign="right";ctx.fillText(String(horizon),left+plotW,top+plotH+8);
  }
  ctx.textAlign="center";ctx.textBaseline="alphabetic";
  ctx.fillStyle="#3e6276";ctx.fillText("Time (hours)",left+plotW/2,height-6);
  ctx.save();ctx.translate(14,top+plotH/2);ctx.rotate(-Math.PI/2);
  ctx.fillText(SERIES[key].unit,0,0);ctx.restore();
  ctx.save();ctx.beginPath();ctx.rect(left,top,plotW,plotH);ctx.clip();
  for(const s of selected){
   ctx.beginPath();ctx.strokeStyle=s.color;ctx.lineWidth=s.id===highlight?3.2:2.1;
   ctx.setLineDash(s.dash);
   for(let i=0;i<s.time.length;i++){
    const x=px(s.time[i]),value=s[key][i],pointY=py(value);
    if(i===0)ctx.moveTo(x,pointY);else ctx.lineTo(x,pointY);
   }
   ctx.stroke();
  }
  ctx.setLineDash([]);
  if(Number.isFinite(hoverHour)){
   const x=px(hoverHour);
   ctx.strokeStyle="#667f8c";ctx.lineWidth=1;
   ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,top+plotH);ctx.stroke();
   for(const s of selected){
    const idx=closest(s.time,hoverHour);
    ctx.beginPath();ctx.arc(px(s.time[idx]),py(s[key][idx]),3,0,Math.PI*2);
    ctx.fillStyle=s.color;ctx.fill();
   }
  }
  ctx.restore();
 }
 function formatNumber(value,digits=1){return Number.isFinite(value)?value.toFixed(digits):"—";}
 function csvEscape(value){
  const s=String(value);
  return /[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;
 }
 function exportCSV(scenarios){
  const headers=["time_hours","scenario","plasma_acyclovir_mg_L","plasma_cmmg_mg_L","total_acyclovir_clearance_mL_min","dialytic_transfer_mg_h"];
  const lines=[headers.join(",")];
  for(const s of scenarios){
   for(let i=0;i<s.time.length;i++){
    lines.push([s.time[i],csvEscape(s.label),s.plasma[i],s.cmmg[i],s.clearance[i],s.dialRate[i]].join(","));
   }
  }
  return lines.join("\r\n")+"\r\n";
 }
 function mount(document,engine){
  const $=id=>document.getElementById(id);
  const form=$("liteControls"),table=$("liteResults"),status=$("liteStatus"),hover=$("liteHover");
  const plots={plasma:$("acvChart"),cmmg:$("cmmgChart"),clearance:$("clearChart")};
  if(!form||!table||!status||!plots.plasma||!plots.cmmg)return;
  const visibility=new Set(MODES.map(m=>m.id));
  let scenarios=[],config=null,active="hd",hoverHour=null,hoverKey="plasma",pending=null,frame=0;
  const fields=Object.keys(DEFAULT_INPUTS);
  const inputs=Object.fromEntries(fields.map(key=>[key,$("lite_"+key)]));
  function readValues(){
   const o={};
   for(const key of fields){
    const element=inputs[key];
    if(!element)throw Error("Missing control "+key);
    if(key==="route"){o[key]=element.value;continue;}
    const num=element.valueAsNumber;
    if(element.value.trim()===""||!Number.isFinite(num))throw Error("Enter a valid "+key+".");
    o[key]=num;
   }
   return o;
  }
  function updateOutputs(){
   for(const key of fields){
    const output=$("out_"+key);
    if(output)output.textContent=inputs[key].value;
   }
  }
  function updateStats(){
   const selected=scenarios.find(s=>s.id===active);
   if(!selected)return;
   for(const [key,value,digits] of [["peak",selected.summary.peak,1],["auc",selected.summary.auc,0],["cmmgPeak",selected.summary.cmmgPeak,1],["mass",selected.summary.mass,0]]){
    const el=$("stat_"+key);
    if(el)el.textContent=formatNumber(value,digits);
   }
  }
  function updateTable(){
   table.replaceChildren();
   for(const s of scenarios){
    const tr=document.createElement("tr");
    const values=[s.label,formatNumber(s.summary.peak,1),formatNumber(s.summary.auc,0),formatNumber(s.summary.cmmgPeak,1),formatNumber(s.summary.mass,0)];
    values.forEach((value,index)=>{
     const cell=document.createElement(index===0?"th":"td");
     if(index===0)cell.setAttribute("scope","row");else cell.className="numeric";
     cell.textContent=value;tr.appendChild(cell);
    });
    table.appendChild(tr);
   }
  }
  const charts=window.AyFluxCharts, rendered=new Map();
  let interactive=false;
  charts.ensure().then(()=>{interactive=true;requestPaint();}).catch(()=>{/* Use native canvas offline. */});
  function paintChart(key){
   const el=plots[key];
   if(!interactive){draw(el.querySelector('canvas'),scenarios,key,config.horizon,active,visibility,hoverHour);return;}
   const selected=scenarios.filter(s=>visibility.has(s.id)), selection=active+' '+selected.map(s=>s.id).join(' ');
   const prior=rendered.get(key);
   if(prior?.scenarios!==scenarios||prior.selection!==selection){
    el.querySelector(':scope > canvas')?.remove();
    const series=selected.map(s=>charts.line(s.label,s.time,s[key],s.color,s.id===active?3.2:2.1,s.dash.length?s.dash:'solid'));
    const option=charts.options(series,'Time (hours)',SERIES[key].unit);
    option.legend.show=false;option.toolbox.show=false;option.tooltip.showContent=false;
    option.grid={left:53,right:15,top:14,bottom:48};option.xAxis.max=config.horizon;
    charts.draw(el,option);rendered.set(key,{scenarios,selection});
   }
   const chart=window.echarts.getInstanceByDom(el);
   if(Number.isFinite(hoverHour))chart.dispatchAction({type:'showTip',seriesIndex:0,dataIndex:closest(selected[0].time,hoverHour)});
   else chart.dispatchAction({type:'hideTip'});
  }
  function paint(){
   if(!scenarios.length||!config)return;
   paintChart("plasma");
   paintChart("cmmg");
   const clearance=$("clearanceDetails");
   if(clearance?.open)paintChart("clearance");
   if(hover&&Number.isFinite(hoverHour)){
    const rows=scenarios.filter(s=>visibility.has(s.id)).map(s=>{
      const i=closest(s.time,hoverHour);
      return s.label+" "+formatNumber(s[hoverKey][i],2)+" "+SERIES[hoverKey].unit;
    });
    hover.textContent=formatNumber(hoverHour,1)+" h · "+rows.join(" · ");
   }else if(hover)hover.textContent="Move over the charts to inspect values.";
  }
  function requestPaint(){if(frame)return;frame=requestAnimationFrame(()=>{frame=0;paint();});}
  function update(){
   pending=null;updateOutputs();
   try{
    const values=readValues(),start=performance.now();
    const nextConfig=fixedConfiguration(engine,values);
    const next=compute(engine,values);
    scenarios=next;config=nextConfig;
    updateStats();updateTable();requestPaint();
    const label=$("liteDosingNote");
    if(label)label.textContent=nextConfig.doseCount+" illustrative "+(nextConfig.route==="Acyclovir IV"?"IV":"oral")+" administrations within "+nextConfig.horizon+" hours.";
    status.textContent="Updated "+scenarios.length+" scenarios in "+Math.round(performance.now()-start)+" ms. Deterministic educational model.";
   }catch(error){status.textContent="Input error: "+error.message+" Last valid curves remain visible.";}
  }
  function schedule(){
   updateOutputs();clearTimeout(pending);pending=setTimeout(update,180);
  }
  for(const key of fields){
   if(key==="route")continue; // the separate change handler updates dose first
   const element=inputs[key];
   if(!element)continue;
   element.addEventListener("input",schedule);
   element.addEventListener("change",()=>{clearTimeout(pending);update();});
  }
  const route=inputs.route;
  if(route)route.addEventListener("change",()=>{
   const dose=inputs.dose;
   if(!dose)return;
   dose.max=route.value==="Valacyclovir oral"?"6000":"2000";
   dose.step=route.value==="Valacyclovir oral"?"100":"25";
   dose.value=route.value==="Valacyclovir oral"?"1000":"350";
   clearTimeout(pending);update();
  });
  const highlight=$("liteHighlight");
  if(highlight)highlight.addEventListener("change",()=>{active=highlight.value;updateStats();requestPaint();});
  for(const checkbox of document.querySelectorAll("[data-lite-mode]")){
   checkbox.addEventListener("change",()=>{
    if(checkbox.checked)visibility.add(checkbox.dataset.liteMode);
    else if(visibility.size>1)visibility.delete(checkbox.dataset.liteMode);
    else checkbox.checked=true;
    requestPaint();
   });
  }
  function trackHover(event,canvas,key){
   const r=canvas.getBoundingClientRect(),left=53,right=15;
   const x=event.clientX-r.left,available=Math.max(1,r.width-left-right);
   hoverHour=Math.min(config.horizon,Math.max(0,(x-left)/available*config.horizon));
   hoverKey=key;
   requestPaint();
  }
  for(const [key,canvas] of Object.entries(plots)){
   if(!canvas)continue;
   canvas.addEventListener("pointermove",event=>{if(config)trackHover(event,canvas,key);});
   canvas.addEventListener("pointerleave",()=>{hoverHour=null;requestPaint();});
  }
  $("clearanceDetails")?.addEventListener("toggle",requestPaint);
  $("liteReset")?.addEventListener("click",()=>{
   for(const [key,value] of Object.entries(DEFAULT_INPUTS)){if(inputs[key])inputs[key].value=String(value);}
   inputs.dose.max="2000";inputs.dose.step="25";
   update();
  });
  $("liteExport")?.addEventListener("click",()=>{
   if(!scenarios.length)return;
   const blob=new Blob([exportCSV(scenarios)],{type:"text/csv;charset=utf-8"});
   const url=URL.createObjectURL(blob),link=document.createElement("a");
   link.href=url;link.download="ayflux_lite_scenarios.csv";
   link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  window.addEventListener("resize",requestPaint,{passive:true});
  update();
 }
 return {MODES,DEFAULT_INPUTS,INPUT_LIMITS,fixedConfiguration,compute,draw,ticks,closest,exportCSV,mount};
});