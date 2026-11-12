'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const html=read('public/index.html');
const methods=read('public/learn/model-methods/index.html');
const cite=read('public/cite/index.html');

test('References [1]-[40] are sequential and have unique stable anchors',()=>{
 const ids=[...html.matchAll(/<li id="ref(\d+)"/g)].map(m=>Number(m[1]));
 assert.deepEqual(ids,Array.from({length:40},(_,i)=>i+1));
 for(let i=17;i<=40;i++){
  const entry=html.match(new RegExp('<li id="ref'+i+'">([\\s\\S]*?)<\\/li>'))?.[1];
  assert.ok(entry,'Missing reference entry '+i);
  assert.match(entry,/https:\/\/doi\.org\//);
 }
});
test('new studies have direct DOI citations, accurate evidence labels and no false new routes',()=>{
 for(const doi of [
  '10.1128/AAC.47.8.2438-2441.2003',
  '10.1128/AAC.01023-10',
  '10.1093/jac/dkl067',
  '10.1093/jac/24.6.947',
  '10.1159/000188514',
  '10.22541/au.173382487.72578057/v1',
  '10.12659/AJCR.911520',
  '10.1093/jac/dky568',
  '10.1097/00007691-199712000-00016',
  '10.1097/00007691-199910000-00005',
  '10.1007/s00467-023-05881-6',
  '10.1002/bcp.70138'
 ]) assert.ok(html.includes('https://doi.org/'+doi),'Missing DOI '+doi);
 // [22] is cited as the peer-reviewed 2025 article, with the preprint kept as a secondary link.
 assert.match(html,/id="ref22">[^\n]*Br J Clin Pharmacol\. 2025;91\(8\):2469–2473[^\n]*10\.1002\/bcp\.70138[^\n]*earlier preprint/);
 assert.doesNotMatch(html.match(/<li id="ref22">[\s\S]*?<\/li>/)[0],/not peer-reviewed/);
 assert.match(html,/ref20[\s\S]*?oral acyclovir/);
 assert.match(html,/ref21[\s\S]*?oral acyclovir/i);
 assert.match(html,/ref24[\s\S]*?not an independent PK validation cohort/);
 assert.match(html,/release notes">v0\.26\.0/);
});
test('model-methods and software-citation pages link the expanded bibliography',()=>{
 assert.ok(methods.includes('id="new-research-evidence"'));
 assert.ok(methods.includes('10.1093/jac/dkl067'));
 assert.ok(methods.includes('10.1128/AAC.01023-10'));
 assert.ok(cite.includes('/learn/model-methods/#new-research-evidence'));
});

test('drug reference table covers every dialysis modality and cites only listed references',()=>{
 const start=html.indexOf('<h2>Half-life and concentration references</h2>');
 const table=html.slice(start,html.indexOf('</table>',start));
 for(const group of ['Normal kidney function','Intermittent hemodialysis','Peritoneal dialysis','Continuous kidney replacement therapy (CRRT)'])assert.ok(table.includes(group),group);
 for(const [,n] of table.matchAll(/href="#ref(\d+)"/g))assert.ok(html.includes('<li id="ref'+n+'">'),'missing reference '+n);
 assert.match(table,/17\.4–22\.3 mL\/min/);
});
