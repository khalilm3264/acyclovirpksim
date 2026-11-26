'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
test('combined offline shell has unique requests and includes every entry script and export renderer',()=>{
 const sw=read('public/sw.js');
 const core=vm.runInNewContext(sw.slice(sw.indexOf('const CORE'),sw.indexOf('self.addEventListener'))+';CORE');
 assert.equal(new Set(core).size,core.length,'Cache.addAll rejects duplicate requests');
 const html=read('public/index.html');
 const scripts=[...html.matchAll(/<script src="\.([^\"]+)"/g)].map(m=>m[1]);
 for(const asset of [...scripts,'/assets/scenario-summary.js','/assets/scenario-summary.css','/assets/academic-exports.js','/references/ayflux.bib','/assets/simulator-worker.js','/assets/osp-xlsx.js'])assert.ok(core.includes(asset),asset+' must work after an offline reload');
});

test('offline install revalidates the preloaded renderer and reloads the rest of the shell atomically',async()=>{
 const source=read('public/sw.js');
 const listeners={},batches=[];
 vm.runInNewContext(source,{
  self:{addEventListener:(type,fn)=>{listeners[type]=fn;}},
  Request:class{constructor(url,options){this.url=url;this.cache=options.cache;}},
  caches:{open:async()=>({addAll:async requests=>{batches.push(requests);}})}
 });
 let installed;
 listeners.install({waitUntil:promise=>{installed=promise;}});
 await installed;
 assert.equal(batches.length,1);
 assert.deepEqual(Array.from(batches[0].filter(r=>r.cache!=='reload'),r=>[r.url,r.cache]),[
  ['/assets/vendor/echarts-6.1.0.min.js','no-cache']
 ]);
 assert.ok(batches[0].some(r=>r.url==='/'&&r.cache==='reload'));
});
