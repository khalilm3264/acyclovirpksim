'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
async function main(){
 const root=path.resolve(__dirname,'../public');
 const server=http.createServer((request,response)=>{
  const pathname=new URL(request.url,'http://localhost').pathname,file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep)||!fs.statSync(file,{throwIfNoEntry:false})?.isFile()){response.writeHead(404).end();return;}
  response.setHeader('Content-Type',({'.js':'application/javascript','.html':'text/html','.css':'text/css','.bib':'application/x-bibtex'})[path.extname(file)]||'application/octet-stream');
  fs.createReadStream(file).pipe(response);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch();
  for(const viewport of [{width:1280,height:900},{width:390,height:844}]){
   const page=await browser.newPage({viewport,serviceWorkers:'block'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:'+server.address().port);
   await page.waitForFunction(()=>window.AyFluxResearchBridge?.snapshot().updated,{},{timeout:60000});
   for(const [format,filename] of [['latex','ayflux_summary.tex'],['bibtex','ayflux.bib']]){
    const waiting=page.waitForEvent('download');await page.selectOption('#csv',format);const file=await waiting;
    assert.equal(file.suggestedFilename(),filename);const content=fs.readFileSync(await file.path(),'utf8');
    if(format==='latex'){
     assert.match(content,/\\begin\{tabular\}/);assert.match(content,/prior model-ensemble/);
     const snapshot=await page.evaluate(()=>window.AyFluxResearchBridge.snapshot());
     assert.ok(content.includes('0--'+snapshot.config.horizon+' h'));
     assert.ok(content.includes(String(Number(snapshot.results[snapshot.primary].summary.auc.median.toPrecision(5)))));
    }else assert.equal(content,fs.readFileSync(path.join(root,'references/ayflux.bib'),'utf8'));
    assert.equal(await page.inputValue('#csv'),'');
   }
   assert.deepEqual(errors,[]);await page.close();
  }
  console.log('Academic downloads passed on desktop and mobile');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
