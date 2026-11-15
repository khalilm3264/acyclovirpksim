'use strict';
const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../public');
const server=http.createServer((req,res)=>{
 let file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(file!==root&&!file.startsWith(root+path.sep))return res.writeHead(403).end();
 if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
 if(!fs.existsSync(file))return res.writeHead(404).end();
 res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.html')?'text/html':'application/octet-stream');fs.createReadStream(file).pipe(res);
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({args:['--no-sandbox']});
 try{for(const width of [1280,390]){
  const page=await browser.newPage({viewport:{width,height:900},isMobile:width<650,hasTouch:width<650,serviceWorkers:'block'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/');
  await page.waitForFunction(()=>!document.getElementById('saveBaseline').disabled);
  await page.locator('#summaryMore summary').click();
  const field=page.getByLabel('Plasma acyclovir threshold',{exact:true});
  const revision=await page.evaluate(()=>AyFluxResearchBridge.snapshot().revision);
  await page.locator('#comparisonPanel summary').click();
  async function smallState(value){
   await page.waitForFunction(value=>{
    const plots=[...document.getElementById('multipleCharts').children];
    return plots.length&&plots.every(el=>{const option=window.echarts?.getInstanceByDom(el)?.getOption(),line=option?.series.find(s=>s.id==='entered-plasma-threshold');return option&&(value===null?!line:line&&Math.abs(line.data[0][1]-value)<.00001);});
   },value);
   return page.evaluate(()=>[...document.getElementById('multipleCharts').children].map(el=>{
    const c=echarts.getInstanceByDom(el),o=c.getOption(),line=o.series.find(s=>s.id==='entered-plasma-threshold');
    return {value:line?.data[0][1]??null,label:line?.markLine.label.formatter,legend:o.legend[0].data,x:c.getModel().getComponent('xAxis').axis.scale.getExtent(),y:c.getModel().getComponent('yAxis').axis.scale.getExtent(),unit:o.yAxis[0].name};
   }));
  }

  const state=()=>page.evaluate(()=>{
   const chart=echarts.getInstanceByDom(document.getElementById('plasmaChart')),option=chart.getOption(),line=option.series.find(s=>s.id==='entered-plasma-threshold');
   return {line:line?{value:line.data[0][1],name:line.name,label:line.markLine.label.formatter}:null,x:chart.getModel().getComponent('xAxis').axis.scale.getExtent(),y:chart.getModel().getComponent('yAxis').axis.scale.getExtent(),legend:option.legend[0].data};
  });
  async function waitLine(value){await page.locator('#plasmaChart').scrollIntoViewIfNeeded();await page.waitForFunction(value=>{
   const line=window.echarts?.getInstanceByDom(document.getElementById('plasmaChart'))?.getOption().series.find(s=>s.id==='entered-plasma-threshold');
   return value===null?!line:line&&Math.abs(line.data[0][1]-value)<.00001;
  },value);return state();}
  await field.fill('100');let s=await waitLine(100);assert.ok(s.y[1]>=100,'Threshold participates in y-axis scaling');assert.ok(s.legend.includes('Entered plasma ACV threshold, 100 mg/L'));assert.equal(s.line.label,'Threshold 100 mg/L');
  assert.ok((await smallState(100)).every(p=>p.y[1]>=100&&p.legend.includes('Entered plasma ACV threshold, 100 mg/L')));
  await page.evaluate(()=>echarts.getInstanceByDom(document.getElementById('multipleCharts').firstElementChild).dispatchAction({type:'dataZoom',dataZoomId:'ayNavX',start:25,end:75}));
  await page.evaluate(()=>echarts.getInstanceByDom(document.getElementById('multipleCharts').firstElementChild).dispatchAction({type:'dataZoom',dataZoomId:'ayNavY',startValue:5,endValue:10}));
  const smallZoom=(await smallState(100))[0].x;
  const smallY=(await smallState(100))[0].y;assert.deepEqual(smallY,[5,10]);
  // ECharts action only establishes a zoomed starting view; edits use the normal form.
  await page.evaluate(()=>echarts.getInstanceByDom(document.getElementById('plasmaChart')).dispatchAction({type:'dataZoom',dataZoomId:'ayNavX',start:25,end:75}));
  await page.evaluate(()=>echarts.getInstanceByDom(document.getElementById('plasmaChart')).dispatchAction({type:'dataZoom',dataZoomId:'ayNavY',startValue:5,endValue:10}));
  const zoomed=(await state()).x,zoomedY=(await state()).y;assert.deepEqual(zoomedY,[5,10]);
  await field.fill('5');s=await waitLine(5);assert.deepEqual(s.x,zoomed,'Editing threshold preserves zoom');assert.deepEqual((await smallState(5))[0].x,smallZoom);assert.deepEqual(s.y,zoomedY);assert.deepEqual((await smallState(5))[0].y,smallY);
  await page.selectOption('#concUnit','umol');s=await waitLine(5*1000/225.21);assert.match(s.line.name,/µmol\/L/);assert.ok(Math.abs(Number(await field.inputValue())-5*1000/225.21)<.0001);assert.deepEqual(s.x,zoomed);assert.ok(s.y.every((v,i)=>Math.abs(v-zoomedY[i]*1000/225.21)<.00001),'Zoomed concentration window follows converted units');
  assert.ok((await smallState(5)).every(p=>p.unit.includes('mg/L')&&p.label==='Threshold 5 mg/L'),'Small multiples keep their own mg/L scale');
  await field.fill('10');await waitLine(10);await smallState(10*225.21/1000);
  await field.fill(String(5*1000/225.21));await waitLine(5*1000/225.21);await smallState(5);
  await page.selectOption('#concUnit','mg');s=await waitLine(5);assert.ok(s.y.every((v,i)=>Math.abs(v-zoomedY[i])<.00001));
  await page.evaluate(()=>{for(const el of [document.getElementById('plasmaChart'),...document.getElementById('multipleCharts').children])echarts.getInstanceByDom(el).dispatchAction({type:'dataZoom',dataZoomId:'ayNavY',start:0,end:100});});
  await field.fill('0');s=await waitLine(0);assert.equal(s.line.label,'Threshold 0 mg/L');assert.ok((await smallState(0)).every(p=>p.label==='Threshold 0 mg/L'));
  const paintedLabel=await page.evaluate(()=>{
   const chart=echarts.getInstanceByDom(document.getElementById('plasmaChart'));
   const text=chart.getZr().storage.getDisplayList().find(el=>el.style?.text==='Threshold 0 mg/L');
   if(!text)return null;
   const rect=text.getBoundingRect().clone();rect.applyTransform(text.getComputedTransform());
   return {x:rect.x,y:rect.y,width:rect.width,height:rect.height,chartWidth:chart.getWidth(),chartHeight:chart.getHeight(),font:text.style.font};
  });
  assert.ok(paintedLabel,'Zero threshold label is actually painted');
  assert.ok(Number(paintedLabel.font.match(/([0-9.]+)px/)[1])>=12,'Threshold label uses at least12px text');
  assert.ok(paintedLabel.x>=0&&paintedLabel.y>=0&&paintedLabel.x+paintedLabel.width<=paintedLabel.chartWidth&&paintedLabel.y+paintedLabel.height<=paintedLabel.chartHeight,'Threshold label fits the mobile/desktop chart');

  await field.fill('');s=await waitLine(null);assert.ok(!s.legend.some(n=>n.startsWith('Entered plasma ACV threshold')));assert.deepEqual(s.x,zoomed);assert.ok((await smallState(null)).every(p=>!p.legend.some(n=>n.startsWith('Entered plasma ACV threshold'))));
  await field.fill('-1');await waitLine(null);
  // A zoom beyond the remaining curves survives clearing, then double-click resets it.
  await field.fill('1000');await waitLine(1000);await smallState(1000);
  await page.evaluate(()=>{for(const el of [document.getElementById('plasmaChart'),document.getElementById('multipleCharts').firstElementChild])echarts.getInstanceByDom(el).dispatchAction({type:'dataZoom',dataZoomId:'ayNavY',startValue:950,endValue:990});});
  await field.fill('');s=await waitLine(null);assert.deepEqual(s.y,[950,990]);assert.deepEqual((await smallState(null))[0].y,[950,990]);
  await page.locator('#plasmaChart').dblclick();
  await page.waitForFunction(()=>echarts.getInstanceByDom(document.getElementById('plasmaChart')).getModel().getComponent('yAxis').axis.scale.getExtent()[1]<950);
  assert.equal((await state()).x[0],0,'Main Reset axes returns to the full time window');
  await page.locator('#multipleCharts > div').first().dblclick();
  await page.waitForFunction(()=>echarts.getInstanceByDom(document.getElementById('multipleCharts').firstElementChild).getModel().getComponent('yAxis').axis.scale.getExtent()[1]<950);
  assert.equal((await smallState(null))[0].x[0],0,'Small-multiple Reset axes returns to full time');

  await field.fill('5');await waitLine(5);
  for(const id of ['csfChart','cmmgChart','csfCmmgChart']){
   await page.locator('#'+id).scrollIntoViewIfNeeded();
   await page.waitForFunction(id=>window.echarts?.getInstanceByDom(document.getElementById(id)),id);
   assert.ok(await page.evaluate(id=>!echarts.getInstanceByDom(document.getElementById(id)).getOption().series.some(s=>s.id==='entered-plasma-threshold'),id),'Plasma threshold is not copied to '+id);
  }
  assert.equal(await page.evaluate(()=>AyFluxResearchBridge.snapshot().revision),revision,'Threshold edits do not recompute predictions');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+2));assert.deepEqual(errors,[]);
  console.log('PASS '+width+'px threshold high/zero/clear/invalid, legend, units, axis scale and preserved zoom');await page.close();
 }}finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
