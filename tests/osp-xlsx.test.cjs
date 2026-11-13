'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),xlsx=require('../public/assets/osp-xlsx.js');
function fixture(){const s={time:[0,1]};for(const k of ['plasma','csf','cmmg','csfCmmg'])s[k]={median:[0,1.25]};return {'A & B':s};}
test('XLSX is an OOXML ZIP with typed concentration cells and simulation metadata',()=>{
 const bytes=xlsx.workbook(fixture(),['A & B'],'0.25.0'),s=new TextDecoder().decode(bytes);
 assert.equal(new DataView(bytes.buffer).getUint32(0,true),0x04034b50);
 assert.ok(s.includes('xl/worksheets/sheet4.xml'));assert.ok(s.includes('Time [h]'));assert.ok(s.includes('Concentration [mg/l]'));assert.ok(s.includes('A &amp; B'));assert.ok(s.includes('<c r="B3"><v>1.25</v></c>'));assert.ok(s.includes('Simulated prediction'));assert.ok(!s.includes('<f>'));
});
test('XLSX rejects missing, nonfinite or misaligned simulation values',()=>{
 assert.throws(()=>xlsx.workbook({},['missing']));const r=fixture();r['A & B'].plasma.median[1]=NaN;assert.throws(()=>xlsx.workbook(r,['A & B']));r['A & B'].plasma.median=[];assert.throws(()=>xlsx.workbook(r,['A & B']));
});

test('each curve sheet exports only time and its matching median as numeric cells', () => {
 const curves = fixture();
 const keys = ['plasma', 'csf', 'cmmg', 'csfCmmg'];
 keys.forEach((key, i) => { curves['A & B'][key].median = [i + 0.25, i + 1.75]; });
 const xml = new TextDecoder().decode(xlsx.workbook(curves, ['A & B']));
 const sheets = [...xml.matchAll(/<worksheet .*?<\/worksheet>/gs)].map(match => match[0]);
 assert.equal(sheets.length, keys.length);
 sheets.forEach((sheet, i) => {
  const rows = [...sheet.matchAll(/<row r="\d+">(.*?)<\/row>/gs)].map(match => match[1]);
  const headers = [...rows[0].matchAll(/<t[^>]*>(.*?)<\/t>/g)].map(match => match[1]);
  assert.deepEqual(headers, ['Time [h]', 'Concentration [mg/l]', 'Scenario', 'Molecule', 'Compartment', 'Data type', 'Statistic', 'Software']);
  assert.deepEqual(rows.slice(1).map(row => [...row.matchAll(/<v>(.*?)<\/v>/g)].map(match => Number(match[1]))),
   curves['A & B'].time.map((t, j) => [t, curves['A & B'][keys[i]].median[j]]));
  assert.ok(sheet.includes('autoFilter ref="A1:H3"'));
 });
});
