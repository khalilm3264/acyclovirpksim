// Measure queued-chart callbacks after scrolling during a held renderer download.
// Optional argument: a previous simulator-ui.js for a before/after comparison.
// --margin keeps the earlier charts just above the viewport, in the preloading margin.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright');

async function main(){
 const root=path.resolve(__dirname,'../public');
 const previous=process.argv.slice(2).find(arg=>arg!=='--margin'),margin=process.argv.includes('--margin');
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
  const source=fs.readFileSync(previous||path.join(root,'assets/simulator-ui.js'),'utf8');
  await page.route('**/assets/simulator-ui.js',route=>route.fulfill({contentType:'application/javascript',body:source.replace('function drawNextPlot(){','function drawNextPlot(){window.queueFrames=(window.queueFrames||0)+1;').replace('function requestPlotFrame(', 'window.queueKeys=()=>Array.from(pendingPlots.keys());\nfunction requestPlotFrame(')}));
  let release;
  const gate=new Promise(resolve=>{release=resolve;});
  await page.route('**/assets/vendor/echarts-6.1.0.min.js*',async route=>{await gate;await route.continue();});
  await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!document.querySelector('#saveBaseline').disabled,null,{timeout:60000});
  for(const id of ['plasmaChart','csfChart','cmmgChart','csfCmmgChart']){
   await page.locator('#'+id).scrollIntoViewIfNeeded();
   await page.waitForFunction(id=>window.queueKeys().includes(id),id);
  }
  if(margin){
   await page.evaluate(()=>window.scrollBy({top:document.querySelector('#plasmaChart').getBoundingClientRect().bottom+40,behavior:'instant'}));
   await page.waitForFunction(()=>{const r=document.querySelector('#plasmaChart').getBoundingClientRect();return r.bottom<0&&r.bottom>=-160;});
  }else{
   await page.evaluate(()=>document.querySelector('#csfCmmgChart').scrollIntoView({block:'start',behavior:'instant'}));
   await page.waitForFunction(()=>document.querySelector('#csfCmmgChart').getBoundingClientRect().top<innerHeight&&document.querySelector('#plasmaChart').getBoundingClientRect().bottom< -160);
  }
  const queued=await page.evaluate(()=>window.queueKeys());
  await page.evaluate(()=>{
   const draw=window.AyFluxCharts.draw;window.drawTrace=[];
   window.AyFluxCharts.draw=(el,option)=>{window.drawTrace.push({id:el.id,frame:window.queueFrames});return draw(el,option);};
  });
  release();
  await page.waitForFunction(()=>window.drawTrace.some(d=>d.id==='cmmgChart'),null,{timeout:60000});
  const visibleDraw=await page.evaluate(()=>window.drawTrace.find(d=>d.id==='cmmgChart'));
  if(margin)await page.waitForFunction(()=>window.drawTrace.length===4);
  const trace=await page.evaluate(()=>window.drawTrace);
  console.log(JSON.stringify({source:previous||'current',margin,queued,visibleDraw,trace,errors}));
  if(!previous)assert.equal(visibleDraw.frame,1,'offscreen chart jobs should not delay the visible chart');
  assert.deepEqual(errors,[]);
 }finally{try{await browser?.close();}finally{server.close();}}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
