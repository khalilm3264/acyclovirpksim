'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const vendor = path.resolve(__dirname, '../public/assets/vendor');

// The fixture uses the default plasma chart, three scenarios, one 90% band,
// and a dose change through the simulator's normal input and worker path.
function instrument(renderer) {
  const original = window.Plotly?.react;
  function drawCanvas(el, traces, layout) {
    const chart = echarts.getInstanceByDom(el) || echarts.init(el);
    const [lower, upper, ...curves] = traces;
    const line = (name, values, x) => ({
      name, type:'line', data:x.map((t,i)=>[t,values[i]]), showSymbol:false
    });
    const invisible = {lineStyle:{opacity:0}, stack:'interval', silent:true};
    const series = [
      {...line('Lower bound',lower.y,lower.x), ...invisible, areaStyle:{opacity:0}},
      {...line(upper.name,upper.y.map((v,i)=>v-lower.y[i]),upper.x), ...invisible,
        areaStyle:{color:upper.fillcolor,opacity:1}},
      ...curves.map(curve=>({...line(curve.name,curve.y,curve.x),
        lineStyle:{color:curve.line.color,width:curve.line.width,type:({dash:'dashed',dot:'dotted'})[curve.line.dash] || 'solid'}}))
    ];
    series[2].markLine = {symbol:'none',label:{show:false},silent:true,
      data:layout.shapes.map(s=>({xAxis:s.x0,lineStyle:{color:s.line.color,width:s.line.width,type:'dashed'}}))};
    chart.setOption({animation:false, tooltip:{trigger:'axis'},toolbox:{feature:{saveAsImage:{},dataZoom:{}}},
      grid:{left:87,right:9,top:12,bottom:78},legend:{bottom:0,data:[upper.name,...curves.map(c=>c.name)]},
      xAxis:{type:'value',min:0,max:layout.xaxis.range[1],interval:layout.xaxis.tickvals[1],name:'Time (day · hour)',
        axisLabel:{rotate:28,formatter:t=>layout.xaxis.ticktext[layout.xaxis.tickvals.indexOf(t)] || ''}},
      yAxis:{type:'value',name:layout.yaxis.title.text,nameLocation:'middle',nameGap:45},series});
  }
  const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
  window.benchSamples = [];
  const react = async (el,traces,layout,options) => {
    const start = performance.now();
    if (renderer === 'plotly') await original(el,traces,layout,options);
    else drawCanvas(el,traces,layout);
    const submitted = performance.now();
    const peak = Math.max(...traces[2].y);
    // Both renderers receive the same two-frame paint opportunity.
    (async()=>{
      await frame(); await frame();
      window.benchSamples.push({draw:submitted-start,paint:performance.now()-start,
        total:performance.now()-(window.editTime || 0),peak,points:traces[2].y.length,traces:traces.length});
    })();
  };
  if(renderer==='plotly') window.Plotly.react=react;
  else window.Plotly={react,Plots:{resize:el=>echarts.getInstanceByDom(el)?.resize()}};
}

(async()=>{
  const browser=await chromium.launch();
  try {
    const results={plotly:[],echarts:[]};
    for(let trial=0;trial<7;trial++) {
      for(const renderer of trial%2?['echarts','plotly']:['plotly','echarts']) {
        const page=await browser.newPage({viewport:{width:1280,height:900},serviceWorkers:'block'});
        try {
          await page.route('**/plotly-basic-3.3.1.min.js', route=>{
            const file=renderer==='plotly'?'plotly-basic-3.3.1.min.js':'echarts-5.6.0.min.js';
            return route.fulfill({contentType:'application/javascript',body:fs.readFileSync(path.join(vendor,file),'utf8')+'\n;('+instrument.toString()+')('+JSON.stringify(renderer)+');'});
          });
          await page.route('http://127.0.0.1:8787/',async route=>{
            const html=fs.readFileSync(path.resolve(__dirname,'../public/index.html'),'utf8');
            await route.fulfill({contentType:'text/html',body:html.replace('</head>','<style>#concentration .chart:not(#plasmaChart){display:none!important}</style></head>')});
          });
          await page.goto('http://127.0.0.1:8787/');
          await page.locator('#plasmaChart').scrollIntoViewIfNeeded();
          await page.waitForFunction(()=>window.benchSamples?.length===1,null,{timeout:90000});
          await page.evaluate(()=>{
            const el=document.querySelector('#num_dose');
            el.value='725';
            window.editTime=performance.now();
            el.dispatchEvent(new Event('input',{bubbles:true}));
          });
          await page.waitForFunction(()=>window.benchSamples.length===2,null,{timeout:90000});
          const samples=await page.evaluate(()=>window.benchSamples);
          assert.equal(samples[0].traces,5);
          assert.ok(samples[1].peak>samples[0].peak);
          results[renderer].push(samples);
          console.log('SAMPLE',trial,renderer,JSON.stringify(samples));
        } finally {await page.close();}
      }
      for(const i of [0,1])assert.equal(results.echarts[trial][i].peak,results.plotly[trial][i].peak);
    }
    for(const [renderer,samples] of Object.entries(results)){
      for(const phase of [0,1]){
        for(const key of ['draw','paint','total']){
          const values=samples.map(s=>s[phase][key]).sort((a,b)=>a-b);
          console.log('BENCH',renderer,phase,key,'median',values[3].toFixed(1),'ms');
        }
      }
    }
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
