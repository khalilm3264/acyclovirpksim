'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const html=read('public/index.html');
const methods=read('public/learn/model-methods/index.html');
const cite=read('public/cite/index.html');

test('References [1]-[42] are sequential and have unique stable anchors',()=>{
 const ids=[...html.matchAll(/<li id="ref(\d+)"/g)].map(m=>Number(m[1]));
 assert.deepEqual(ids,Array.from({length:42},(_,i)=>i+1));
 for(let i=17;i<=42;i++){
  const entry=html.match(new RegExp('<li id="ref'+i+'">([\\s\\S]*?)<\\/li>'))?.[1];
  assert.ok(entry,'Missing reference entry '+i);
  if(i===42)assert.match(entry,/https:\/\/www\.klinickafarmakologie\.cz\/incpdfs\/far-202204-0002_10_001\.pdf/);
  else assert.match(entry,/https:\/\/doi\.org\//);
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
  '10.1002/bcp.70138',
 '10.1128/AAC.21.5.804'
 ]) assert.ok(html.includes('https://doi.org/'+doi),'Missing DOI '+doi);
 // [22] is cited as the peer-reviewed 2025 article, with the preprint kept as a secondary link.
 // Cites the final journal article; the 2024 preprint is publication history, and "not peer-reviewed"
 // refers to that preprint only, never to the cited article.
 const ref22=html.match(/<li id="ref22">[\s\S]*?<\/li>/)[0];
 assert.match(ref22,/Br J Clin Pharmacol\. 2025;91\(8\):2469–2473[^\n]*10\.1002\/bcp\.70138/);
 assert.match(ref22,/2024 preprint<\/a> was not peer-reviewed/);
 assert.equal((ref22.match(/not peer-reviewed/g)||[]).length,1,'only the preprint is described as not peer-reviewed');
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
