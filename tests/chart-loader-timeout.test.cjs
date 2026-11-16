'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function loader(){
 const window={},scripts=[],timers=new Map();let next=0;
 const document={createElement(){return {removed:false,remove(){this.removed=true;}};},head:{appendChild(script){scripts.push(script);}}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../public/assets/charts.js'),'utf8'),{
  window,document,setTimeout(fn,delay){const id=++next;timers.set(id,{fn,delay});return id;},clearTimeout(id){timers.delete(id);}
 });
 return {window,scripts,timers,ensure:window.AyFluxCharts.ensure};
}

test('stalled renderer load releases concurrent callers and allows a fresh retry',async()=>{
 const h=loader(),first=h.ensure(),second=h.ensure();
 assert.equal(first,second);assert.equal(h.scripts.length,1);
 const timer=[...h.timers.values()][0],lateError=h.scripts[0].onerror;
 assert.equal(timer.delay,30000);
 const failed=assert.rejects(first,/timed out/);
 timer.fn();await failed;
 assert.equal(h.timers.size,0);assert.equal(h.scripts[0].removed,true);
 assert.equal(typeof h.scripts[0].onload,'function');assert.equal(h.scripts[0].onerror,null);
 const retry=h.ensure();
 assert.equal(h.scripts.length,2);assert.match(h.scripts[1].src,/\?retry=1$/);
 lateError(); // An already-queued old event cannot clear the new attempt.
 assert.equal(h.ensure(),retry);assert.equal(h.timers.size,1);
 h.window.echarts={init(){}};h.scripts[1].onload();
 assert.equal(await retry,h.window.echarts);assert.equal(h.timers.size,0);
 assert.equal(h.scripts[1].removed,false);
});

for(const outcome of ['success','network error','missing library'])test(`renderer ${outcome} clears its deadline`,async()=>{
 const h=loader(),result=h.ensure(),script=h.scripts[0];
 if(outcome==='success'){
  h.window.echarts={init(){}};script.onload();assert.equal(await result,h.window.echarts);
 }else{
  const failed=assert.rejects(result,outcome==='network error'?/could not be loaded/:/unavailable/);
  if(outcome==='network error')script.onerror();else script.onload();
  await failed;assert.equal(script.removed,true);
 }
 assert.equal(h.timers.size,0);assert.equal(script.onload,null);assert.equal(script.onerror,null);
});

for(const order of ['original first','retry first'])test(`late script completion preserves one renderer registry: ${order}`,async()=>{
 const h=loader(),first=h.ensure();const failed=assert.rejects(first,/timed out/);
 [...h.timers.values()][0].fn();await failed;
 const retry=h.ensure(),winner={init(){},registry:'winner'},duplicate={init(){},registry:'duplicate'};
 const firstScript=order==='original first'?h.scripts[0]:h.scripts[1];
 const lastScript=order==='original first'?h.scripts[1]:h.scripts[0];
 h.window.echarts=winner;firstScript.onload();
 h.window.echarts=duplicate;lastScript.onload();
 assert.equal(h.window.echarts,winner);assert.equal(await retry,winner);
 assert.equal(await h.ensure(),winner);assert.equal(h.timers.size,0);
 assert.equal(h.scripts[0].onload,null);assert.equal(h.scripts[1].onload,null);
});
