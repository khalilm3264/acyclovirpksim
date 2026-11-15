'use strict';
const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../public');
const server=http.createServer((req,res)=>{
 let file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
 if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
 if(!fs.existsSync(file))return res.writeHead(404).end();
 res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.html')?'text/html':'application/octet-stream');fs.createReadStream(file).pipe(res);
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
 try{for(const width of [412,800])for(const fallback of [false,true]){
  const context=await browser.newContext({viewport:{width,height:915},isMobile:true,hasTouch:true,serviceWorkers:'block'});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  if(fallback){
   await page.route('**/assets/vendor/echarts-6.1.0.min.js',r=>r.abort());
   await page.addInitScript(()=>{
    const p=CanvasRenderingContext2D.prototype,clear=p.clearRect,text=p.fillText;
    p.clearRect=function(...args){this.canvas.axisLabels=[];return clear.apply(this,args);};
    p.fillText=function(value,x,y,...args){if(y>this.canvas.getBoundingClientRect().height-35&&/^\d+(\.\d+)?$/.test(String(value)))(this.canvas.axisLabels||=[]).push(Number(value));return text.call(this,value,x,y,...args);};
   });
  }
  await page.goto('http://127.0.0.1:'+server.address().port+'/lite/');
  await page.waitForFunction(fallback=>fallback?document.querySelector('#acvChart canvas')?.axisLabels?.length>1:window.echarts?.getInstanceByDom(document.getElementById('acvChart')),fallback);
  const span=()=>page.evaluate(fallback=>{
   if(fallback){const labels=document.querySelector('#acvChart canvas').axisLabels;return [Math.min(...labels),Math.max(...labels)];}
   return echarts.getInstanceByDom(document.getElementById('acvChart')).getModel().getComponent('xAxis').axis.scale.getExtent();
  },fallback);
  async function expectSpan(expected){await page.waitForFunction(({fallback,expected})=>{
   const canvas=document.querySelector('#acvChart canvas'),c=window.echarts?.getInstanceByDom(document.getElementById('acvChart'));
   const actual=fallback?[Math.min(...(canvas.axisLabels||[])),Math.max(...(canvas.axisLabels||[]))]:c.getModel().getComponent('xAxis').axis.scale.getExtent();
   return actual.every((v,i)=>Math.abs(v-expected[i])<.001);
  },{fallback,expected});assert.deepEqual(await span(),expected);
   assert.deepEqual(await page.evaluate(({fallback})=>["acvChart","cmmgChart",...(document.getElementById("clearanceDetails").open?["clearChart"]:[])].map(id=>{
    if(fallback){const labels=document.querySelector("#"+id+" canvas").axisLabels;return [Math.min(...labels),Math.max(...labels)];}
    return echarts.getInstanceByDom(document.getElementById(id)).getModel().getComponent("xAxis").axis.scale.getExtent();
   }),{fallback}),Array(await page.locator("#clearanceDetails").getAttribute("open")!==null?3:2).fill(expected));}
  await expectSpan([0,96]);
  await page.locator("#clearanceDetails summary").click();
  const zoom=page.getByRole('button',{name:'Zoom time in',exact:true});
  assert.ok((await zoom.boundingBox()).height>=44);
  await zoom.focus();await page.keyboard.press('Enter');await expectSpan([24,72]);
  if(!fallback){const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:2});await page.waitForFunction(()=>visualViewport.scale>1.9);await expectSpan([24,72]);await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:1});}
  await page.setViewportSize({width:width===412?915:1280,height:width});await expectSpan([24,72]);
  await page.setViewportSize({width,height:915});await expectSpan([24,72]);
  await page.getByRole('button',{name:'Reset time axis',exact:true}).click();await expectSpan([0,96]);
  await zoom.click();await expectSpan([24,72]);await page.getByRole('button',{name:'Zoom time out',exact:true}).click();await expectSpan([0,96]);
  await page.locator('#acvChart').scrollIntoViewIfNeeded();
  const box=await page.locator('#acvChart').boundingBox(),scrollBefore=await page.evaluate(()=>scrollY),touchSession=await context.newCDPSession(page);
  const x=box.x+box.width/2,y=box.y+box.height/2;
  await touchSession.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let i=1;i<=6;i++){await touchSession.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*20}]});await page.waitForTimeout(20);}
  await touchSession.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForFunction(before=>scrollY>before+20,scrollBefore);await expectSpan([0,96]);
  assert.equal(await page.locator('#acvChart').evaluate(el=>getComputedStyle(el).touchAction),'pan-y pinch-zoom');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+2));
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({width,renderer:fallback?'native canvas fallback':'ECharts',visibleTimeAxis:'0–96 → 24–72 → 0–96 h',rotation:'portrait–landscape–portrait',pagePinch:fallback?'CSS preserved':'page scale 2 leaves chart span unchanged'}));
  await context.close();
 }}finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
