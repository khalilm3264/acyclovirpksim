// Exercise the default dose edit and both clearance axes in Firefox.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {firefox}=require('playwright');

async function main(){
 const root=path.resolve(__dirname,'../public');
 const server=http.createServer((request,response)=>{
  const pathname=new URL(request.url,'http://localhost').pathname;
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep)||!fs.statSync(file,{throwIfNoEntry:false})?.isFile()){
   response.writeHead(404).end();return;
  }
  response.setHeader('Content-Type',({'.js':'application/javascript','.html':'text/html','.css':'text/css'})[path.extname(file)]||'application/octet-stream');
  fs.createReadStream(file).pipe(response);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await firefox.launch();
  const page=await browser.newPage({viewport:{width:1280,height:900},serviceWorkers:'block'});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  // Hold model startup to prove a visible chart starts loading independently.
  // This checks event order rather than relying on a machine-dependent timing.
  let releaseWorker;
  const workerGate=new Promise(resolve=>{releaseWorker=resolve;});
  let releaseRenderer;
  const rendererGate=new Promise(resolve=>{releaseRenderer=resolve;});
  await page.route('**/assets/simulator-worker.js',async route=>{
   await workerGate;await route.continue();
  });
  await page.route('**/assets/vendor/echarts-6.1.0.min.js',async route=>{
   await rendererGate;await route.continue();
  });
  const rendererRequested=page.waitForRequest('**/assets/vendor/echarts-6.1.0.min.js');
  try{
   // Firefox can include the deliberately held Worker in the page load event.
   // The DOM is sufficient to scroll to the graph and inspect request order.
   await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});
   assert.equal(await page.locator('#plasmaChart canvas').count(),0);
   await page.locator('#plasmaChart').scrollIntoViewIfNeeded();
   await rendererRequested;
   assert.equal(await page.locator('#csv').isDisabled(),true,'Renderer request must precede simulation completion');
   assert.equal(await page.locator('#plasmaChart .chart-status').textContent(),'Calculating simulation…');
   assert.equal(await page.locator('#plasmaChart .chart-status').evaluate(el=>getComputedStyle(el).color),'rgb(40, 79, 107)','Loading text uses the existing AyFlux blue');
   releaseWorker();
   await page.waitForFunction(()=>!document.querySelector('#csv').disabled);
   assert.equal(await page.locator('#plasmaChart .chart-status').textContent(),'Loading chart…');
  }finally{releaseWorker();releaseRenderer();}
  async function verifyDose(dose){
   await page.waitForFunction(dose=>{
    const snapshot=window.AyFluxResearchBridge?.snapshot();
    if(!snapshot?.updated||snapshot.config.dose!==dose)return false;
    const data=snapshot.results[snapshot.primary];
    const series=window.echarts?.getInstanceByDom(document.querySelector('#plasmaChart'))?.getOption()?.series;
    const median=series?.find(s=>s.name===snapshot.primary+' (selected)');
    return median?.data.length===data.time.length && median.data.every(([t,v],i)=>t===data.time[i]&&v===data.plasma.median[i])
     && series.some(s=>s.type==='custom'&&s.name.includes('interval'));
   },dose,{timeout:60000});
  }
  await verifyDose(700);
  assert.equal(await page.locator('#plasmaChart .chart-status').count(),0);
  assert.equal(await page.locator('#plasmaChart').getAttribute('aria-busy'),'false');
  // Native Tab enters the chart from its preceding study picker.
  await page.locator('#studySelect').focus();await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'plasmaChart');
  assert.equal(await page.locator('#plasmaChart').evaluate(el=>getComputedStyle(el).outlineColor),'rgb(56, 125, 168)');
  assert.equal(await page.locator('#plasmaChart').evaluate(el=>getComputedStyle(el).outlineWidth),'2px');
  await page.keyboard.press('+');
  const keyboardWindow=()=>page.evaluate(()=>window.echarts.getInstanceByDom(document.querySelector('#plasmaChart')).getOption().dataZoom.map(z=>[z.start,z.end]));
  let bounds=await keyboardWindow();assert.ok(bounds.every(([start,end])=>end-start===50));
  await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowUp');
  const panned=await keyboardWindow();assert.ok(panned[0][0]>bounds[0][0]&&panned[1][0]>bounds[1][0]);
  await page.keyboard.press('-');assert.ok((await keyboardWindow()).every(([start,end])=>end-start===100));
  await page.keyboard.press('+');await page.keyboard.press('Home');
  assert.deepEqual(await keyboardWindow(),[[0,100],[0,100]]);
  await page.keyboard.press('Tab');assert.notEqual(await page.evaluate(()=>document.activeElement.id),'plasmaChart','Chart must not trap focus');
  // Wrapped export pickers and comparison buttons keep their blue focus cue.
  await page.locator('#concUnit').focus();await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'csv');
  assert.equal(await page.locator('#csv').evaluate(el=>getComputedStyle(el.parentElement).outlineColor),'rgb(56, 125, 168)');
  await page.locator('#regimenName').focus();await page.keyboard.type('Keyboard audit');await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'saveRegimen');
  await page.keyboard.press('Enter');assert.equal(await page.locator('#regimenRows tr').count(),2);
  // Exercise Firefox wheel zoom, pointer panning and responsive resizing.
  await page.locator('#plasmaChart').scrollIntoViewIfNeeded();
  const plot=await page.locator('#plasmaChart').boundingBox();
  const grid=await page.evaluate(()=>window.echarts.getInstanceByDom(document.querySelector('#plasmaChart')).getModel().getComponent('grid',0).coordinateSystem.getRect());
  const point=(x,y)=>({x:plot.x+grid.x+grid.width*x,y:plot.y+grid.y+grid.height*y});
  let a=point(.25,.25),b=point(.75,.75);
  await page.mouse.move(a.x,a.y);await page.keyboard.down('Shift');await page.mouse.wheel(0,-300);await page.keyboard.up('Shift');
  await page.waitForFunction(()=>window.echarts.getInstanceByDom(document.querySelector('#plasmaChart')).getOption().dataZoom[0].end-window.echarts.getInstanceByDom(document.querySelector('#plasmaChart')).getOption().dataZoom[0].start<90);
  const zoomBefore=await page.evaluate(()=>window.echarts.getInstanceByDom(document.querySelector('#plasmaChart')).getOption().dataZoom[0].start);
  await page.evaluate(()=>{const el=document.querySelector('#plasmaChart'),chart=window.echarts.getInstanceByDom(el);chart.getOption().toolbox[0].feature.myPan.onclick(null,{getDom:()=>el});});
  a=point(.6,.5);b=point(.4,.5);
  await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:12});await page.mouse.up();
  await page.waitForFunction(before=>window.echarts.getInstanceByDom(document.querySelector('#plasmaChart')).getOption().dataZoom[0].start>before,zoomBefore);
  const zoomed=await page.evaluate(()=>window.echarts.getInstanceByDom(document.querySelector('#plasmaChart')).getOption().dataZoom[0]);
  await page.setViewportSize({width:1000,height:800});
  await page.waitForFunction(()=>{const el=document.querySelector('#plasmaChart');return window.echarts.getInstanceByDom(el).getWidth()===el.clientWidth;});
  assert.deepEqual(await page.evaluate(()=>{const z=window.echarts.getInstanceByDom(document.querySelector('#plasmaChart')).getOption().dataZoom[0];return [z.start,z.end];}),[zoomed.start,zoomed.end]);
  await page.locator('#plasmaChart').dblclick();
  await page.waitForFunction(()=>{const z=window.echarts.getInstanceByDom(document.querySelector('#plasmaChart')).getOption().dataZoom[0];return z.start===0&&z.end===100;});
  await page.fill('#num_dose','725');
  await page.locator('#plasmaChart').scrollIntoViewIfNeeded();
  await verifyDose(725);
  await page.selectOption('#renalMode','profile');
  await page.click('[data-tab="clearance"]');
  await page.locator('#kidneyClearChart').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>{
   const option=window.echarts.getInstanceByDom(document.querySelector('#kidneyClearChart'))?.getOption();
   return option?.yAxis.length===2&&option.series.some(s=>s.name==='User-entered CrCl'&&s.yAxisIndex===1);
  });
  assert.equal(await page.locator('#kidneyClearChart .chart-status').count(),0);
  const failedPage=await browser.newPage({viewport:{width:1280,height:900},serviceWorkers:'block'});
  let heldRenderer;
  const heldRequest=new Promise(resolve=>{heldRenderer=resolve;});
  await failedPage.route('**/assets/vendor/echarts-6.1.0.min.js',route=>heldRenderer(route));
  try{
   await failedPage.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});
   await failedPage.locator('#plasmaChart').scrollIntoViewIfNeeded();
   const route=await heldRequest;
   await failedPage.waitForFunction(()=>!document.querySelector('#csv').disabled);
   // Let the accepted-results render attach its library error handler first.
   await failedPage.waitForFunction(()=>document.querySelector('#plasmaChart .chart-status')?.textContent==='Loading chart…');
   await failedPage.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   await route.abort();
   await failedPage.waitForFunction(()=>document.querySelector('#plasmaChart .chart-status')?.textContent==='Chart unavailable. Check your connection.');
   assert.equal(await failedPage.locator('#plasmaChart').getAttribute('aria-busy'),'false');
   await failedPage.unroute('**/assets/vendor/echarts-6.1.0.min.js');
   await failedPage.fill('#num_dose','725');
   await failedPage.locator('#plasmaChart').scrollIntoViewIfNeeded();
   await failedPage.waitForFunction(()=>document.querySelector('#plasmaChart canvas')&&!document.querySelector('#plasmaChart .chart-status'));
  }finally{await failedPage.close();}
  assert.deepEqual(errors,[]);
  console.log('Firefox: chart Tab/focus, keyboard zoom/pan/reset and escape via Tab, export/comparison keyboard controls, loading/retry, pointer navigation, exact plasma points and renal axis passed.');
 }finally{await browser?.close();server.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
