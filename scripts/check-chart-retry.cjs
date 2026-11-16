// Browser check: retry a failed renderer while the chart tab is hidden.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright');

async function main(){
 const root=path.resolve(__dirname,'../public');
 const server=http.createServer((request,response)=>{
  const pathname=new URL(request.url,'http://localhost').pathname;
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep)||!fs.statSync(file,{throwIfNoEntry:false})?.isFile()){response.writeHead(404).end();return;}
  response.setHeader('Content-Type',({'.js':'application/javascript','.html':'text/html','.css':'text/css'})[path.extname(file)]||'application/octet-stream');
  fs.createReadStream(file).pipe(response);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1280,height:900},serviceWorkers:'block'});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  let fail=true,release;
  const retryGate=new Promise(resolve=>{release=resolve;});
  await page.route('**/assets/vendor/echarts-6.1.0.min.js*',async route=>{
   if(fail)await route.abort('failed');else{await retryGate;await route.continue();}
  });
  await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});
  const retry=page.getByRole('button',{name:'Retry charts',exact:true});
  await retry.waitFor({state:'visible'});
  await page.waitForFunction(()=>window.AyFluxResearchBridge.snapshot().updated,null,{timeout:60000});
  await page.click('[data-tab="timeline"]');
  assert.equal(await page.locator('#plasmaChart').isVisible(),false);
  const before=await page.evaluate(()=>window.AyFluxResearchBridge.snapshot().revision);
  fail=false;
  const request=page.waitForRequest(r=>r.url().includes('/assets/vendor/echarts-6.1.0.min.js?retry='),{timeout:10000});
  await retry.click();await request;
  assert.match(await page.textContent('#alerts'),/Loading interactive charts/);
  release();
  await page.waitForFunction(()=>!!window.echarts?.init&&document.querySelector('#alerts').textContent==='');
  assert.equal(await page.evaluate(()=>window.AyFluxResearchBridge.snapshot().revision),before,'retry must not rerun the model');
  await page.click('[data-tab="concentration"]');await page.locator('#plasmaChart').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>{
   const snapshot=window.AyFluxResearchBridge.snapshot(),d=snapshot.results[snapshot.primary];
   const series=window.echarts.getInstanceByDom(document.querySelector('#plasmaChart'))?.getOption().series;
   const selected=series?.find(s=>s.name===snapshot.primary+' (selected)');
   return selected&&JSON.stringify(selected.data)===JSON.stringify(d.time.map((t,i)=>[t,d.plasma.median[i]]));
  },null,{timeout:60000});
  assert.equal(await page.locator('#plasmaChart .chart-status').count(),0);
  assert.deepEqual(errors,[]);
  console.log('Offscreen Retry charts fetches the renderer, reports progress, preserves the model revision, and draws exact current points on return.');
 }finally{try{await browser?.close();}finally{server.close();}}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
