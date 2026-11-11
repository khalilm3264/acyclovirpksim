/* AyFlux visualization UI. Copyright 2026 Muhammad Khalil. AGPL-3.0-only. */
(function(){
'use strict';
const $=id=>document.getElementById(id),model=window.AyFluxExplore,pk=window.RenalPKV7;
let base=model.config(pk.DEFAULTS),grid=null,raw=null,worker=null,request=0,selected=null;
const fmt=n=>Number(n).toLocaleString(undefined,{maximumFractionDigits:3}),text=(id,s)=>{$(id).textContent=s;};
try{const saved=JSON.parse(sessionStorage.getItem('ayflux-explorer')||'null');if(saved?.config){base=model.config(saved.config);$('mode').value=pk.MODES.includes(saved.mode)?saved.mode:'No dialysis';text('source','Using settings copied from the main simulator.');sessionStorage.removeItem('ayflux-explorer');}else throw Error();}catch(_){text('source','Using default simulator settings. Open from Research tools to use your own scenario.');$('mode').value='Intermittent HD';}
text('settings',`${base.route} · ${base.dosingMode==='custom'?'custom medication events':base.dose+' mg every '+base.every+' h, up to '+base.doseCount+' doses'} · ${base.weight} kg · ${base.horizon} h · ${base.renalMode==='profile'?'time-varying CrCl':fmt(base.crcl)+' mL/min CrCl'}`);
for(const id of ['xKey','yKey'])for(const [key,a] of Object.entries(model.axes))$(id).add(new Option(a.label,key));
for(const [key,a] of Object.entries(model.metrics))$('metric').add(new Option(a.label+' ('+a.unit+')',key));
$('xKey').value=base.renalMode==='profile'?'weight':'crcl';$('yKey').value=$('mode').value==='Intermittent HD'?'hdDuration':'weight';
function range(prefix){const k=$(prefix+'Key').value;const defaults={crcl:[0,140],weight:[40,120],dose:[0,Math.min(base.dose*2||1000,pk.MAX_DOSE_MG[base.route])],every:[4,24],hdDuration:[.5,Math.min(8,base.hdRepeat)]};$(prefix+'Min').value=defaults[k][0];$(prefix+'Max').value=defaults[k][1];}
range('x');range('y');$('xKey').onchange=()=>range('x');$('yKey').onchange=()=>range('y');
function compute(kind,payload,status){
 if(worker)worker.terminate();const id=++request;
 $('cancel').disabled=false;
 return new Promise((resolve,reject)=>{
  worker=new Worker('/explore/worker.js');
  const finish=()=>{$('cancel').disabled=true;worker?.terminate();worker=null;};
  worker.onmessage=e=>{if(e.data.id!==id)return;if(e.data.progress){text(status,'Computing '+Math.round(e.data.progress*100)+'%…');return;}finish();e.data.error?reject(Error(e.data.error)):resolve(e.data.result);};
  worker.onerror=()=>{finish();reject(Error('Calculation worker unavailable. Reload and try again.'));};
  worker.postMessage({id,kind,payload});
 });
}
function cancel(){request++;worker?.terminate();worker=null;$('cancel').disabled=true;$('generate').disabled=false;text('gridStatus','Calculation cancelled.');text('curveStatus','Calculation cancelled.');}
$('cancel').onclick=cancel;
const optionalChart=createEChartsView($('echart'),$('echartStatus'),selectCell);
const charts=window.AyFluxCharts;
$('echartKind').onchange=async()=>{
 const kind=$('echartKind').value;await optionalChart.show(grid,kind);
 $('resetView').hidden=$('echartKind').value!=='surface'||$('echart').hidden;
};
$('resetView').onclick=()=>optionalChart.resetCamera();
function clearGrid(){window.AyFluxExplorerFigures.newGrid(null);optionalChart.close();$('resetView').hidden=true;$('echartKind').value='';$('echartKind').disabled=true;grid=null;$('map').replaceChildren();text('legend','');$('export').disabled=true;}
function inputChanged(){cancel();clearGrid();text('gridStatus','Inputs changed. Generate a new map.');text('selection','Previous selected scenario remains below until a new scenario is selected.');}
for(const id of ['xKey','xMin','xMax','yKey','yMin','yMax','metric','count','mode'])$(id).addEventListener('change',inputChanged);
function paintMap(){
 const p=grid,a=model.metrics[p.metric],flat=p.z.flat(),min=Math.min(...flat),max=Math.max(...flat);
 const table=document.createElement('table'),cap=table.createCaption();cap.textContent=model.axes[p.yKey].label+' (rows) × '+model.axes[p.xKey].label+' (columns)';
 const head=table.createTHead().insertRow();head.append(document.createElement('th'));
 for(const x of p.xs){const th=document.createElement('th');th.scope='col';th.textContent=fmt(x);head.append(th);}
 const body=table.createTBody();p.ys.forEach((y,j)=>{const tr=body.insertRow(),th=document.createElement('th');th.scope='row';th.textContent=fmt(y);tr.append(th);p.xs.forEach((x,i)=>{
  const v=p.z[j][i],f=(v-min)/(max-min||1),button=document.createElement('button');button.textContent=fmt(v);button.style.backgroundColor=`hsl(205 60% ${96-f*65}%)`;button.style.color=f>.5?'white':'#18354a';button.setAttribute('aria-pressed','false');button.setAttribute('aria-label',`${model.axes[p.xKey].label} ${fmt(x)}, ${model.axes[p.yKey].label} ${fmt(y)}: ${a.label} ${fmt(v)} ${a.unit}`);button.onclick=()=>selectCell(i,j);tr.insertCell().append(button);
 });});$('map').replaceChildren(table);text('legend',`${a.label} (${a.unit}): pale ${fmt(min)} → dark ${fmt(max)}. Each cell is a simulated scenario.`);
}
$('generate').onclick=async()=>{
 $('generate').disabled=true;clearGrid();text('gridStatus','Preparing grid…');const token=request+1;
 try{const payload={config:base,mode:$('mode').value,xKey:$('xKey').value,yKey:$('yKey').value,xMin:+$('xMin').value,xMax:+$('xMax').value,yMin:+$('yMin').value,yMax:+$('yMax').value,count:+$('count').value,metric:$('metric').value};model.plan(payload);const result=await compute('grid',payload,'gridStatus');if(token!==request)return;grid=result;paintMap();window.AyFluxExplorerFigures.newGrid(grid);$('echartKind').disabled=false;$('export').disabled=false;text('gridStatus',`${grid.xs.length*grid.ys.length} scenarios over ${base.horizon} hours. Select a cell below.`);}
 catch(e){text('gridStatus',e.message);}finally{$('generate').disabled=false;}
};
async function selectCell(i,j){if(!grid)return;const p=grid;selected={...p.config,[p.xKey]:p.xs[i],[p.yKey]:p.ys[j]};for(const b of $('map').querySelectorAll('button'))b.setAttribute('aria-pressed','false');$('map').querySelectorAll('tbody tr')[j].querySelectorAll('button')[i].setAttribute('aria-pressed','true');await showScenario(selected,p.mode,`${model.axes[p.xKey].label}: ${fmt(p.xs[i])}; ${model.axes[p.yKey].label}: ${fmt(p.ys[j])}`);}
async function showScenario(c,mode,label){
 text('selection',label+' · '+mode);text('curveStatus','Calculating selected scenario…');$('time').disabled=true;raw=null;window.AyFluxExplorerFigures.setRaw(null);charts.dispose($('trajectory'));text('trajectorySample','');charts.dispose($('curve'));charts.dispose($('sankey'));$('amounts').replaceChildren();text('balance','');const token=request+1;
 try{const result=await compute('curve',{config:c,mode},'curveStatus');if(token!==request)return;raw=result;await charts.ensure();if(token!==request)return;drawCurve();$('time').max=raw.t.length-1;$('time').value=raw.t.length-1;$('time').disabled=false;drawTrajectory();drawSankey();window.AyFluxExplorerFigures.setRaw(raw);text('curveStatus',`Nominal simulation over ${c.horizon} h. Peak plasma ${fmt(raw.summary.peak)} mg/L; AUC ${fmt(raw.summary.auc)} mg·h/L.`);}catch(e){text('curveStatus',e.message);}
}
$('baseline').onclick=()=>{cancel();showScenario(base,$('mode').value,'Starting settings');};
function drawCurve(){
 const series=[['plasma','Plasma acyclovir','#1261b0','solid'],['csf','CSF acyclovir','#b55b16','dashed'],['cmmg','Plasma CMMG','#8748a2','dotted']]
  .map(([key,name,color,dash])=>charts.line(name,raw.t,raw.cols[key],color,2,dash));
 charts.draw($('curve'),charts.options(series,'Time (hours)','Concentration (mg/L)'));
}
function updateTrajectorySample(){
 if(!raw||!$('trajectoryPanel').open)return;
 const i=Number($('time').value),p=[raw.cols.plasma[i],raw.cols.csf[i],raw.t[i]];
 text('trajectorySample',fmt(p[2])+' h · Plasma '+fmt(p[0])+' mg/L · CSF '+fmt(p[1])+' mg/L');
 window.echarts?.getInstanceByDom($('trajectory'))?.setOption({series:[{id:'sample',data:[p]}]});
}
function drawTrajectory(){
 if(!raw||!$('trajectoryPanel').open||!window.echarts)return;
 const points=raw.t.map((t,i)=>[raw.cols.plasma[i],raw.cols.csf[i],t]);
 const arrows=[];
 for(let i=1;i<points.length;i+=Math.max(1,Math.floor(points.length/6))){
  const a=points[i-1].slice(0,2),b=points[i].slice(0,2);
  if(a[0]!==b[0]||a[1]!==b[1])arrows.push([{coord:a},{coord:b}]);
 }
 const series=[{name:'Trajectory',id:'path',type:'line',data:points,encode:{x:0,y:1},showSymbol:false,lineStyle:{color:'#176798'},markLine:{
  symbol:['none','arrow'],symbolSize:8,silent:true,label:{show:false},lineStyle:{type:'solid',color:'#176798'},data:arrows}},
  {id:'sample',name:'Selected time',type:'scatter',encode:{x:0,y:1},data:[],symbolSize:10,itemStyle:{color:'#ad501e'}}];
 const option=charts.options(series,'Plasma acyclovir (mg/L)','CSF acyclovir (mg/L)');
 option.tooltip={trigger:'item',renderMode:'richText',formatter:p=>fmt(p.value[2])+' h · Plasma '+fmt(p.value[0])+' mg/L · CSF '+fmt(p.value[1])+' mg/L'};
 charts.draw($('trajectory'),option);updateTrajectorySample();
}
$('trajectoryPanel').addEventListener('toggle',drawTrajectory);
const labels={central:'Central compartment',peripheral:'Peripheral compartment',depot:'Oral depot',pdFluid:'Remaining in PD fluid',kidney:'Renal elimination',other:'Other elimination',formed:'Converted to CMMG',hd:'Removed by HD',crrt:'Removed by CRRT',pdDrained:'PD drains / session ends'};
const colors=['#256ba2','#618bb2','#729b91','#55aeb3','#9f835e','#8c8c94','#a478b4','#467d86','#5b9c7b','#bd8669'];
function drawSankey(){if(!raw)return;const r=raw.accounting[+$('time').value];text('timeLabel',fmt(r.time)+' h');
 const entries=Object.entries(r.parts),total=entries.reduce((a,[,v])=>a+v,0),tol=Math.max(.01,r.input*.0001),bad=Math.abs(r.residual)>tol||entries.some(([,v])=>v<-.000001);
 text('balance',`Input ${fmt(r.input)} mg · accounted ${fmt(total)} mg · residual ${fmt(r.residual)} mg. ${bad?'Accounting outside tolerance; flow diagram withheld.':'Mass balance within tolerance.'}`);
 const table=document.createElement('table'),h=table.createTHead().insertRow();for(const title of ['Destination','ACV-equivalent mg','% of input']){const th=document.createElement('th');th.textContent=title;h.append(th);}const b=table.createTBody();entries.forEach(([k,v])=>{const tr=b.insertRow();for(const val of [labels[k],fmt(v),r.input>0?fmt(v/r.input*100)+'%':'—'])tr.insertCell().textContent=val;});$('amounts').replaceChildren(table);
 if(bad||r.input<=0){charts.dispose($('sankey'));return;}
 const parts=entries.filter(([,v])=>v>1e-9);
 charts.draw($('sankey'),{animation:false,tooltip:{renderMode:'richText'},series:[{type:'sankey',left:10,right:155,
  data:[{name:'Input'},...parts.map(([k])=>({name:labels[k],itemStyle:{color:colors[entries.findIndex(([key])=>key===k)]}}))],
  links:parts.map(([k,value])=>({source:'Input',target:labels[k],value})),lineStyle:{color:'target',opacity:.6}}]});
}
$('time').oninput=()=>{drawSankey();updateTrajectorySample();window.AyFluxExplorerFigures.frame();};
$('export').onclick=()=>{if(!grid)return;const rows=[[grid.xKey,grid.yKey,grid.metric,model.metrics[grid.metric].unit],...grid.ys.flatMap((y,j)=>grid.xs.map((x,i)=>[x,y,grid.z[j][i],model.metrics[grid.metric].unit]))];const u=URL.createObjectURL(new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'}));const a=document.createElement('a');a.href=u;a.download='AyFlux-visual-explorer.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};
showScenario(base,$('mode').value,'Starting settings');
})();
