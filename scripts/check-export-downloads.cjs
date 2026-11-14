'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../public');
const server=http.createServer((req,res)=>{
 let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403);return res.end();}
 if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
 if(!fs.existsSync(file)){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type',({'.js':'application/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900},serviceWorkers:'block'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const url='http://127.0.0.1:'+server.address().port;
  await page.goto(url+'/');await page.waitForFunction(()=>!document.querySelector('#csv').disabled);
  for(const [format,extension] of [['python','py'],['r','R']]){
   const pending=page.waitForEvent('download');await page.selectOption('#csv',format);const file=await pending;
   assert.ok(file.suggestedFilename().endsWith('.'+extension));
   const content=fs.readFileSync(await file.path(),'utf8');assert.match(content,/Nominal systemic/);
   assert.ok(content.includes(format==='python'?'solve_ivp':'mrgsolve::mcode'));
  }
  await page.goto(url+'/lite/');await page.waitForFunction(()=>document.querySelector('#liteResults').children.length===5);
  await page.locator('[data-lite-mode="capd"]').uncheck();
  async function png(){const pending=page.waitForEvent('download');await page.click('#litePng');const f=await pending;const bytes=fs.readFileSync(await f.path());assert.equal(bytes.subarray(1,4).toString(),'PNG');assert.equal(bytes.readUInt32BE(16),1920);assert.equal(bytes.readUInt32BE(20),1280);if(process.env.EXPORT_PREVIEW_PATH)fs.copyFileSync(await f.path(),process.env.EXPORT_PREVIEW_PATH);}
  await png();
  await page.setViewportSize({width:390,height:844});
  await page.waitForFunction(()=>document.documentElement.scrollWidth<=innerWidth+1);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await png();
  await page.route('**/echarts-5.6.0.min.js',r=>r.abort());await page.reload();
  await page.waitForSelector('#acvChart > canvas');await page.waitForFunction(()=>document.querySelector('#liteResults').children.length===5);await png();
  assert.deepEqual(errors,[]);console.log('Python/R downloads and 1920×1280 Lite PNG passed on desktop/mobile and offline canvas fallback.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
