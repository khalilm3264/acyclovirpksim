'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const html=read('public/index.html');
const methods=read('public/learn/model-methods/index.html');
const cite=read('public/cite/index.html');

test('References [1]-[24] are sequential and have unique stable anchors',()=>{
 const ids=[...html.matchAll(/<li id="ref(\d+)"/g)].map(m=>Number(m[1]));
 assert.deepEqual(ids,Array.from({length:24},(_,i)=>i+1));
 for(let i=17;i<=24;i++){
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
  '10.1093/jac/dky568'
 ]) assert.ok(html.includes('https://doi.org/'+doi),'Missing DOI '+doi);
 assert.match(html,/ref22[\s\S]*?not peer-reviewed/);
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
