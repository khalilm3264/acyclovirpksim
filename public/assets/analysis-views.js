// Optional research figures; expensive calculations run only on request.
(function(){
'use strict';
const $=id=>document.getElementById(id),charts=window.AyFluxCharts,pk=window.RenalPKV7;
const snapshot=()=>window.AyFluxResearchBridge.snapshot();
const jobs=new Map();
function cancel(key){jobs.get(key)?.terminate();jobs.delete(key);}
function run(key,kind,payload,receive,onError){
 cancel(key);const worker=new Worker('/explore/worker.js');jobs.set(key,worker);
 worker.onmessage=({data})=>{if(jobs.get(key)!==worker)return;cancel(key);if(data.error)onError(data.error);else receive(data.result);};
 worker.onerror=e=>{cancel(key);onError(e.message);};worker.postMessage({id:1,kind,payload});
}
const pathways={kidney:'Renal elimination',other:'Other elimination',formed:'Converted to CMMG',hd:'HD removal',crrt:'CRRT removal',pdDrained:'PD drainage / session end'};
function removal(raw){
 const colors=['#236bad','#7b6749','#965995','#198177','#af6718','#4b6380'];
 const series=Object.entries(pathways).map(([key,name],i)=>charts.line(name,raw.t,raw.accounting.map(r=>r.parts[key]),colors[i]));
 return charts.options(series,'Time (h)','ACV-equivalent mass (mg)');
}
function drawRemoval(){
 cancel('removal');const s=snapshot();if(!$('removalPanel').open||!s.updated)return;
 $('removalNote').textContent='Calculating nominal removal for '+s.primary+'…';
 run('removal','accounting',{config:s.config,mode:s.primary},async raw=>{
  await charts.ensure();if(!current(s)||!$('removalPanel').open)return;
  charts.draw($('mainRemoval'),removal(raw));$('removalNote').textContent=s.primary+' · Cumulative acyclovir-equivalent amounts, nominal parameters.';
 },msg=>{$('removalNote').textContent=msg;});
}
function current(s){const now=snapshot();return now.updated&&now.revision===s.revision&&now.primary===s.primary;}
function eventRows(s){
 const c=s.config,d=s.results[s.primary],lanes=['Oral dose','IV infusion','HD','CRRT','PD exchange'],events=[];
 for(const e of d.doses)if(e.amount>0)events.push([e.time,e.time+(e.route==='Acyclovir IV'?e.infusion:0),e.route==='Acyclovir IV'?1:0,e.amount+' mg']);
 for(const r of d.rows){
  if(['HD','CRRT'].includes(r.type)){events.push([r.start,r.end,lanes.indexOf(r.type),r.type]);continue;}
  if(!['APD','CAPD'].includes(r.type))continue;
  const exchanges=c.pdRxEnabled?pk.exchangesForSession(c,r):Array.from({length:r.type==='APD'?c.apdCycles:c.capdExchanges},(_,i)=>({start:i*(r.type==='APD'?c.apdDwell+c.apdTurnover:c.capdDwell),dwell:r.type==='APD'?c.apdDwell:c.capdDwell}));
  for(const e of exchanges){const start=r.start+e.start;if(start<r.end)events.push([start,Math.min(start+e.dwell,r.end),4,r.type]);}
 }
 return {lanes,events};
}
async function timeline(){
 const s=snapshot();if(!$('eventsPanel').open||!s.updated)return;
 await charts.ensure();if(!current(s)||!$('eventsPanel').open)return;
 const {lanes,events}=eventRows(s),colors=['#277465','#984922','#3366a0','#756497','#497d80'];
 const option=charts.options([],'Time (h)','');option.grid.left=84;option.legend.show=false;
 const main=window.echarts.getInstanceByDom($('plasmaChart')),axis=main?.getOption().xAxis[0];
 option.xAxis.max=axis?.max||s.config.horizon;option.yAxis={type:'category',data:lanes};
 option.series=[{type:'custom',data:events,clip:true,encode:{x:[0,1],y:2},renderItem:(p,api)=>{
  const a=api.coord([api.value(0),api.value(2)]),b=api.coord([api.value(1),api.value(2)]);
  return {type:'rect',shape:{x:a[0]-1,y:a[1]-5,width:Math.max(3,b[0]-a[0]),height:10},style:{fill:colors[api.value(2)]}};
 }}];
 option.tooltip={trigger:'item',renderMode:'richText',formatter:p=>lanes[p.value[2]]+' · '+p.value[3]+' · '+p.value[0]+'–'+p.value[1]+' h'};
 const zoom=main?.getOption().dataZoom?.find(z=>z.xAxisIndex?.includes?.(0)||z.xAxisIndex===0);
 option.dataZoom=[{id:'eventZoom',type:'inside',xAxisIndex:0,filterMode:'none',zoomOnMouseWheel:false,moveOnMouseMove:false,start:zoom?.start??0,end:zoom?.end??100}];
 const chart=charts.draw($('eventStrip'),option);
 chart.group='ayflux-dose-time';if(main)main.group=chart.group;window.echarts.connect(chart.group);
}
async function multiples(){
 const s=snapshot();if(!$('comparisonPanel').open||!s.updated)return;
 await charts.ensure();if(!current(s)||!$('comparisonPanel').open)return;
 const area=$('multipleCharts');for(const el of area.children)charts.dispose(el);area.replaceChildren();
 const modes=[...document.querySelectorAll('input[data-mode]:checked')].map(el=>el.dataset.mode).filter(m=>s.results[m]);
 const ceiling=Math.max(1,...modes.map(m=>Math.max(...s.results[m].plasma.upper)));
 for(const name of modes){
  const d=s.results[name],el=document.createElement('div');el.style.cssText='height:255px;contain:inline-size';area.append(el);
  const option=charts.options([charts.band('Model interval',d.time,d.plasma.lower,d.plasma.upper,'rgba(48,105,148,.2)'),charts.line('Median',d.time,d.plasma.median,'#236798')],'Time (h)','Plasma ACV (mg/L)');
  option.yAxis.max=ceiling;option.xAxis.max=s.config.horizon;option.title={text:name,textStyle:{fontSize:14}};charts.draw(el,option);
 }
}
let sensitivity,ensemble;
const units={auc:'mg·h/L',csfPeak:'mg/L',mPeak:'mg/L',mass:'mg'};
function sweep(){
 cancel('sweep');const s=snapshot(),key=$('sweepFactor').value,metric=$('tornadoMetric').value;
 if(!$('sweepPanel').open||!s.updated||!key)return;
 run('sweep','sweep',{config:s.config,mode:s.primary,key,metric},async data=>{
  await charts.ensure();if(!current(s)||!$('sweepPanel').open)return;
  const label=$('sweepFactor').selectedOptions[0].textContent;
  const option=charts.options([charts.line(label,data.map(p=>p[0]),data.map(p=>p[1]),'#276997')],label,units[metric]);
  option.xAxis.min='dataMin';charts.draw($('sweepChart'),option);$('sweepNote').textContent='Nominal '+s.primary+' scenario. Samples span the permitted portion of ±20% around the current input.';
 },msg=>{$('sweepNote').textContent=msg;});
}
function setFactors(result){
 sensitivity=result;const el=$('sweepFactor'),previous=el.value;
 el.replaceChildren(...result.outcomes.filter(r=>!r.na).map(r=>new Option(r.label,r.key)));
 if([...el.options].some(o=>o.value===previous))el.value=previous;sweep();
}
function selectFactor(label){
 const key=sensitivity?.outcomes.find(r=>r.label===label)?.key;if(!key)return;
 $('sweepFactor').value=key;if($('sweepPanel').open)sweep();else $('sweepPanel').open=true;
}
const dimensions=['Central volume (L)','Systemic clearance (L/h)','Plasma AUC (mg·h/L)','Plasma at sample (mg/L)'];
for(const id of ['ensembleX','ensembleY'])$(id).replaceChildren(...dimensions.map((v,i)=>new Option(v,i)));
$('ensembleY').value='2';
function quantile(sorted,p){const pos=(sorted.length-1)*p,i=Math.floor(pos);return sorted[i]+(pos-i)*((sorted[i+1]??sorted[i])-sorted[i]);}
function density(values){
 const lo=values[0],hi=values.at(-1);if(hi===lo)return [[lo,1]];
 const bandwidth=Math.max((quantile(values,.75)-quantile(values,.25))/1.349,(hi-lo)/20)*Math.pow(values.length,-.2);
 const points=Array.from({length:51},(_,i)=>{const v=lo+(hi-lo)*i/50;return [v,values.reduce((sum,x)=>sum+Math.exp(-.5*((x-v)/bandwidth)**2),0)];});
 const max=Math.max(...points.map(p=>p[1]));return points.map(([v,d])=>[v,d/max]);
}
function ensembleOption(result,kind){
 const x=+$('ensembleX').value,y=+$('ensembleY').value;
 if(kind==='scatter'){
  const o=charts.options([{type:'scatter',name:'Prior draws',symbolSize:6,data:result.points.map(p=>[p[x],p[y]])}],dimensions[x],dimensions[y]);
  o.tooltip.trigger='item';return o;
 }
 if(kind==='matrix'){
  const grid=[],xAxis=[],yAxis=[],series=[];
  for(let row=0;row<4;row++)for(let col=0;col<4;col++){
   const n=grid.length;grid.push({left:(10+col*22)+'%',top:(4+row*22)+'%',width:'18%',height:'16%'});
   xAxis.push({type:'value',gridIndex:n,scale:true,axisLabel:{show:row===3,fontSize:9,hideOverlap:true},splitNumber:2,name:row===3?['V','CL','AUC','C'][col]:'',nameLocation:'middle',nameGap:20});
   yAxis.push({type:'value',gridIndex:n,scale:true,axisLabel:{show:col===0,fontSize:9},splitNumber:2,name:col===0?['V','CL','AUC','C'][row]:''});
   series.push({type:'scatter',xAxisIndex:n,yAxisIndex:n,name:dimensions[col]+' × '+dimensions[row],symbolSize:3,data:result.points.map(p=>[p[col],p[row]])});
  }
  return {animation:false,tooltip:{trigger:'item',renderMode:'richText'},grid,xAxis,yAxis,series};
 }
 const o=charts.options([],'','Plasma acyclovir (mg/L)');o.xAxis={type:'category',data:result.groups.map(g=>g.name),axisLabel:{rotate:18,hideOverlap:true}};o.tooltip.trigger='item';
 if(kind==='box'){
  o.series=[{type:'boxplot',name:'Prior distribution',data:result.groups.map(g=>[0,.25,.5,.75,1].map(p=>quantile(g.values,p)))}];
 }else{
  const shapes=result.groups.map(g=>density(g.values));
  o.series=[{type:'custom',name:'Prior distribution',encode:{x:0,y:[1,2]},data:result.groups.map((g,i)=>[i,g.values[0],g.values.at(-1)]),renderItem:(p,api)=>{
   const i=api.value(0),width=api.size([1,0])[0]*.38,shape=shapes[i];
   const edge=side=>shape.map(([v,d])=>{const [x,y]=api.coord([i,v]);return [x+side*width*d,y];});
   if(shape.length===1){const [x,y]=api.coord([i,shape[0][0]]);return {type:'line',shape:{x1:x-width,x2:x+width,y1:y,y2:y},style:{stroke:'#366988',lineWidth:2}};}
   return {type:'polygon',shape:{points:edge(-1).concat(edge(1).reverse())},style:{fill:'#7daac3',stroke:'#396981'}};
  }}];
 }
 return o;
}
async function renderEnsemble(){
 if(!ensemble)return;const kind=$('ensembleView').value;await charts.ensure();if(!ensemble)return;
 charts.draw($('ensembleChart'),ensembleOption(ensemble,kind));
 $('ensembleStatus').textContent=ensemble.mode+' · '+ensemble.points.length+' prior draws · '+ensemble.hour+' h. '+({matrix:'V: central volume; CL: systemic clearance; AUC: plasma exposure; C: sampled plasma concentration.',box:'Box: quartiles and median; whiskers: minimum and maximum.',violin:'Width shows relative density within each scenario.','scatter':''}[kind]);
}
$('ensembleRun').onclick=()=>{
 const s=snapshot();if(!s.updated)return;
 const hour=$('ensembleHour').valueAsNumber;
 if(!Number.isFinite(hour)||hour<0||hour>s.config.horizon){$('ensembleStatus').textContent='Enter a time within the simulated window.';return;}
 $('ensembleStatus').textContent='Generating prior draws…';
 run('ensemble','ensemble',{config:s.config,mode:s.primary,hour,modes:pk.MODES.filter(m=>s.results[m])},r=>{if(current(s)){ensemble=r;renderEnsemble();}},msg=>{$('ensembleStatus').textContent=msg;});
};
for(const id of ['ensembleView','ensembleX','ensembleY'])$(id).onchange=renderEnsemble;
$('eventsPanel').ontoggle=timeline;$('comparisonPanel').ontoggle=multiples;$('removalPanel').ontoggle=drawRemoval;
$('sweepPanel').ontoggle=sweep;$('sweepFactor').onchange=sweep;$('tornadoMetric').addEventListener('change',sweep);
window.addEventListener('ayflux:results-updated',()=>{cancel('ensemble');ensemble=null;charts.dispose($('ensembleChart'));$('ensembleStatus').textContent='';timeline();multiples();drawRemoval();});
document.addEventListener('change',e=>{if(e.target.matches('input[data-mode]'))requestAnimationFrame(multiples);});
window.AyFluxViews={setFactors,selectFactor,timeline};
})();
