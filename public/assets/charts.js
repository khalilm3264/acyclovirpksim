// Shared chart options and lazy, same-origin renderer loading.
(function(root){
 'use strict';
 let pending;
 function ensure(){
  if(root.echarts?.init)return Promise.resolve(root.echarts);
  if(!pending)pending=new Promise((resolve,reject)=>{
   const script=document.createElement('script');
   script.async=true;
   script.src='/assets/vendor/echarts-5.6.0.min.js';
   script.onload=()=>root.echarts?.init?resolve(root.echarts):reject(Error('Chart library unavailable.'));
   script.onerror=()=>{script.remove?.();reject(Error('Chart library could not be loaded.'));};
   document.head.appendChild(script);
  }).catch(error=>{pending=null;throw error;});
  return pending;
 }
 function line(name,time,values,color,width=2,type='solid'){
  return {name,type:'line',showSymbol:false,data:time.map((t,i)=>[t,values[i]]),
   itemStyle:{color},lineStyle:{color,width,type}};
 }
 function band(name,time,lower,upper,color){
  // One quadrilateral per time segment. Both edges participate in axis scaling.
  const data=time.slice(1).map((t,i)=>[time[i],t,lower[i],lower[i+1],upper[i],upper[i+1]]);
  return {name,type:'custom',data,encode:{x:[0,1],y:[2,3,4,5]},silent:true,clip:true,z:1,
   itemStyle:{color},tooltip:{show:false},renderItem:(params,api)=>{
    const point=(x,y)=>api.coord([api.value(x),api.value(y)]);
    return {type:'polygon',shape:{points:[point(0,2),point(1,3),point(1,5),point(0,4)]},style:{fill:color}};
   }};
 }
 function options(series,xName,yName){
  return {animation:false,backgroundColor:'#fff',aria:{enabled:true},series,
   grid:{left:64,right:20,top:38,bottom:84},legend:{type:'scroll',bottom:2,data:series.map(s=>s.name).filter(Boolean)},
   tooltip:{trigger:'axis',renderMode:'richText',confine:true,valueFormatter:v=>Number.isFinite(v)?Number(v.toFixed(3)):v},
   toolbox:{right:10,feature:{dataZoom:{yAxisIndex:'none',filterMode:'none'},restore:{},saveAsImage:{pixelRatio:2}}},
   xAxis:{type:'value',min:0,name:xName,nameLocation:'middle',nameGap:28,axisLabel:{hideOverlap:true}},
   yAxis:{type:'value',name:yName,nameLocation:'middle',nameGap:44,splitLine:{lineStyle:{color:'#e5ebf0'}}}};
 }
 const observers=new WeakMap();
 function draw(el,option){
  let chart=root.echarts.getInstanceByDom(el);
  if(!chart){
   chart=root.echarts.init(el);
   if(typeof ResizeObserver!=='undefined'){
    const observer=new ResizeObserver(()=>{
     if(el.clientWidth && el.clientHeight && (el.clientWidth!==chart.getWidth()||el.clientHeight!==chart.getHeight()))chart.resize();
    });
    observer.observe(el);observers.set(el,observer);
   }
  }
  chart.setOption(option,{notMerge:true});
  return chart;
 }
 function dispose(el){
  observers.get(el)?.disconnect();observers.delete(el);
  root.echarts?.getInstanceByDom(el)?.dispose();
 }
 root.AyFluxCharts={ensure,line,band,options,draw,dispose};
})(typeof window==='undefined'?globalThis:window);
