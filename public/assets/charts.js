// Shared chart options and lazy, same-origin renderer loading.
(function(root){
 'use strict';
 let pending;
 function ensure(){
  if(root.echarts?.init)return Promise.resolve(root.echarts);
  if(!pending)pending=new Promise((resolve,reject)=>{
   const script=document.createElement('script');
   script.async=true;
   script.src='/assets/vendor/echarts-6.1.0.min.js';
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
 // Colorblind-safe display preference shared by every AyFlux page. It stores one flag, never simulation data.
 const PREFERENCE='ayflux-colorblind';
 let accessibleColors=false;
 try{accessibleColors=root.localStorage?.getItem(PREFERENCE)==='1';}catch(_){}
 function accessible(){return accessibleColors;}
 function setAccessible(on){
  accessibleColors=!!on;
  try{root.localStorage?.setItem(PREFERENCE,accessibleColors?'1':'0');}catch(_){}
 }
 // Vivid ramps for the default view; viridis and blue–orange ramps stay readable with color-vision deficiency.
 const HEAT={
  vivid:{sequential:['#5e4fa2','#3288bd','#66c2a5','#abdda4','#e6f598','#fee08b','#fdae61','#f46d43','#d53e4f','#9e0142'],
   diverging:['#313695','#4575b4','#abd9e9','#ffffbf','#fdae61','#d73027','#a50026']},
  accessible:{sequential:['#440154','#414487','#2a788e','#22a884','#7ad151','#fde725'],
   diverging:['#2166ac','#92c5de','#f5f5f5','#f1a340','#b35806']}
 };
 function heatColors(diverging=false){return HEAT[accessibleColors?'accessible':'vivid'][diverging?'diverging':'sequential'].slice();}
 // Interpolated cell fill plus a text color with adequate contrast, for the numeric table alternative.
 function heatColorAt(fraction,diverging=false){
  const stops=heatColors(diverging),f=Math.min(1,Math.max(0,Number.isFinite(fraction)?fraction:0))*(stops.length-1);
  const i=Math.min(stops.length-2,Math.floor(f)),t=f-i;
  const rgb=hex=>[1,3,5].map(k=>parseInt(hex.slice(k,k+2),16));
  const a=rgb(stops[i]),b=rgb(stops[i+1]),mix=a.map((v,k)=>Math.round(v+(b[k]-v)*t));
  // WCAG relative luminance; use whichever of black or white text (always at least 4.5:1) contrasts more with the fill.
  const [r,g,bl]=mix.map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);}),luminance=.2126*r+.7152*g+.0722*bl;
  return {fill:'rgb('+mix.join(',')+')',text:(luminance+.05)/.05>1.05/(luminance+.05)?'#000000':'#ffffff'};
 }
 // Plotly-style navigation: drag a box to zoom, double-click to reset, plus pan and step-zoom buttons.
 const ICONS={
  pan:'path://M12 2l3 3h-2v6h6V9l3 3-3 3v-2h-6v6h2l-3 3-3-3h2v-6H5v2l-3-3 3-3v2h6V5H9z',
  zoomIn:'path://M10 2a8 8 0 1 0 5 14.3l5.4 5.3 1.4-1.4-5.3-5.4A8 8 0 0 0 10 2zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12zM9 7v2H7v2h2v2h2v-2h2V9h-2V7z',
  zoomOut:'path://M10 2a8 8 0 1 0 5 14.3l5.4 5.3 1.4-1.4-5.3-5.4A8 8 0 0 0 10 2zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12zM7 9h6v2H7z'
 };
 const NAV=['ayNavX','ayNavY'],dragModes=new WeakMap();
 const finePointer=()=>{try{return !root.matchMedia||root.matchMedia('(pointer:fine)').matches;}catch(_){return true;}};
 const instance=api=>root.echarts?.getInstanceByDom(api.getDom());
 function setDragMode(chart,mode){
  if(!chart||chart.isDisposed?.())return;
  const pan=mode==='pan';dragModes.set(chart,mode);
  chart.setOption({toolbox:{feature:{myPan:{iconStyle:{borderColor:pan?'#1767a0':'#666',borderWidth:pan?2:1}}}}});
  chart.dispatchAction({type:'takeGlobalCursor',key:'dataZoomSelect',dataZoomSelectActive:mode==='zoom'});
  const el=chart.getDom();if(el?.style){el.style.touchAction=pan?'none':'';el.dataset.dragMode=pan?'pan':'zoom';}
 }
 function gridRect(chart){try{return chart.getModel().getComponent('grid',0).coordinateSystem.getRect();}catch(_){return null;}}
 function panBy(chart,dx,dy){
  const rect=gridRect(chart),zooms=chart.getOption().dataZoom||[],batch=[];if(!rect)return;
  // Dragging right shows earlier x values; dragging down shows higher y values.
  for(const [id,pixels,length] of [[NAV[0],-dx,rect.width],[NAV[1],dy,rect.height]]){
   const z=zooms.find(item=>item.id===id);if(!z||!length||!pixels)continue;
   const span=z.end-z.start,start=Math.min(100-span,Math.max(0,z.start+pixels/length*span));
   if(start!==z.start)batch.push({dataZoomId:id,start,end:start+span});
  }
  if(batch.length)chart.dispatchAction({type:'dataZoom',batch});
 }
 // Pan uses pointer events on the chart container, so it behaves the same after any number of box zooms.
 function installPan(el,chart){
  if(!el.addEventListener)return;
  let last=null,pending=null,frame=0;
  const flush=()=>{frame=0;if(pending&&!chart.isDisposed()){panBy(chart,pending[0],pending[1]);}pending=null;};
  el.addEventListener('pointerdown',event=>{
   if(dragModes.get(chart)!=='pan'||event.button!==0||chart.isDisposed())return;
   const box=el.getBoundingClientRect(),rect=gridRect(chart),x=event.clientX-box.left,y=event.clientY-box.top;
   if(!rect||x<rect.x||x>rect.x+rect.width||y<rect.y||y>rect.y+rect.height)return;
   last=[event.clientX,event.clientY];el.setPointerCapture?.(event.pointerId);el.style.cursor='grabbing';event.preventDefault();
  },true);
  el.addEventListener('pointermove',event=>{
   if(!last)return;
   pending=[(pending?.[0]||0)+event.clientX-last[0],(pending?.[1]||0)+event.clientY-last[1]];last=[event.clientX,event.clientY];
   if(!frame)frame=(root.requestAnimationFrame||setTimeout)(flush);
  },true);
  const end=()=>{if(!last)return;last=null;el.style.cursor='';};
  el.addEventListener('pointerup',end,true);el.addEventListener('pointercancel',end,true);
 }
 function zoomBy(chart,factor){
  const zooms=chart?.getOption().dataZoom||[];
  for(const id of NAV){
   const z=zooms.find(item=>item.id===id);if(!z)continue;
   const middle=(z.start+z.end)/2,half=Math.min(50,Math.max(.5,(z.end-z.start)/2*factor));
   let start=middle-half,end=middle+half;
   if(start<0){end-=start;start=0;}
   if(end>100){start-=end-100;end=100;}
   chart.dispatchAction({type:'dataZoom',dataZoomId:id,start:Math.max(0,start),end:Math.min(100,end)});
  }
 }
 function resetView(chart){
  if(!chart||chart.isDisposed?.())return;
  chart.dispatchAction({type:'restore'});
 }
 function navigation(){
  return {
   dataZoom:[
    {id:NAV[0],type:'inside',xAxisIndex:0,filterMode:'none',zoomOnMouseWheel:'shift',moveOnMouseMove:false,moveOnMouseWheel:false},
    {id:NAV[1],type:'inside',yAxisIndex:0,filterMode:'none',zoomOnMouseWheel:false,moveOnMouseMove:false,moveOnMouseWheel:false}],
   toolbox:{right:10,itemSize:15,itemGap:9,feature:{
    dataZoom:{filterMode:'none',title:{zoom:'Box zoom: drag on the graph',back:'Undo last zoom'}},
    myPan:{show:true,title:'Pan: drag to move the view (click again to return to box zoom)',icon:ICONS.pan,
     onclick:(model,api)=>{const chart=instance(api);setDragMode(chart,dragModes.get(chart)==='pan'?'zoom':'pan');}},
    myZoomIn:{show:true,title:'Zoom in',icon:ICONS.zoomIn,onclick:(model,api)=>zoomBy(instance(api),.5)},
    myZoomOut:{show:true,title:'Zoom out',icon:ICONS.zoomOut,onclick:(model,api)=>zoomBy(instance(api),2)},
    restore:{title:'Reset axes (or double-click the graph)'},
    saveAsImage:{pixelRatio:2,title:'Download image (PNG)'}}}};
 }
 function options(series,xName,yName){
  const nav=navigation();
  return {animation:false,backgroundColor:'#fff',aria:{enabled:true},series,
   grid:{left:64,right:20,top:38,bottom:84},legend:{type:'scroll',bottom:2,data:series.map(s=>s.name).filter(Boolean)},
   tooltip:{trigger:'axis',renderMode:'richText',confine:true,valueFormatter:v=>Number.isFinite(v)?Number(v.toFixed(3)):v},
   toolbox:nav.toolbox,dataZoom:nav.dataZoom,
   xAxis:{type:'value',min:0,name:xName,nameLocation:'middle',nameGap:28,axisLabel:{hideOverlap:true}},
   yAxis:{type:'value',name:yName,nameLocation:'middle',nameGap:44,splitLine:{lineStyle:{color:'#e5ebf0'}}}};
 }
 const observers=new WeakMap();
 function draw(el,option){
  let chart=root.echarts.getInstanceByDom(el);
  if(!chart){
   chart=root.echarts.init(el);
   el.addEventListener?.('dblclick',()=>resetView(chart),true);
   installPan(el,chart);
   // Restoring rebuilds the toolbox, so re-arm drag-to-zoom afterwards.
   chart.on('restore',()=>setTimeout(()=>{if(!chart.isDisposed()&&chart.getOption()?.toolbox?.[0]?.feature?.myPan)setDragMode(chart,finePointer()?'zoom':'off');},0));
   if(typeof ResizeObserver!=='undefined'){
    const observer=new ResizeObserver(()=>{
     if(el.clientWidth && el.clientHeight && (el.clientWidth!==chart.getWidth()||el.clientHeight!==chart.getHeight()))chart.resize();
    });
    observer.observe(el);observers.set(el,observer);
   }
  }
  chart.setOption(option,{notMerge:true});
  // Box zoom is armed by default with a mouse or trackpad; touch screens keep scrolling and use the toolbar.
  if(option.toolbox?.feature?.myPan&&option.toolbox.feature.dataZoom)setDragMode(chart,finePointer()?'zoom':'off');
  return chart;
 }
 function dispose(el){
  observers.get(el)?.disconnect();observers.delete(el);
  root.echarts?.getInstanceByDom(el)?.dispose();
 }
 function heatmap(xs,ys,data,xName,yName,unit,diverging=false){
  const values=data.map(p=>p[2]).filter(Number.isFinite);
  const extent=Math.max(1e-9,...values.map(Math.abs));
  const min=diverging?-extent:Math.min(...values),max=diverging?extent:Math.max(...values);
  return {animation:false,aria:{enabled:true},grid:{left:76,right:20,top:20,bottom:95},
   tooltip:{renderMode:'richText',formatter:p=>xName+' '+xs[p.value[0]]+' · '+yName+' '+ys[p.value[1]]+'\n'+Number(p.value[2].toPrecision(5))+' '+unit},
   xAxis:{type:'category',data:xs,name:xName,nameLocation:'middle',nameGap:30,axisLabel:{hideOverlap:true}},
   yAxis:{type:'category',data:ys,name:yName,nameLocation:'middle',nameGap:48},
   visualMap:{seriesIndex:0,dimension:2,min,max:max===min?min+1:max,left:'center',bottom:0,orient:'horizontal',inRange:{color:heatColors(diverging)}},
   series:[{type:'heatmap',data}]};
 }
 root.AyFluxCharts={ensure,line,band,options,draw,dispose,heatmap,heatColors,heatColorAt,accessible,setAccessible};
})(typeof window==='undefined'?globalThis:window);
