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
 const browser=await chromium.launch({args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900},serviceWorkers:'block'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/');
  await page.waitForFunction(()=>!document.querySelector('#csv').disabled);
  assert.equal(await page.locator('script[src*="scenario-summary"]').count(),0,'Summary renderer stays deferred');
  await page.selectOption('#csv','print');
  await page.waitForSelector('#ayfluxScenarioSummary[open]');
  assert.equal(await page.locator('#ayfluxScenarioSummary svg').count(),2);
  assert.ok((await page.textContent('#ayfluxScenarioSummary')).includes('Removed by dialysis'));
  assert.ok((await page.textContent('#ayfluxScenarioSummary')).includes('AyFlux 0.27.0'));
  async function onePage(name){
   const pdf=await page.pdf({preferCSSPageSize:true,printBackground:true});
   const pages=(pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)||[]).length;
   assert.equal(pages,1,name+' must fit one PDF page');
   if(process.env.SUMMARY_PREVIEW_DIR){fs.mkdirSync(process.env.SUMMARY_PREVIEW_DIR,{recursive:true});fs.writeFileSync(path.join(process.env.SUMMARY_PREVIEW_DIR,name+'.pdf'),pdf);}
  }
  await onePage('default');
  await page.evaluate(()=>{window.printCalls=0;window.print=()=>window.printCalls++;});
  await page.getByRole('button',{name:'Print / save PDF',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.printCalls),1);
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>document.body.classList.contains('ay-summary-open')),false);
  await page.emulateMedia({media:'print'});
  assert.equal(await page.locator('dialog.ay-summary').isVisible(),false,'Closed preview must not replace normal app printing');
  await page.emulateMedia({media:'screen'});
  await page.setViewportSize({width:390,height:844});await page.selectOption('#csv','print');
  await page.waitForSelector('#ayfluxScenarioSummary[open]');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await onePage('mobile');
  await page.getByRole('button',{name:'Close',exact:true}).click();
  for(const type of ['long-custom','pd','fitted']){
   await page.evaluate(type=>{
    const E=window.RenalPKV7,S=window.AyFluxScenarioSummary;
    const c={...structuredClone(E.DEFAULTS),draws:1,variability:0,horizon:96};
    const mode=type==='pd'?'Peritoneal dialysis':'No dialysis';
    if(type==='long-custom'){
     c.dosingMode='custom';c.customDoses=Array.from({length:200},(_,i)=>({time:i*.4,route:'Valacyclovir oral',amount:10}));
     c.renalMode='profile';c.crclSource='manual';c.renalProfile=Array.from({length:12},(_,i)=>({time:i*8,crcl:i*3}));
     c.vcScale=1.2;c.clearanceScale=.9;c.formFactor=1.1;c.metRenal=1.2;c.metDial=.8;c.valF=.6;c.valKa=1.5;c.probenecid=true;
    }
    if(type==='fitted')c.observations=[{time:2,value:987654.321987,role:'fit',analyte:'plasma'}];
    const run=E.simulateMany({...c,requestedModes:[mode]})[mode];
    const snap=S.snapshot(E,c,run,mode,{version:'test <img src=x onerror=alert(1)>',generatedAt:'2026-11-13T12:00:00Z'});
    S.show(document,snap);
   },type);
   assert.equal(await page.locator('#ayfluxScenarioSummary img').count(),0,'Metadata must remain plain text');
   assert.ok(!(await page.textContent('#ayfluxScenarioSummary')).includes('987654.321987'));
   if(type==='fitted')assert.ok((await page.textContent('#ayfluxScenarioSummary')).includes('1 fitting measurements'));
   await onePage(type);await page.getByRole('button',{name:'Close',exact:true}).click();
  }
  assert.deepEqual(errors,[]);console.log('One-page scenario PDF: default, mobile, 200-dose profile, PD, fitted-data omission and print-close isolation passed.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
