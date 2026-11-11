/* AyFlux visualization UI. Copyright 2026 Muhammad Khalil. AGPL-3.0-only. */
(function(){
'use strict';
const $=id=>document.getElementById(id),model=window.AyFluxExplore,pk=window.RenalPKV7;
let base=model.config(pk.DEFAULTS),grid=null,raw=null,worker=null,request=0,selected=null,plotPromise=null;
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
$('echartKind').onchange=()=>optionalChart.show(grid,$('echartKind').value);
function clearGrid(){optionalChart.close();$('echartKind').value='';$('echartKind').disabled=true;grid=null;$('map').replaceChildren();text('legend','');$('three').disabled=true;$('export').disabled=true;hide3D();}
function hide3D(){if(window.Plotly&&$('surface').data)window.Plotly.purge('surface');$('surface').hidden=true;$('hideThree').hidden=true;$('resetView').hidden=true;text('threeStatus','');}
$('hideThree').onclick=hide3D;
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
 try{const payload={config:base,mode:$('mode').value,xKey:$('xKey').value,yKey:$('yKey').value,xMin:+$('xMin').value,xMax:+$('xMax').value,yMin:+$('yMin').value,yMax:+$('yMax').value,count:+$('count').value,metric:$('metric').value};model.plan(payload);const result=await compute('grid',payload,'gridStatus');if(token!==request)return;grid=result;paintMap();$('echartKind').disabled=false;$('three').disabled=false;$('export').disabled=false;text('gridStatus',`${grid.xs.length*grid.ys.length} scenarios over ${base.horizon} hours. Select a cell below.`);}
 catch(e){text('gridStatus',e.message);}finally{$('generate').disabled=false;}
};
async function selectCell(i,j){if(!grid)return;const p=grid;selected={...p.config,[p.xKey]:p.xs[i],[p.yKey]:p.ys[j]};for(const b of $('map').querySelectorAll('button'))b.setAttribute('aria-pressed','false');$('map').querySelectorAll('tbody tr')[j].querySelectorAll('button')[i].setAttribute('aria-pressed','true');await showScenario(selected,p.mode,`${model.axes[p.xKey].label}: ${fmt(p.xs[i])}; ${model.axes[p.yKey].label}: ${fmt(p.ys[j])}`);}
async function showScenario(c,mode,label){
 text('selection',label+' · '+mode);text('curveStatus','Calculating selected scenario…');$('time').disabled=true;raw=null;$('curve').replaceChildren();$('sankey').replaceChildren();$('amounts').replaceChildren();text('balance','');const token=request+1;
 try{const result=await compute('curve',{config:c,mode},'curveStatus');if(token!==request)return;raw=result;drawCurve();$('time').max=raw.t.length-1;$('time').value=raw.t.length-1;$('time').disabled=false;drawSankey();text('curveStatus',`Nominal simulation over ${c.horizon} h. Peak plasma ${fmt(raw.summary.peak)} mg/L; AUC ${fmt(raw.summary.auc)} mg·h/L.`);}catch(e){text('curveStatus',e.message);}
}
$('baseline').onclick=()=>{cancel();showScenario(base,$('mode').value,'Starting settings');};
const ns='http://www.w3.org/2000/svg';
function svgEl(name,attrs={},content){const el=document.createElementNS(ns,name);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);if(content!==undefined)el.textContent=content;return el;}
function svg(label,width,height){return svgEl('svg',{viewBox:`0 0 ${width} ${height}`,role:'img','aria-label':label});}
function drawCurve(){
 const s=svg('Selected scenario concentration curves, mg/L versus hours',800,300),W=710,H=210,L=65,T=20,max=Math.max(1,...raw.cols.plasma,...raw.cols.csf,...raw.cols.cmmg),end=raw.t.at(-1);
 for(let j=0;j<=4;j++){const y=T+H-j*H/4;s.append(svgEl('path',{d:`M${L} ${y}H775`,stroke:'#dce5eb'}),svgEl('text',{x:L-8,y:y+4,'text-anchor':'end','font-size':12},fmt(max*j/4)));}
 for(let j=0;j<=4;j++)s.append(svgEl('text',{x:L+W*j/4,y:250,'text-anchor':'middle','font-size':12},fmt(end*j/4)));
 s.append(svgEl('text',{x:420,y:280,'text-anchor':'middle'},'Time (hours)'),svgEl('text',{x:12,y:15,'font-size':12},'mg/L'));
 for(const [key,color,dash] of [['plasma','#1261b0',''],['csf','#b55b16','8 4'],['cmmg','#8748a2','2 4']]){
 const d=raw.t.map((t,i)=>(i?'L':'M')+(L+W*t/end).toFixed(2)+' '+(T+H-H*raw.cols[key][i]/max).toFixed(2)).join(' ');s.append(svgEl('path',{d,fill:'none',stroke:color,'stroke-width':2,'stroke-dasharray':dash}));}
 $('curve').replaceChildren(s);
}
const labels={central:'Central compartment',peripheral:'Peripheral compartment',depot:'Oral depot',pdFluid:'Remaining in PD fluid',kidney:'Renal elimination',other:'Other elimination',formed:'Converted to CMMG',hd:'Removed by HD',crrt:'Removed by CRRT',pdDrained:'PD drains / session ends'};
const colors=['#256ba2','#618bb2','#729b91','#55aeb3','#9f835e','#8c8c94','#a478b4','#467d86','#5b9c7b','#bd8669'];
function drawSankey(){if(!raw)return;const r=raw.accounting[+$('time').value];text('timeLabel',fmt(r.time)+' h');
 const entries=Object.entries(r.parts),total=entries.reduce((a,[,v])=>a+v,0),tol=Math.max(.01,r.input*.0001),bad=Math.abs(r.residual)>tol||entries.some(([,v])=>v<-.000001);
 text('balance',`Input ${fmt(r.input)} mg · accounted ${fmt(total)} mg · residual ${fmt(r.residual)} mg. ${bad?'Accounting outside tolerance; flow diagram withheld.':'Mass balance within tolerance.'}`);
 const table=document.createElement('table'),h=table.createTHead().insertRow();for(const title of ['Destination','ACV-equivalent mg','% of input']){const th=document.createElement('th');th.textContent=title;h.append(th);}const b=table.createTBody();entries.forEach(([k,v])=>{const tr=b.insertRow();for(const val of [labels[k],fmt(v),r.input>0?fmt(v/r.input*100)+'%':'—'])tr.insertCell().textContent=val;});$('amounts').replaceChildren(table);
 if(bad||r.input<=0){$('sankey').replaceChildren();return;}
 const nonzero=entries.filter(([,v])=>v>1e-9),H=240,gap=20,height=H+gap*(nonzero.length-1)+60,s=svg('Drug accounting Sankey; exact amounts are in the following table',920,height);let source=30,dest=30;
 s.append(svgEl('rect',{x:15,y:30,width:18,height:H,fill:'#28485e'}),svgEl('text',{x:15,y:18,'font-size':12},'Input'));
 nonzero.forEach(([k,v])=>{const w=v/total*H,col=colors[entries.findIndex(([key])=>key===k)];const d=`M33 ${source} C240 ${source},300 ${dest},510 ${dest} L510 ${dest+w} C300 ${dest+w},240 ${source+w},33 ${source+w} Z`;const path=svgEl('path',{d,fill:col,opacity:.65,tabindex:0,'aria-label':labels[k]+': '+fmt(v)+' mg'});path.append(svgEl('title',{},labels[k]+': '+fmt(v)+' mg ('+fmt(v/r.input*100)+'%)'));s.append(path,svgEl('rect',{x:510,y:dest,width:14,height:w,fill:col}),svgEl('text',{x:535,y:dest+w/2+4,'font-size':12},labels[k]+' · '+fmt(v)+' mg'));source+=w;dest+=w+gap;});$('sankey').replaceChildren(s);
}
$('time').oninput=drawSankey;
function load3D(){if(plotPromise)return plotPromise;plotPromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='/assets/vendor/plotly-full-3.3.1.min.js';s.onload=()=>window.Plotly?resolve(window.Plotly):reject(Error('3D library unavailable'));s.onerror=()=>{s.remove();reject(Error('Optional 3D download unavailable. The heatmap remains usable.'));};document.head.append(s);}).catch(e=>{plotPromise=null;throw e;});return plotPromise;}
$('three').onclick=async()=>{const p=grid;if(!p)return;text('threeStatus','Loading optional 3D view…');try{const plot=await load3D();if(grid!==p)return;$('surface').hidden=false;const a=model.metrics[p.metric];await plot.newPlot('surface',[{type:'surface',x:p.xs,y:p.ys,z:p.z,colorscale:'Blues',colorbar:{title:{text:a.unit}},hovertemplate:'X: %{x}<br>Y: %{y}<br>Output: %{z}<extra></extra>'}],{margin:{l:0,r:0,b:0,t:20},scene:{xaxis:{title:{text:model.axes[p.xKey].label}},yaxis:{title:{text:model.axes[p.yKey].label}},zaxis:{title:{text:a.label+' ('+a.unit+')'}}}},{responsive:true,displaylogo:false});$('surface').on('plotly_click',e=>{const point=e.points?.[0];if(!point||grid!==p)return;const nearest=(xs,v)=>xs.reduce((best,x,i)=>Math.abs(x-v)<Math.abs(xs[best]-v)?i:best,0);selectCell(nearest(p.xs,point.x),nearest(p.ys,point.y));});$('resetView').hidden=false;$('hideThree').hidden=false;text('threeStatus','Drag to rotate, scroll to zoom, or select a sampled point. Exact values remain available in the heatmap.');}catch(e){hide3D();text('threeStatus',e.message);}};
$('resetView').onclick=()=>window.Plotly?.relayout('surface',{'scene.camera':{eye:{x:1.25,y:1.25,z:1.25},center:{x:0,y:0,z:0},up:{x:0,y:0,z:1}}});
$('export').onclick=()=>{if(!grid)return;const rows=[[grid.xKey,grid.yKey,grid.metric,model.metrics[grid.metric].unit],...grid.ys.flatMap((y,j)=>grid.xs.map((x,i)=>[x,y,grid.z[j][i],model.metrics[grid.metric].unit]))];const u=URL.createObjectURL(new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'}));const a=document.createElement('a');a.href=u;a.download='AyFlux-visual-explorer.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};
showScenario(base,$('mode').value,'Starting settings');
})();
