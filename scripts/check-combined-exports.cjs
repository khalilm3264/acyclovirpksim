/* Exercise the export integrations and a real service-worker install together. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../public');
const server=http.createServer((req,res)=>{
 let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 if(fs.statSync(file,{throwIfNoEntry:false})?.isDirectory())file=path.join(file,'index.html');
 if(!fs.statSync(file,{throwIfNoEntry:false})?.isFile()){res.writeHead(404).end();return;}
 res.setHeader('Content-Type',({'.js':'application/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch();
  for(const viewport of [{width:1280,height:900},{width:390,height:844}]){
   const context=await browser.newContext({viewport}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:'+server.address().port+'/');
   await page.waitForFunction(()=>window.AyFluxResearchBridge?.snapshot().updated,{},{timeout:60000});
   const formats=await page.locator('#csv option').evaluateAll(nodes=>nodes.map(n=>n.value).filter(Boolean));
   assert.deepEqual(formats.slice().sort(),['wide','tidy','events','xlsx','latex','bibtex','print','python','r'].sort());
   assert.equal(new Set(formats).size,formats.length);
   // Denial must expose a current local note for manual copying.
   await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.reject(Error('denied for test'))}}));
   await page.click('#copyTeaching');await page.locator('#teachingFallback').waitFor({state:'visible'});
   assert.match(await page.inputValue('#teachingFallback'),/AyFlux v0.27.0/);
   assert.match(await page.inputValue('#teachingFallback'),/For research and teaching only/);
   const pending=page.waitForEvent('download');await page.selectOption('#csv','events');const file=await pending;
   assert.equal(file.suggestedFilename(),'ayflux_events.csv');const csv=fs.readFileSync(await file.path(),'utf8');
   assert.match(csv,/TIME,AMT,RATE,EVID,CMT,DV,MDV/);
   assert.ok(csv.split('\n').length>3);
   assert.equal(await page.locator('#teachingPrint').count(),0,'obsolete print surface must be absent');
   // A fresh install must cache the union of feature assets without duplicate-key failure.
   await page.waitForFunction(()=>navigator.serviceWorker.controller,{},{timeout:60000});
   const cached=await page.evaluate(async()=>{const cache=await caches.open((await caches.keys()).find(n=>n.startsWith('ayflux-static-')));return (await cache.keys()).map(r=>new URL(r.url).pathname);});
   for(const resource of ['/assets/academic-exports.js','/references/ayflux.bib','/assets/scenario-script.js','/assets/scenario-summary.js','/assets/scenario-summary.css','/assets/teaching-exports.js'])assert.ok(cached.includes(resource),resource+' must be precached');
   await context.setOffline(true);await page.reload();
   await page.waitForFunction(()=>window.AyFluxResearchBridge?.snapshot().updated,{},{timeout:60000});
   const latex=page.waitForEvent('download');await page.selectOption('#csv','latex');assert.equal((await latex).suggestedFilename(),'ayflux_summary.tex');
   await page.selectOption('#csv','print');await page.locator('#ayfluxScenarioSummary[open]').waitFor();
   await page.keyboard.press('Escape');assert.equal(await page.locator('body').evaluate(b=>b.classList.contains('ay-summary-open')),false);
   assert.deepEqual(errors,[]);await context.close();
  }
  console.log('Combined export menu, clipboard fallback, event CSV, print and clean offline install passed');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
