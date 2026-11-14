/* SPDX-License-Identifier: AGPL-3.0-only */
(function(){
 'use strict';
 const E=window.RenalPKV7,S=window.AyFluxStudies,C=window.AyFluxCharts;
 const $=id=>document.getElementById(id),format=x=>Number(x).toFixed(3);
 let study,run,config,exchanges=[];
 const query=new URLSearchParams(location.search);
 if(['boelaert-1','boelaert-4','boelaert-5'].includes(query.get('patient'))) $('patient').value=query.get('patient');
 const end=Number(query.get('end'));
 if(query.has('end')&&Number.isFinite(end)&&end>=1&&end<=120) $('horizon').value=end;
 function row(values){
  const tr=document.createElement('tr');
  for(const value of values){const td=document.createElement('td');td.textContent=value;tr.append(td);}
  return tr;
 }
 function highlight(){
  const chart=window.echarts?.getInstanceByDom($('chart'));
  if(!chart)return;
  const exchange=exchanges[Number($('exchange').value)];
  const point=S.pointsOf(study)[Number($('sample').value)];
  const time=point?point.time+Number($('shift').value):null;
  chart.setOption({series:[{markArea:{silent:true,itemStyle:{color:'rgba(0,114,178,0.10)'},data:exchange?[[{xAxis:exchange.start},{xAxis:exchange.end}]]:[]},
   markLine:{silent:true,symbol:'none',data:time!==null&&time>=0&&time<=config.horizon?[{xAxis:time,label:{formatter:'Hypothetical sample'}}]:[]}},{}]});
 }
 function inspect(){
  highlight();
  const x=exchanges[Number($('exchange').value)];
  $('drain').textContent=x?`Exchange starting at ${format(x.start)} h. ${x.pending?'Still in cavity':'Removed at drain'} ${format(x.mass)} mg in ${format(x.volume)} L at ${format(x.concentration)} mg/L.`:'No exchange before the simulation end.';
 }
 function timing(){
  highlight();
  const point=S.pointsOf(study)[Number($('sample').value)];
  if(!point){$('timing').textContent='Extend the simulation to at least 1 h to include a published endpoint.';return;}
  const shifted=point.time+Number($('shift').value);
  const original=S.interp(run.t,run.cols.plasma,point.time);
  if(shifted<0||shifted>config.horizon){$('timing').textContent='The hypothetical sample falls outside this simulation. Extend the simulation end or choose another endpoint.';return;}
  const prediction=S.interp(run.t,run.cols.plasma,shifted);
  $('timing').textContent=`Original ${format(point.time)} h ratio ${format(original/point.observed)}. Shift ${format(Number($('shift').value))} h → ${format(shifted)} h. Predicted ${format(prediction)} mg/L ÷ observed ${format(point.observed)} mg/L = ${format(prediction/point.observed)}.`;
 }
 async function render(){
  if(!$('horizon').checkValidity()){$('horizon').reportValidity();return;}
  study=S.find($('patient').value);
  config={...S.configFor(study,E),horizon:Number($('horizon').value),variability:0,draws:1,trackMassBalance:true};
  run=E.single(config,E.drawParams(config)[0],E.scheduleFor(study.mode,config),0.125,E.buildDoses(config));
  exchanges=run.drains.map(d=>({...d,pending:false}));
  const last=run.accounting.at(-1),active=E.pdStatus(config.horizon,E.scheduleFor(study.mode,config),config);
  if(active){
   const start=active.start,volume=last.pdVolume;
   exchanges.push({start,end:config.horizon,mass:last.parts.pdFluid,volume,concentration:last.parts.pdFluid/volume,pending:true});
  }
  $('exchange').replaceChildren(...exchanges.map((x,i)=>new Option(`${format(x.start)}–${format(x.end)} h · ${x.pending?'in progress':'drained'}`,i)));
  $('exchanges').replaceChildren(...exchanges.map(x=>row([format(x.start),format(x.end),x.pending?'In progress':x.complete?'Scheduled drain':'Session ended',format(x.volume),format(x.concentration),format(x.pending?0:x.mass),format(x.pending?x.mass:0)])));
  $('balance').textContent=`Cumulative PD removal ${format(last.parts.pdDrained)} mg. Still in cavity ${format(last.parts.pdFluid)} mg. Mass balance residual ${format(last.residual)} mg.`;
  $('protocol').textContent=`${study.short}. ${config.dose} mg IV over ${config.infusion} h every ${config.every} h, five doses. Four 2 L exchanges per day with 4, 4, 4 and 12 h dwells.`;
  $('version').textContent=`AyFlux ${window.AyFluxVersion.version} ${window.AyFluxVersion.channel}. Fixed nominal parameters, RK4 step ≤0.125 h. Replay uses the engine shipped with this page.`;
  $('share').href=`?patient=${encodeURIComponent(study.id)}&end=${config.horizon}`;
  const points=S.pointsOf(study).filter(p=>p.time<=config.horizon);
  $('sample').replaceChildren(...points.map((p,i)=>new Option(`${p.kind} at ${p.time} h`,i)));
  $('endpoints').replaceChildren(...points.map(p=>{const prediction=S.interp(run.t,run.cols.plasma,p.time);return row([format(p.time),format(p.observed),format(prediction),format(prediction/p.observed)]);}));
  inspect();timing();
  try{
   await C.ensure();
   C.draw($('chart'),C.options([C.line('AyFlux nominal',run.t,run.cols.plasma,'#0072b2'),{name:'Author-fitted endpoints',type:'scatter',symbolSize:9,data:points.map(p=>[p.time,p.observed]),itemStyle:{color:'#d55e00'}}],'Time (h)','Plasma acyclovir (mg/L)'));
   highlight();
   $('status').textContent='';
  }catch(error){$('status').textContent=error.message+' Numerical results remain available in the tables.';}
 }
 $('download').addEventListener('click',()=>{
  const snapshot={version:window.AyFluxVersion,study:study.id,mode:study.mode,config,
   solver:{method:'RK4',maxStepHours:0.125},time:run.t,plasmaMgL:run.cols.plasma,
   publishedEndpoints:S.pointsOf(study),exchanges,accounting:run.accounting};
  const url=URL.createObjectURL(new Blob([JSON.stringify(snapshot,null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download=study.id+'-replay.json';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
 $('patient').addEventListener('change',render);$('horizon').addEventListener('change',render);
 $('exchange').addEventListener('change',inspect);$('sample').addEventListener('change',timing);$('shift').addEventListener('input',timing);
 $('replay').addEventListener('click',()=>{$('horizon').value=120;$('shift').value=0;render();});
 render();
})();
