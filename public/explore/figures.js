// Additional views of generated scenarios and time-resolved drug accounting.
(function(root){
'use strict';
const $=id=>document.getElementById(id),charts=root.AyFluxCharts,model=root.AyFluxExplore;
const fmt=v=>Number(v.toPrecision(4)).toString();
let grid=null,raw=null,worker=null,version=0,playing=null;
const metricKeys=Object.keys(model.metrics);
function stopWorker(){version++;worker?.terminate();worker=null;}
function cancelPlay(){clearInterval(playing);playing=null;$('playCompartments').textContent='Play';}
function newGrid(value){
 grid=value;stopWorker();if(grid)$('referenceStart').value=grid.config.hdStart;charts.dispose($('gridComparison'));$('gridFigureStatus').textContent='';
 $('gridFigurePanel').hidden=!grid;if(grid&&$('gridFigurePanel').open)drawGrid();
}
function inspect(kind,payload){
 return new Promise((resolve,reject)=>{
  worker=new Worker('/explore/worker.js');
  worker.onmessage=e=>{const {result,error}=e.data;worker.terminate();worker=null;error?reject(Error(error)):resolve(result);};
  worker.onerror=e=>{worker.terminate();worker=null;reject(Error(e.message));};worker.postMessage({id:1,kind,payload});
 });
}
// Interpolate isoline crossings between neighboring grid samples. At saddles,
// use the cell center to choose which two crossings share a segment.
function contours(g){
 const z=g.z,values=z.flat(),lo=Math.min(...values),hi=Math.max(...values),series=[];
 if(lo===hi)return series;
 for(let n=1;n<=5;n++){
  const threshold=lo+(hi-lo)*n/6,segments=[];
  for(let j=0;j<g.ys.length-1;j++)for(let i=0;i<g.xs.length-1;i++){
   const v=[z[j][i],z[j][i+1],z[j+1][i+1],z[j+1][i]],xy=[[i,j],[i+1,j],[i+1,j+1],[i,j+1]],cross=[];
   for(let a=0;a<4;a++){const b=(a+1)%4;if((v[a]>=threshold)===(v[b]>=threshold))continue;
    const t=(threshold-v[a])/(v[b]-v[a]);cross.push([xy[a][0]+t*(xy[b][0]-xy[a][0]),xy[a][1]+t*(xy[b][1]-xy[a][1])]);
   }
   if(cross.length===4&&(v.reduce((a,b)=>a+b,0)/4>=threshold)===(v[0]>=threshold))cross.push(cross.shift());
   for(let k=1;k<cross.length;k+=2)segments.push([...cross[k-1],...cross[k]]);
  }
  series.push({type:'custom',name:fmt(threshold),data:segments,encode:{x:[],y:[]},itemStyle:{color:'#24384c'},z:5,
   tooltip:{formatter:()=>fmt(threshold)+' '+model.metrics[g.metric].unit},renderItem:(p,api)=>{
    const [ox,oy]=api.coord([0,0]),[nx,ny]=api.coord([1,1]);
    return {type:'line',shape:{x1:ox+api.value(0)*(nx-ox),y1:oy+api.value(1)*(ny-oy),x2:ox+api.value(2)*(nx-ox),y2:oy+api.value(3)*(ny-oy)},style:{stroke:'#233b50',lineWidth:1.4}};
   }});
 }
 return series;
}
async function drawGrid(){
 stopWorker();const rev=version,g=grid,kind=$('gridFigureKind').value;
 $('referenceMode').parentElement.hidden=kind!=='difference';
 $('referenceStart').parentElement.hidden=kind!=='difference'||$('referenceMode').value!=='Intermittent HD';
 if(!g||!$('gridFigurePanel').open)return;
 const metric=model.metrics[g.metric],target=$('gridComparison');
 charts.dispose(target);$('gridFigureStatus').textContent='Preparing figure…';
 try{
  await charts.ensure();if(rev!==version)return;
  let option,caption;
  if(kind==='parallel'){
   const dimensions=[model.axes[g.xKey].label,model.axes[g.yKey].label,...metricKeys.map(k=>model.metrics[k].label+' ('+model.metrics[k].unit+')')];
   option={animation:false,parallel:{left:60,right:65,top:75,bottom:42,axisExpandable:true},parallelAxis:dimensions.map((name,dim)=>({dim,name,scale:true,nameRotate:25,nameTextStyle:{fontSize:10},axisLabel:{fontSize:10}})),
    series:[{type:'parallel',data:g.scenarios,lineStyle:{width:1.3,opacity:.4},inactiveOpacity:.04,activeOpacity:1}]};
   caption=g.scenarios.length+' sampled scenarios. Drag along an axis to select a value range.';
  }else if(kind==='time'){
   const r=await inspect('timeMap',{config:g.config});if(rev!==version)return;
   option=charts.heatmap(r.hours.map(fmt),r.starts.map(fmt),r.data,'Time (h)','First HD start (h)','mg/L');
   caption='Plasma acyclovir (mg/L) by first HD start. Other inputs use the starting prescription for intermittent HD.';
  }else{
   const reference=$('referenceMode').value;
   const hdStart=$('referenceStart').valueAsNumber;
   if(kind==='difference'&&reference==='Intermittent HD'&&(!Number.isFinite(hdStart)||hdStart<0||hdStart>g.config.horizon))throw Error('Enter a baseline HD start within the simulation window.');
   const values=kind==='difference'?await inspect('difference',{grid:g,reference,hdStart}):g.z;
   if(rev!==version)return;
   const data=values.flatMap((row,j)=>row.map((v,i)=>[i,j,v]));
   option=charts.heatmap(g.xs.map(fmt),g.ys.map(fmt),data,model.axes[g.xKey].label,model.axes[g.yKey].label,metric.unit,kind==='difference');
   if(kind==='difference')caption=metric.label+' ('+metric.unit+'): '+g.mode+' minus '+reference+(reference==='Intermittent HD'?' (first HD at '+hdStart+' h)':'')+'. Each cell uses the same input coordinates in both scenarios.';
   else{const lines=contours(g);option.series.push(...lines);caption=lines.length?'Interpolated contour levels ('+metric.unit+'): '+lines.map(s=>s.name).join(', ')+'.':'All sampled outputs are equal.';}
  }
  charts.draw(target,option);$('gridFigureStatus').textContent=caption;
 }catch(e){if(rev===version)$('gridFigureStatus').textContent=e.message;}
}
function setRaw(value){
 cancelPlay();raw=value;
 for(const id of ['exchangeFigure','compartments'])charts.dispose($(id));
 $('exchangeStatus').textContent='';$('compartmentValues').textContent='';
 if(raw){drawExchanges();frame();}
}
function drawExchanges(){
 if(!raw||!$('exchangePanel').open)return;
 const drains=raw.drains.filter(d=>d.complete),target=$('exchangeFigure');
 target.hidden=!drains.length;
 $('exchangeStatus').textContent=drains.length?drains.length+' completed exchanges. Hover for dwell start, drain time and mass.':'No completed PD exchanges in this scenario.';
 if(!drains.length)return;
 const s={type:'bar',name:'Drained amount',data:drains.map(d=>[d.end,d.mass]),barMaxWidth:22};
 const o=charts.options([s],'Drain time (h)','ACV equivalent (mg)');o.xAxis.max=raw.t.at(-1);o.tooltip={trigger:'item',renderMode:'richText',formatter:p=>{
  const d=drains[p.dataIndex];return fmt(d.start)+'–'+fmt(d.end)+' h · '+fmt(d.mass)+' mg';
 }};
 charts.draw(target,o);
}
function frame(){
 if(!raw||!$('compartmentPanel').open)return;
 const sample=raw.accounting[+$('time').value];if(!sample)return;
 const p=sample.parts,nodes=[['Oral depot',p.depot,12,45],['Central',p.central,45,45],['Peripheral',p.peripheral,79,20],['PD fluid',p.pdFluid,79,75]];
 const max=Math.max(1,raw.accounting.at(-1).input);
 charts.draw($('compartments'),{animation:false,aria:{enabled:true},xAxis:{show:false,min:0,max:100},yAxis:{show:false,min:0,max:100,inverse:true},grid:{left:4,right:4,top:15,bottom:42},
  series:[{type:'lines',coordinateSystem:'cartesian2d',silent:true,data:[[0,1],[1,2],[1,3]].map(([a,b])=>({coords:[nodes[a].slice(2),nodes[b].slice(2)]})),lineStyle:{color:'#667b85',opacity:.7}},
  {type:'scatter',symbolSize:v=>Math.max(3,75*Math.sqrt(Math.max(0,v[2])/max)),label:{show:true,position:'bottom',formatter:p=>p.name},data:nodes.map(([name,v,x,y])=>({name,value:[x,y,v]}))}]});
 $('compartmentValues').textContent=fmt(sample.time)+' h · '+nodes.map(([name,v])=>name+' '+fmt(v)+' mg').join(' · ');
}
$('gridFigurePanel').ontoggle=drawGrid;$('gridFigureKind').onchange=drawGrid;$('referenceMode').onchange=drawGrid;$('referenceStart').onchange=drawGrid;
for(const mode of root.RenalPKV7.MODES)$('referenceMode').add(new Option(mode,mode));
$('exchangePanel').ontoggle=drawExchanges;
$('compartmentPanel').ontoggle=()=>{if(!$('compartmentPanel').open)cancelPlay();else frame();};
$('playCompartments').onclick=()=>{
 if(playing||!raw){cancelPlay();return;}
 const time=$('time');if(+time.value===+time.max)time.value=0;
 $('playCompartments').textContent='Pause';time.dispatchEvent(new Event('input'));
 playing=setInterval(()=>{time.value=Math.min(+time.max,+time.value+Math.max(1,Math.floor(raw.t.length/180)));time.dispatchEvent(new Event('input'));if(+time.value===+time.max)cancelPlay();},100);
};
root.AyFluxExplorerFigures={newGrid,setRaw,frame};
})(window);
