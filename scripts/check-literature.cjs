'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../public');
const server=http.createServer((req,res)=>{
 let file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
 if(!(file===root||file.startsWith(root+path.sep))||!fs.existsSync(file)){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type',({'.js':'application/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');
 fs.createReadStream(file).pipe(res);
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{})});
 try{
 const page=await browser.newPage({serviceWorkers:'block',viewport:{width:1400,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);
 await page.waitForFunction(()=>window.AyFluxResearchBridge?.snapshot().updated);
 await page.locator('#literatureCase').evaluate(el=>{el.closest('section').classList.remove('hidden');});
 await page.selectOption('#literatureCase','laskin');await page.click('#runLiterature');
 await page.waitForFunction(()=>document.querySelectorAll('#literatureRows tr').length===3);
 await page.waitForSelector('#literaturePlot canvas');
 assert.equal(await page.locator('#literatureRows tr').count(),3);
 await page.selectOption('#literatureCase','smith-ckd');await page.click('#runLiterature');
 await page.waitForFunction(()=>document.querySelectorAll('#literatureRows tr').length===1);
 await page.waitForSelector('#literaturePlot canvas');
 assert.match(await page.locator('#literatureRows').innerText(),/0.909/);
 await page.click('#runHeatmap');
 await page.waitForFunction(()=>document.querySelector('#heatmapStatus').textContent.includes('Elapsed'),{timeout:30000});
 assert.equal(await page.locator('#heatmapTable tbody tr').count(),7);
 await page.click('#runHdTiming');
 await page.waitForFunction(()=>document.querySelector('#hdTimingArea table')!==null,{timeout:30000});
 console.log(await page.locator('#heatmapStatus').innerText());
 console.log(await page.locator('#hdTimingStatus').innerText());
 await page.setViewportSize({width:390,height:844});
 // Charts resize on the next frames after the viewport change; wait for layout to settle instead of measuring at once.
 await page.waitForFunction(()=>document.documentElement.scrollWidth<=window.innerWidth+2,null,{timeout:10000});
 assert.deepEqual(errors,[]);
 console.log('No page errors or mobile horizontal overflow');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
