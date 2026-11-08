/*
 * AyFlux Lite: fixed educational dialysis scenarios over the canonical PK engine.
 * Copyright (C) 2026 Muhammad Khalil
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * Native Canvas rendering. No Plotly, worker, saved inputs, analytics or API calls.
 * Nominal model, no Monte Carlo, just three educational inputs; not clinical validation.
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
  {mode:"No dialysis",label:"No dialysis",color:"#8a959f",dash:[]},
  {mode:"Intermittent HD",label:"Intermittent HD",color:"#d9523e",dash:[7,4]},
  {mode:"Peritoneal dialysis",label:"Peritoneal dialysis",color:"#07856d",dash:[2,4]},
  {mode:"CRRT",label:"CRRT",color:"#376dbc",dash:[9,3,2,3]}
 ]);
 const INPUT_LIMITS=Object.freeze({weight:[30,150],crcl:[0,120],dose:[0,1500]});
 function fixedConfiguration(engine,inputs={}){
  for(const [key,limits] of Object.entries(INPUT_LIMITS)){
   const value=inputs[key];
   if(value!==undefined&&(!Number.isFinite(value)||value<limits[0]||value>limits[1]))
    throw Error(key+" must be between "+limits[0]+" and "+limits[1]+".");
  }
  if(Object.keys(inputs).some(key=>!Object.hasOwn(INPUT_LIMITS,key)))throw Error("Unsupported Lite input.");
  // All parameters below are illustrative inputs, NOT suggested medical therapy.
  return {...engine.DEFAULTS,
   weight:70,crclSource:"manual",crcl:0,renalMode:"constant",
   route:"Acyclovir IV",dosingMode:"repeat",
   dose:700,infusion:1,every:24,doseCount:1,horizon:48,
   variability:0,draws:1,coverage:0.9,
   hdStart:8,hdDuration:4,hdRepeat:48,hdCl:81.8,
   pdMethod:"manual",pdRxEnabled:false,
   capdDwell:6,capdExchanges:4,pdVolume:2,
   effluent:25,sieving:0.95,delivered:0.85,
   ...inputs
  };
 }
 function compute(engine,inputs={}){
  if(!engine||typeof engine.simulate!=="function")throw Error("AyFlux PK engine is unavailable.");
  const config=fixedConfiguration(engine,inputs);
  return MODES.map(meta=>{
   const result=engine.simulate(config,meta.mode);
   const series=(key)=>result[key]?.median;
   if(!result.time?.length||!["plasma","cmmg"].every(key=>series(key)?.length===result.time.length)){
    throw Error("Incomplete model results for "+meta.label);
   }
   for(const key of ["plasma","cmmg"]){
    if(series(key).some(v=>!Number.isFinite(v)||v<0))throw Error("Invalid "+key+" model concentrations.");
   }
   return {...meta,time:result.time,plasma:series("plasma"),cmmg:series("cmmg"),
    peak:result.summary.peak.median,
    auc:result.summary.auc.median,
    cmmgPeak:result.summary.mPeak.median};
  });
 }
 function ticks(max){
  if(!(max>0))return {max:1,step:.25};
  const rough=max/4,mag=Math.pow(10,Math.floor(Math.log10(rough)));
  const n=rough/mag;
  const step=(n<=1?1:n<=2?2:n<=2.5?2.5:n<=5?5:10)*mag;
  return {max:Math.ceil(max/step)*step,step};
 }
 function draw(canvas,scenarios,key){
  if(!canvas||typeof canvas.getContext!=="function")return;
  const ctx=canvas.getContext("2d");if(!ctx)return;
  const box=canvas.getBoundingClientRect();
  const width=Math.max(280,box.width||700),height=Math.max(220,box.height||275);
  const ratio=Math.min(2,window.devicePixelRatio||1);
  canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
  ctx.setTransform(ratio,0,0,ratio,0,0);
  ctx.clearRect(0,0,width,height);
  const left=52,right=14,top=14,bottom=39;
  const w=width-left-right,h=height-top-bottom;
  const maxObserved=Math.max(...scenarios.flatMap(s=>s[key]));
  const yTicks=ticks(maxObserved*1.04);
  const px=t=>left+w*t/48,py=v=>top+h-h*v/yTicks.max;
  ctx.font='11px system-ui,"Segoe UI",sans-serif';ctx.fillStyle="#496579";
  ctx.lineWidth=1;ctx.strokeStyle="#dae5ec";ctx.setLineDash([]);
  for(let i=0;i<=Math.ceil(yTicks.max/yTicks.step);i++){
   const v=i*yTicks.step;if(v>yTicks.max+1e-10)break;
   const y=py(v);ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(left+w,y);ctx.stroke();
   ctx.textAlign="right";ctx.textBaseline="middle";ctx.fillText(v<1?v.toFixed(2):v<10?v.toFixed(1):v.toFixed(0),left-8,y);
  }
  for(const hour of [0,12,24,36,48]){
   const x=px(hour);ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,top+h);ctx.stroke();
   ctx.textAlign="center";ctx.textBaseline="top";ctx.fillText(String(hour),x,top+h+8);
  }
  ctx.fillStyle="#36576b";ctx.textAlign="center";ctx.fillText("Time (hours)",left+w/2,height-8);
  ctx.save();ctx.translate(14,top+h/2);ctx.rotate(-Math.PI/2);ctx.textAlign="center";
  ctx.fillText("mg/L",0,0);ctx.restore();
  for(const s of scenarios){
   ctx.beginPath();ctx.strokeStyle=s.color;ctx.lineWidth=2.5;
   ctx.setLineDash(s.dash);
   for(let i=0;i<s.time.length;i++){
    const x=px(s.time[i]),y=py(s[key][i]);
    if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
   }
   ctx.stroke();
  }
  ctx.setLineDash([]);
 }
 function mount(document,engine){
  const status=document.getElementById("liteStatus");
  const resultsBody=document.getElementById("liteResults");
  const canvases=[document.getElementById("acvChart"),document.getElementById("cmmgChart")];
  const controls={weight:document.getElementById("liteWeight"),crcl:document.getElementById("liteCrcl"),dose:document.getElementById("liteDose")};
  const assumptionText=document.getElementById("liteAssumptions");
  if(!status||!resultsBody||canvases.some(x=>!x)||Object.values(controls).some(x=>!x))return;
  let results=[],refreshTimer=0,frame=0;
  const repaint=()=>{
   if(!results.length)return;
   draw(canvases[0],results,"plasma");
   draw(canvases[1],results,"cmmg");
  };
  function readInputs(){
   const values={};
   for(const [key,element] of Object.entries(controls)){
    const value=element.valueAsNumber;
    if(element.value.trim()===""||!Number.isFinite(value))throw Error("Enter a valid "+key+".");
    values[key]=value;
   }
   return values;
  }
  function update(){
   try{
    const inputs=readInputs();
    const next=compute(engine,inputs);
    results=next;
    resultsBody.replaceChildren();
    for(const r of results){
     const tr=document.createElement("tr");
     const cells=[r.label,r.peak.toFixed(2),r.auc.toFixed(1),r.cmmgPeak.toFixed(2)];
     cells.forEach((val,i)=>{
      const cell=document.createElement(i===0?"th":"td");
      if(i===0)cell.setAttribute("scope","row");else cell.className="num";
      cell.textContent=val;tr.appendChild(cell);
     });
     resultsBody.appendChild(tr);
    }
    if(assumptionText)assumptionText.textContent=inputs.weight+" kg, residual creatinine clearance "+inputs.crcl+" mL/min, one "+inputs.dose+" mg IV acyclovir infusion";
    repaint();
    status.textContent="Updated locally using the AyFlux nominal PK engine. Fixed dialysis schedules; no uploads.";
   }catch(error){
    status.textContent="Check inputs: "+error.message+" Previous valid curves are retained.";
   }
  }
  for(const input of Object.values(controls)){
   input.addEventListener("input",()=>{
    clearTimeout(refreshTimer);
    refreshTimer=setTimeout(update,160);
   });
   input.addEventListener("change",()=>{clearTimeout(refreshTimer);update();});
  }
  window.addEventListener("resize",()=>{
   if(frame)cancelAnimationFrame(frame);
   frame=requestAnimationFrame(()=>{frame=0;repaint();});
  },{passive:true});
  update();
 }

 return {MODES,fixedConfiguration,compute,ticks,mount};
});
