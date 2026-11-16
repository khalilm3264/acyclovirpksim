/* Verify a stalled renderer becomes retryable without changing PK inputs. */
'use strict';
const assert=require('node:assert/strict');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../public');
const server=http.createServer((req,res)=>{
 let file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403);return res.end();}
 if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
 if(!fs.existsSync(file)){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type',({'.js':'application/javascript','.css':'text/css','.html':'text/html','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');
 fs.createReadStream(file).pipe(res);
});
(async()=>{
 let browser;
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({args:['--no-sandbox']});
  const page=await browser.newPage({serviceWorkers:'block'}),errors=[],held=[];
  page.on('pageerror',error=>errors.push(error.message));
  // Hold both the preload and dynamic request without generating an error event.
  await page.route('**/assets/vendor/echarts-6.1.0.min.js*',route=>{
   if(new URL(route.request().url()).searchParams.has('retry'))return route.continue();
   held.push(route);
  });
  await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});
  await page.locator('#plasmaChart').scrollIntoViewIfNeeded();
  const retry=page.getByRole('button',{name:'Retry charts',exact:true});
  await retry.waitFor({state:'visible',timeout:45000});
  assert.match(await page.locator('#plasmaChart').textContent(),/Chart unavailable/);
  await retry.click();
  await page.locator('#plasmaChart').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.documentElement.dataset.ayfluxReady==='true');
  assert.equal(await retry.count(),0);
  assert.ok(await page.evaluate(()=>echarts.getInstanceByDom(document.getElementById('plasmaChart')).getOption().series.length>0));
  await page.evaluate(()=>{window.retryEcharts=window.echarts;window.retryChart=echarts.getInstanceByDom(document.getElementById('plasmaChart'));});
  for(const route of held)await route.fulfill({contentType:'application/javascript',body:fs.readFileSync(path.join(root,'assets/vendor/echarts-6.1.0.min.js'),'utf8')+';window.originalRendererDelivered=true;'});
  await page.waitForFunction(()=>window.originalRendererDelivered===true);
  // Let the late script's load event run after evaluation.
  await page.waitForFunction(()=>window.echarts===window.retryEcharts);
  assert.ok(await page.evaluate(()=>echarts===window.retryEcharts&&echarts.getInstanceByDom(document.getElementById('plasmaChart'))===window.retryChart),'Late original response must preserve the renderer and live chart registry');
  assert.deepEqual(errors,[]);
  console.log('Stalled preload/renderer timed out; Retry charts rendered the existing simulation without page errors; late original delivery preserved the active chart.');
 }finally{await browser?.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
