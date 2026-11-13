const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
(async()=>{
 const root=path.resolve(__dirname,'../public');
 const server=http.createServer((req,res)=>{
  let name=new URL(req.url,'http://localhost').pathname;
  if(name.endsWith('/'))name+='index.html';
  const file=path.resolve(root,'.'+name);
  if(!file.startsWith(root+path.sep)||!fs.statSync(file,{throwIfNoEntry:false})?.isFile()){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',({'.js':'application/javascript','.html':'text/html','.css':'text/css'})[path.extname(file)]||'application/octet-stream');
  fs.createReadStream(file).pipe(res);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try {
 browser=await chromium.launch({args:['--no-sandbox']});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/research/exchanges/');
 await page.waitForFunction(()=>document.querySelectorAll('#exchanges tr').length===20);
 await page.waitForFunction(()=>window.echarts?.getInstanceByDom(document.querySelector('#chart')));
 assert.equal(await page.locator('#endpoints tr').count(),4);
 await page.locator('#horizon').fill('3.5');await page.locator('#horizon').dispatchEvent('change');
 await page.waitForFunction(()=>document.querySelector('#balance').textContent.includes('Cumulative PD removal 0.000'));
 assert.match(await page.locator('#drain').textContent(),/Still in cavity/);
 await page.locator('#replay').click();
 await page.selectOption('#sample','1');
 await page.locator('#shift').fill('1');await page.locator('#shift').dispatchEvent('input');
 assert.match(await page.locator('#timing').textContent(),/25.000 h/);
 await page.selectOption('#patient','boelaert-5');
 assert.match(await page.locator('#protocol').textContent(),/patient 5/);
 await page.setViewportSize({width:390,height:844});
 await page.waitForFunction(()=>document.documentElement.scrollWidth<=innerWidth);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));

 assert.deepEqual(errors,[]);console.log('Exchange inspector, replay, timing and mobile layout passed');
 } finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exit(1)});
