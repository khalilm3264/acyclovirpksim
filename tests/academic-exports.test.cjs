'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {generate}=require('../scripts/academic-bibliography.cjs');
const read=p=>fs.readFileSync(require('node:path').join(__dirname,'..',p),'utf8');
const box={};vm.runInNewContext(read('public/assets/academic-exports.js'),box);
const api=box.AyFluxAcademic;
const stats={peak:{median:12.345,lower:4,upper:19},auc:{median:321,lower:123,upper:456},mPeak:{median:3,lower:1,upper:5},mass:{median:0,lower:0,upper:0},endPlasma:{median:.123,lower:.001,upper:1}};
const snapshot={run:{summary:stats},config:{horizon:72,coverage:.9,observations:[]},primary:'No dialysis',version:'0.27.0'};
test('LaTeX uses actual window, summary statistics and explicit uncertainty interpretation',()=>{
 const tex=api.latex(snapshot);
 assert.match(tex,/AUC \(0--72 h\) & mg h\/L & 321 & 123 & 456/);
 assert.match(tex,/window end & mg\/L & 0.123 & 0.001 & 1/);
 assert.match(tex,/90\\% prior model-ensemble interval/);
 assert.match(tex,/not necessarily a trough or steady-state/);
 assert.match(tex,/not a dosing recommendation/);
 assert.equal((tex.match(/ \\\\$/gm)||[]).length,6,'five values and a header have valid row terminators');
});
test('LaTeX escapes all control characters and distinguishes measurement reweighting without leaking observations',()=>{
 const tex=api.latex({...snapshot,primary:'HD_%&#${}~^\\input{secret}',config:{...snapshot.config,observations:[{role:'fit',value:987654.321}]}});
 assert.match(tex,/HD\\_\\%\\&\\#\\\$/);
 assert.match(tex,/\\textbackslash\{\}input\\\{secret\\\}/);
 assert.match(tex,/measurement-reweighted ensemble/);assert.ok(!tex.includes('987654.321'));
 assert.throws(()=>api.latex({...snapshot,run:{summary:{...stats,auc:{median:NaN,lower:1,upper:2}}}}),/unavailable/);
 assert.throws(()=>api.latex({...snapshot,config:{horizon:Infinity}}),/required/);
});
test('complete bibliography is regenerated exactly from numbered sources, additional source and software',()=>{
 const bib=generate(read('public/index.html'),read('public/cite/index.html'),read('public/references/index.html'));
 assert.equal(bib,read('public/references/ayflux.bib'));
 assert.equal((bib.match(/^@misc/gm)||[]).length,57);
 for(let i=1;i<=56;i++)assert.match(bib,new RegExp('@misc\\{ayfluxRef'+i+','));
 assert.match(bib,/@software\{khalil2026ayflux/);
 const hara=bib.slice(bib.indexOf('@misc{ayfluxAdditional1'));
 assert.match(hara,/author = \{Hara, K and Suyama, K and Itoh, H and Nagashima, S\}/);
 assert.match(hara,/doi = \{10.2133\/dmpk.23.306\}/);
 assert.match(bib,/not a validated diagnostic threshold/);
 assert.match(bib,/Abstract-level values; full text not reviewed/);
 assert.match(bib,/not three independent cohorts/);
 assert.doesNotMatch(bib,/triggered/i);
});
test('bibliography keeps missing metadata absent and escapes note text without inventing fields',()=>{
 const bib=generate('<li id="ref1"><a href="https://example.org/?a=1&amp;b=2">A &amp; B_guide</a>. Unverified 2026 note with 10%.</li>','<pre>@software{ayflux, title={AyFlux}}</pre>','');
 assert.match(bib,/title = \{A \\& B\\_guide\}/);
 assert.match(bib,/10\\%/);
 assert.ok(bib.includes('url = {https://example.org/?a=1&b=2}'));
 assert.doesNotMatch(bib,/\n  (year|author|doi|journal) =/);
});
