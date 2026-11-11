// Run after staging visualization assets. Pass a previous echarts-view.js to compare revisions.
'use strict';
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const {chromium} = require('playwright');

async function main() {
  const root = path.resolve(__dirname, '../public');
  const baseline = process.argv[2] && fs.readFileSync(process.argv[2], 'utf8');
  const server = http.createServer((req,res) => {
    let file = path.resolve(root, '.' + new URL(req.url,'http://localhost').pathname);
    if (!file.startsWith(root + path.sep)) {res.writeHead(404).end();return;}
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file,'index.html');
    if (!fs.existsSync(file)) {res.writeHead(404).end();return;}
    res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css'})[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try {
    browser=await chromium.launch({args:['--enable-unsafe-swiftshader','--no-sandbox']});
    const variants=baseline?['previous','current','plotly']:['current','plotly'];
    const measurements={};
    for(let trial=0;trial<5;trial++) {
      for(let i=0;i<variants.length;i++) {
        const variant=variants[(i+trial)%variants.length];
        const page=await browser.newPage({viewport:{width:1000,height:800}});
        try {
          // Route all variants equally so browser caching policy is identical.
          await page.route('**/echarts-view.js',route=>variant==='previous'
            ? route.fulfill({contentType:'application/javascript',body:baseline}) : route.continue());
          await page.goto('http://127.0.0.1:'+server.address().port+'/explore/');
          await page.addStyleTag({content:'#surface,#echart{width:100%;height:420px}'});
          await page.click('#generate');
          await page.waitForSelector('#map tbody button');
          for(const phase of ['first','repeat']) {
            const ms=await page.evaluate(async variant=>{
              const byId=id=>document.getElementById(id);
              const plotly=variant==='plotly';
              const start=performance.now();
              if(plotly) byId('three').click();
              else {byId('echartKind').value='surface';byId('echartKind').dispatchEvent(new Event('change'));}
              const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
              while(plotly ? byId('resetView').hidden : !byId('echart').querySelector('canvas') || byId('echartStatus').textContent==='Loading chart…') {
                if(performance.now()-start>20000)throw Error('Surface did not initialize');
                await frame();
              }
              await frame();await frame();
              return performance.now()-start;
            },variant);
            (measurements[variant+' '+phase]??=[]).push(Math.round(ms));
            if(variant==='plotly') await page.click('#hideThree');
            else await page.selectOption('#echartKind','');
          }
        } finally {await page.close();}
      }
    }
    for(const [key,values] of Object.entries(measurements))
      console.log('SURFACE BENCH',key,'median ms',[...values].sort((a,b)=>a-b)[2],'samples',values.join(','));
  } finally {await browser?.close();server.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
