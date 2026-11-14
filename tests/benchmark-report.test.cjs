'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const {metrics,loadInputs,buildReport,markdown,compareNumeric}=require('../scripts/benchmark-report.cjs');

test('fold metrics distinguish opposing bias and include exact boundary values',()=>{
  const s=metrics([.5,.8,1,1.25,2].map(predicted=>({observed:1,predicted})));
  assert.ok(Math.abs(s.gmr-1)<1e-14);assert.ok(s.absoluteFoldError>1);
  assert.equal(s.withinNarrow,3);assert.equal(s.withinTwofold,5);
  assert.equal(metrics([]),null);
  assert.equal(metrics([{observed:1,predicted:0}]).defined,false);
  for(const predicted of [-1,NaN,Infinity])assert.throws(()=>metrics([{observed:1,predicted}]),/finite/);
  assert.throws(()=>metrics([{observed:0,predicted:1}]),/positive/);
});

test('report preserves frozen counts and keeps external reconstructions and non-scorable cases separate',()=>{
  const r=buildReport(loadInputs());
  const pooled=r.groups.find(x=>x.study==='All 37 published endpoints');
  assert.equal(pooled.scope,'frozen manuscript');assert.equal(pooled.metrics.n,37);
  assert.equal(pooled.metrics.withinTwofold,30);assert.equal(pooled.metrics.insideModelBand,33);
  const without=r.groups.find(x=>x.study==='Excluding author-fitted CAPD');
  assert.equal(without.metrics.n,25);assert.equal(without.metrics.withinTwofold,22);
  assert.ok(r.groups.filter(x=>x.study==='Manders 2026').every(x=>x.metrics.n===6));
  assert.ok(r.groups.filter(x=>x.study==='Turner 2016').every(x=>x.metrics.n===4));
  const turner=r.groups.find(x=>x.study==='Turner 2016'&&x.reconstruction==='absolute-egfr'&&x.variant==='default');
  assert.equal(turner.metrics.withinNarrow,1);assert.equal(turner.metrics.withinTwofold,3);
  assert.ok(r.excluded.some(x=>x.case==='Sadjadi 2018'));
  assert.ok(!r.groups.some(x=>/Sadjadi|Smith 2016/.test(x.study)));
  assert.equal(r.provenance.find(x=>x.id==='manuscript').engineBlob,'cb07505a2b9e619ee3351bb0bf66d5610a611a6f');
  assert.equal(markdown(r),fs.readFileSync(path.join(__dirname,'../research/validation/BENCHMARK-REPORT.md'),'utf8'));
});

test('changed endpoint bytes and swapped engine provenance are rejected',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ayflux-report-test-'));
  try {
    for(const f of fs.readdirSync(path.join(__dirname,'../research/validation/report-inputs')))fs.copyFileSync(path.join(__dirname,'../research/validation/report-inputs',f),path.join(dir,f));
    const file=path.join(dir,'manuscript.json'),original=fs.readFileSync(file,'utf8');
    fs.writeFileSync(file,original+' ');assert.throws(()=>loadInputs(dir),/hash mismatch/);
    const changed=JSON.parse(original);changed.provenance.engineBlob='17971df66e0a97b4d382572a582d35c444a3c83f';
    const bytes=JSON.stringify(changed);fs.writeFileSync(file,bytes);
    const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
    manifest.sha256.manuscript=crypto.createHash('sha256').update(bytes).digest('hex');
    fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest));
    assert.throws(()=>loadInputs(dir),/provenance mismatch/);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});

test('reproduction comparison tolerates numerical roundoff but detects scientific drift',()=>{
  compareNumeric({x:[1,2]},{x:[1+1e-10,2]});
  assert.throws(()=>compareNumeric({x:[1,2]},{x:[1.01,2]}),/mismatch/);
  assert.throws(()=>compareNumeric({x:[1]},{y:[1]}),/Shape mismatch/);
});
