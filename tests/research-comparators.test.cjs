'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const pk=require('../public/assets/pk-engine.js');
const root=path.resolve(__dirname,'..');
const scenarios=[
 {name:'iv_700mg_constant_crcl50',renalMode:'constant',
  renalProfile:[{time:0,crcl:50},{time:24,crcl:50}]},
 {name:'iv_700mg_dynamic_crcl50_to10_to95',renalMode:'profile',
  renalProfile:[{time:0,crcl:50},{time:12,crcl:10},{time:24,crcl:95}]}
];
test('deterministic reference CSVs match the AyFlux engine for independent R tests',()=>{
 for(const row of scenarios){
  const c={...pk.DEFAULTS,draws:1,variability:0,
   route:'Acyclovir IV',dose:700,infusion:1,every:8,doseCount:1,horizon:24,
   crclSource:'manual',weight:70,crcl:50,renalMode:row.renalMode,renalProfile:row.renalProfile};
  const result=pk.single(c,pk.drawParams(c)[0],pk.scheduleFor('No dialysis',c),.25);
  const file=fs.readFileSync(path.join(root,'interop/fixtures',row.name+'.csv'),'utf8').trim();
  const [header,...lines]=file.split(/\r?\n/);
  assert.equal(header,'time_hours,plasma_acyclovir_mg_L,plasma_cmmg_mg_L,entered_crcl_mL_min');
  assert.equal(lines.length,result.t.length);
  lines.forEach((line,i)=>{
   const a=line.split(',').map(Number);
   assert.equal(a.length,4);
   assert.ok(Math.abs(a[0]-result.t[i])<1e-10,row.name+': time '+i);
   assert.ok(Math.abs(a[1]-result.cols.plasma[i])<1e-10,row.name+': plasma '+i);
   assert.ok(Math.abs(a[2]-result.cols.cmmg[i])<1e-10,row.name+': CMMG '+i);
   assert.ok(Math.abs(a[3]-pk.renalCrClAt(c,result.t[i]))<1e-10,row.name+': CrCl '+i);
  });
 }
});
test('public methods show the actual equation terms and source-provenance warning',()=>{
 const methods=fs.readFileSync(path.join(root,'public/learn/model-methods/index.html'),'utf8');
 const app=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
 for(const term of ['id="equations"','dA_c/dt','dA_p/dt','dM/dt',
  'dD/dt','dP/dt','J_PD(t)','id="source-notes"','pubmed.ncbi.nlm.nih.gov/20038622/']){
  assert.ok(methods.includes(term),'Missing public equation/reference: '+term);
 }
 assert.ok(app.includes('href="/learn/model-methods/#equations"'));
 assert.ok(app.includes('id="ref15"'));
 assert.ok(app.includes('id="ref16"'));
});
test('AyFlux wordmark stays self-hosted and GitHub cat icon has an accessible link',()=>{
 const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
 const css=fs.readFileSync(path.join(root,'public/learn/learn.css'),'utf8');
 const workflow=fs.readFileSync(path.join(root,'.github/workflows/pages.yml'),'utf8');
 assert.ok(html.includes('class="ayflux-logo"'));
 assert.ok(html.includes('<span class="ay">Ay</span>'));
 assert.ok(html.includes('<span class="flux">Flu<span class="x">x</span>'));
 assert.ok(!html.includes('</svg> GitHub source</a>'));
 assert.ok(html.includes('aria-label="AyFlux source code on GitHub"'));
 assert.ok(css.includes('poppins-latin-300-normal.woff2'));
 assert.ok(css.includes('poppins-latin-800-normal.woff2'));
 assert.ok(workflow.includes('@fontsource/poppins@5.3.0'));
});

test('anuric reconstruction keeps published observations fixed while calibration changes predictions',()=>{
 const engine=require('../public/assets/pk-engine.js');
 const baseline=engine.anuricStudy(engine.DEFAULTS);
 const calibrated=engine.anuricStudy({...engine.DEFAULTS,vcScale:1.2,clearanceScale:0.7});
 assert.deepEqual(baseline.rows.map(r=>[r.hour,r.mean,r.sd]),[[1,37.5,23.3],[8,10.3,2.9],[24,6.4,2.4]]);
 for(const curve of [baseline,calibrated]){
  assert.equal(curve.time[0],0);
  assert.equal(curve.time.at(-1),24);
  for(const row of curve.rows){
   assert.equal(row.modelMg,curve.plasma[curve.time.indexOf(row.hour)]);
   assert.equal(row.meanMg,row.mean*(225.21/1000));
   assert.equal(row.sdMg,row.sd*(225.21/1000));
  }
 }
 assert.notEqual(calibrated.rows[0].modelMg,baseline.rows[0].modelMg);
});
