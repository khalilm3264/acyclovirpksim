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
  await page.route('**/assets/simulator-worker.js',async route=>{
   await workerGate;await route.continue();
  });
  const rendererRequested=page.waitForRequest('**/assets/vendor/echarts-6.1.0.min.js');
  await page.goto('http://127.0.0.1:'+server.address().port);
  try{
   assert.equal(await page.locator('#plasmaChart canvas').count(),0);
   await page.locator('#plasmaChart').scrollIntoViewIfNeeded();
   await rendererRequested;
   assert.equal(await page.locator('#csv').isDisabled(),true,'Renderer request must precede simulation completion');
  }finally{releaseWorker();}
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
  assert.deepEqual(errors,[]);
  console.log('Firefox: renderer starts during calculation; plasma curve matches every modeled point before and after dose edit; renal profile renders on the second axis.');
 }finally{await browser?.close();server.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
