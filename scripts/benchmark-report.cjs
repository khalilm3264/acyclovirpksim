'use strict';
// A report over pinned, normalized endpoints. Never reads the live engine for paper results.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');
const {execFileSync} = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const INPUTS = path.join(ROOT, 'research/validation/report-inputs');
const PINS = [
  {id:'manuscript', commit:'8fc1c9d97590c81d3fbcf65ecb1f0ead273ab4a0', model:'8fc1c9d97590c81d3fbcf65ecb1f0ead273ab4a0', blob:'cb07505a2b9e619ee3351bb0bf66d5610a611a6f', files:['public/assets/pk-engine.js','public/assets/study-library.js','research/validation/ablation-study.cjs']},
  {id:'manders', commit:'c5eb2984fd9e024dd780310d44f3b00bf370b431', model:'304ce5308ea78907d18b07d8670c164295829eb3', blob:'17971df66e0a97b4d382572a582d35c444a3c83f', files:['public/assets/pk-engine.js','research/validation/manders2026-sadjadi2018.cjs','research/validation/MANDERS2026-SADJADI2018-PROTOCOL.md']},
  {id:'turner', commit:'341f1467562e004fd26b67e38744d061e9b8815d', model:'304ce5308ea78907d18b07d8670c164295829eb3', blob:'17971df66e0a97b4d382572a582d35c444a3c83f', files:['public/assets/pk-engine.js','research/validation/turner-2016.cjs','research/validation/TURNER-2016-PROTOCOL.md']},
  {id:'smith', commit:'b0defab8b9af6a87e7fdd42d01390b30d21e4457', model:'304ce5308ea78907d18b07d8670c164295829eb3', blob:'17971df66e0a97b4d382572a582d35c444a3c83f', files:['public/assets/pk-engine.js','research/validation/smith2016-obesity.cjs']},
];
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function git(args, opts={}) { return execFileSync('git', args, {cwd:ROOT, maxBuffer:32*1024*1024, ...opts}); }
function metrics(rows) {
  if (!rows.length) return null;
  if (rows.some(r => !Number.isFinite(r.observed) || r.observed <= 0 || !Number.isFinite(r.predicted) || r.predicted < 0)) throw new Error('Fold metrics require positive finite observations and finite nonnegative predictions');
  if (rows.some(r => r.predicted === 0)) return {n:rows.length, defined:false, reason:'Zero prediction: fold metric undefined'};
  const logs=rows.map(r => Math.log(r.predicted/r.observed));
  const inside=(lo,hi) => rows.filter(r => r.predicted/r.observed >= lo && r.predicted/r.observed <= hi).length;
  return {n:rows.length, defined:true, gmr:Math.exp(logs.reduce((a,b)=>a+b,0)/rows.length),
    absoluteFoldError:Math.exp(logs.reduce((a,b)=>a+Math.abs(b),0)/rows.length),
    withinNarrow:inside(.8,1.25), withinTwofold:inside(.5,2),
    insideModelBand:rows.every(r=>typeof r.inside==='boolean') ? rows.filter(r=>r.inside).length : null};
}
function normalized(id, data) {
  if(id==='manuscript') return {scenarios:data.scores.map(s=>({id:s.id,label:s.label,mode:s.mode,evidence:s.evidence,config:s.config,rows:s.rows})), ablations:data.ablations};
  if(id==='manders') return {combinations:data.manders2026.primaryPlasma.combinations.map(c=>({kidney:c.surrogate,variant:c.variant,rows:c.cases.map(r=>({case:r.caseId,endpoint:'steady-state plasma',unit:'mg/L',observed:r.observedPlasmaMgL,predicted:r.predictedPlasmaMgL}))})),
    excluded:[{case:'Manders F plasma',reason:'PICC-contaminated sample; excluded by source protocol'}, {case:'Manders H',reason:'No measured concentration'}, {case:'Manders F CSF',reason:'Bounded sensitivity analysis; unknown paired regimen/kidney timing; no pooled scoring'}, {case:'Sadjadi 2018',reason:'Unreported weight, dose, PD prescription and blood-draw times; non-scorable sensitivity grid'}]};
  if(id==='turner') return {combinations:[...new Set(data.results.map(r=>`${r.kidney}|${r.variant}`))].map(key=>{
    const [kidney,variant]=key.split('|');return {kidney,variant,rows:data.results.filter(r=>r.kidney===kidney&&r.variant===variant).flatMap(r=>r.endpoints.filter(e=>e.endpoint!=='clearance').map(e=>({case:r.group,endpoint:e.endpoint,unit:e.endpoint==='peak'?'mg/L':'mg h/L',observed:e.observed,predicted:e.predicted})))};
  }), excluded:[{case:'Turner clearance',reason:'Derived exposure descriptor, excluded from co-primary Cmax/AUC count; group means are not independent patient records'}]};
  if(id==='smith') return {source:data.source, comparisons:[...data.renalComparison.map(r=>({axis:'CrCl input',name:r.name,...r})),...data.weightSensitivity.map(r=>({axis:'PK scaling weight',name:r.name,...r})),...data.infusionSensitivity.map(r=>({axis:'Infusion assumption',name:String(r.inputs.infusion),...r}))].map(r=>({axis:r.axis,name:r.name,inputs:r.inputs,rows:Object.entries(r.predicted).map(([endpoint,predicted])=>({endpoint,predicted,observed:data.source.endpoints[endpoint]}))})),excluded:[{case:'Smith 2016 combined endpoint score',reason:'Peak, extrapolated trough, AUC, dose/AUC clearance and fitted half-life are dependent descriptors; report ratios separately'}]};
  throw new Error('Unknown input '+id);
}
function simulatePin(pin) {
  // Historical source and protocols remain unmodified in detached temporary worktrees.
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ayflux-benchmark-'));
  const tree=path.join(temp,'tree');
  let added=false;
  try {
    try { git(['cat-file','-e',pin.commit+'^{commit}']); }
    catch { throw new Error(`Missing pinned source ${pin.commit}. Fetch it with: git fetch origin ${pin.commit}`); }
    git(['worktree','add','--detach',tree,pin.commit],{stdio:'pipe'}); added=true;
    const blob=git(['rev-parse',pin.commit+':public/assets/pk-engine.js'],{encoding:'utf8'}).trim();
    if(blob!==pin.blob) throw new Error('Pinned engine blob mismatch: '+pin.id);
    const provenance={sourceCommit:git(['rev-parse',pin.commit],{encoding:'utf8'}).trim(),modelCommit:pin.model,engineBlob:blob,
      files:Object.fromEntries(pin.files.map(f=>[f,sha(fs.readFileSync(path.join(tree,f)))]))};
    const node=(args)=>execFileSync(process.execPath,args,{cwd:tree,encoding:'utf8',maxBuffer:32*1024*1024});
    let data;
    if(pin.id==='manuscript') {
      data=JSON.parse(node(['-e',`const E=require('./public/assets/pk-engine.js'),S=require('./public/assets/study-library.js'),A=require('./research/validation/ablation-study.cjs'); const scores=S.STUDIES.map(s=>({...S.score(s,E,{draws:400}),label:s.short,mode:s.mode,evidence:s.pointsLabel,config:E.effectiveConfig(S.configFor(s,E))})); console.log(JSON.stringify({scores,ablations:A.run().map(r=>({variant:r.variant.id,label:r.variant.label,rows:r.rows}))}));`]));
    } else if(pin.id==='manders') data=JSON.parse(node(['-e',"console.log(JSON.stringify(require('./research/validation/manders2026-sadjadi2018.cjs').evaluate()))"]));
    else if(pin.id==='turner') {
      const out=path.join(temp,'turner');node(['research/validation/turner-2016.cjs',out]);data=JSON.parse(fs.readFileSync(path.join(out,'results.json'),'utf8'));
    } else data=JSON.parse(node(['research/validation/smith2016-obesity.cjs']));
    return {schemaVersion:1,id:pin.id,provenance,...normalized(pin.id,data)};
  } finally {
    if(added) git(['worktree','remove','--force',tree],{stdio:'pipe'});
    fs.rmSync(temp,{recursive:true,force:true});
  }
}
function compareNumeric(a,b,where='root') {
  if(typeof a==='number'&&typeof b==='number') {
    if(!Number.isFinite(a)||!Number.isFinite(b)||Math.abs(a-b)>1e-6*Math.max(1,Math.abs(a),Math.abs(b))) throw new Error('Numeric reproduction mismatch at '+where);
  } else if(a&&b&&typeof a==='object'&&typeof b==='object') {
    if(JSON.stringify(Object.keys(a))!==JSON.stringify(Object.keys(b))) throw new Error('Shape mismatch at '+where);
    for(const k of Object.keys(a))compareNumeric(a[k],b[k],where+'.'+k);
  } else if(a!==b) throw new Error('Reproduction mismatch at '+where);
}
function loadInputs(inputDir=INPUTS) {
  const manifest=JSON.parse(fs.readFileSync(path.join(inputDir,'manifest.json'),'utf8'));
  return PINS.map(pin=>{
    const bytes=fs.readFileSync(path.join(inputDir,pin.id+'.json'));
    if(sha(bytes)!==manifest.sha256[pin.id])throw new Error('Input hash mismatch: '+pin.id);
    const data=JSON.parse(bytes);
    if(data.schemaVersion!==1 || data.id!==pin.id || data.provenance.engineBlob!==pin.blob || data.provenance.modelCommit!==pin.model || data.provenance.sourceCommit!==pin.commit) throw new Error('Input provenance mismatch: '+pin.id);
    return data;
  });
}
function buildReport(inputs) {
  const byId=Object.fromEntries(inputs.map(i=>[i.id,i])); const m=byId.manuscript;
  const groups=[];
  const add=(scope,study,reconstruction,variant,rows,note='')=>groups.push({scope,study,reconstruction,variant,note,metrics:metrics(rows)});
  const points=m.scenarios.flatMap(s=>s.rows);
  add('frozen manuscript','All 37 published endpoints','all scenarios','default',points,'Descriptive endpoint-weighted summary, includes 12 author-fitted CAPD values');
  for(const s of m.scenarios)add('frozen manuscript',s.label,s.id,'default',s.rows,s.evidence);
  for(const [label,test] of [['Plasma acyclovir, no dialysis',r=>r.analyte==='plasma'&&r.mode==='No dialysis'],['Plasma acyclovir, dialysis',r=>r.analyte==='plasma'&&r.mode!=='No dialysis'],['Plasma CMMG',r=>r.analyte==='cmmg']]) {
    const rows=m.scenarios.flatMap(s=>s.rows.map(r=>({...r,mode:s.mode}))).filter(test);
    add('frozen manuscript',label,'stratum','default',rows);
  }
  add('frozen manuscript','Excluding author-fitted CAPD','source sensitivity','default',m.scenarios.filter(s=>!s.id.startsWith('boelaert-')).flatMap(s=>s.rows));
  for(const a of m.ablations)for(const [name,filter] of [['Plasma, no dialysis',r=>r.analyte==='plasma'&&r.mode==='No dialysis'],['Plasma, dialysis',r=>r.analyte==='plasma'&&r.mode!=='No dialysis'],['Plasma CMMG',r=>r.analyte==='cmmg'],['All plasma acyclovir',r=>r.analyte==='plasma']])add('frozen ablation',name,'fixed 37-point set',a.variant,a.rows.filter(filter),a.label);
  for(const id of ['turner','manders'])for(const c of byId[id].combinations)add('subsequent external evaluation',id==='turner'?'Turner 2016':'Manders 2026',c.kidney,c.variant,c.rows,id==='turner'?'4 Cmax/AUC group-mean endpoints; two groups of 7 participants':'6 plasma levels; includes one 16-year-old; kidney-function surrogates are assumptions');
  return {schemaVersion:1,provenance:inputs.map(({id,provenance})=>({id,...provenance})),groups,smith:byId.smith.comparisons,excluded:inputs.flatMap(x=>x.excluded||[])};
}
const f=n=>n.toFixed(3);
function markdown(report) {
  const lines=['# Unified AyFlux benchmark report','','Generated from pinned normalized endpoint inputs. No new model fitting and no change to application parameters.','',
    'GMR = exp(mean(log(predicted/observed))); absolute fold error = exp(mean(abs(log(predicted/observed)))). Bounds are inclusive. Counts refer to endpoints, not independent patients. The 0.80–1.25 band is descriptive and is not a clinical or regulatory acceptance rule. The model band is seeded parameter variability, not a validated prediction interval.','',
    'The frozen paper uses CMMG nonrenal clearance 0.5 L/h and CSF CMMG partition 0.25. Later evaluations use their separately pinned engine; they do not replace the paper results. No grand total is formed across studies, ablations or sensitivity reconstructions.','',
    '## Pinned sources','', '| Input | Source commit | Model commit | Engine blob |','|---|---|---|---|'];
  for(const p of report.provenance)lines.push(`| ${p.id} | ${p.sourceCommit} | ${p.modelCommit} | ${p.engineBlob} |`);
  for(const scope of ['frozen manuscript','frozen ablation','subsequent external evaluation']) {
    lines.push('', '## '+scope, '', '| Study / stratum | Reconstruction | Variant | n endpoints | GMR | Absolute fold error | Within 0.80–1.25 | Within twofold | Inside model band |','|---|---|---|---:|---:|---:|---:|---:|---:|');
    for(const g of report.groups.filter(g=>g.scope===scope)) {
      const s=g.metrics;lines.push(`| ${g.study} | ${g.reconstruction} | ${g.variant} | ${s.n} | ${s.defined?f(s.gmr):'undefined'} | ${s.defined?f(s.absoluteFoldError):'undefined'} | ${s.defined?s.withinNarrow+'/'+s.n:'—'} | ${s.defined?s.withinTwofold+'/'+s.n:'—'} | ${s.insideModelBand==null?'—':s.insideModelBand+'/'+s.n} |`);
    }
  }
  lines.push('', 'Turner: retrospective group-mean reconstruction with known published endpoints; kidney surrogates and all sensitivities are reported. Manders: six primary plasma levels, including one adolescent; Case F plasma and H are excluded. Rows are repeated analyses, not additional participants.','',
    '## Smith 2016 diagnostic reconstruction','', 'Dependent PK descriptors are shown separately; no pooled fold-error score is assigned. Trough is author-extrapolated; AUC, clearance and apparent half-life are author-derived. Infusion duration is assumed; PK-weight replacements are structural sensitivities, not dosing recommendations.','',
    '| Axis | Assumption | Peak ratio | Trough ratio | AUC ratio | Clearance ratio | Apparent half-life ratio |','|---|---|---:|---:|---:|---:|---:|');
  for(const c of report.smith) {
    const r=Object.fromEntries(c.rows.map(x=>[x.endpoint,x.predicted/x.observed]));lines.push(`| ${c.axis} | ${c.name} | ${['peak','trough','auc8','clearance','apparentHalfLife'].map(k=>f(r[k])).join(' | ')} |`);
  }
  lines.push('', '## Exclusions and non-scorable evidence','');for(const e of report.excluded)lines.push(`- **${e.case}:** ${e.reason}.`);
  lines.push('', '## Interpretation notes','');for(const note of new Set(report.groups.map(g=>g.note).filter(Boolean)))lines.push('- '+note+'.');
  return lines.join('\n')+'\n';
}
function csv(report) {
  const keys=['scope','study','reconstruction','variant','n','gmr','absoluteFoldError','withinNarrow','withinTwofold','insideModelBand','note'];
  const cell=v=>'"'+String(v??'').replaceAll('"','""')+'"';
  return keys.join(',')+'\n'+report.groups.map(g=>{const s=g.metrics;return [g.scope,g.study,g.reconstruction,g.variant,s.n,s.gmr,s.absoluteFoldError,s.withinNarrow,s.withinTwofold,s.insideModelBand,g.note].map(cell).join(',');}).join('\n')+'\n';
}
function main(args) {
  const allowed=new Set(['--refresh-inputs','--verify','--out']);
  for(let i=0;i<args.length;i++){if(!allowed.has(args[i]))throw new Error('Unknown argument '+args[i]);if(args[i]==='--out'&&!args[++i])throw new Error('--out needs a directory');}
  if(args.includes('--refresh-inputs')) {
    const data=PINS.map(simulatePin);fs.mkdirSync(INPUTS,{recursive:true});const sha256={};
    for(const d of data){const bytes=JSON.stringify(d,null,2)+'\n';fs.writeFileSync(path.join(INPUTS,d.id+'.json'),bytes);sha256[d.id]=sha(bytes);}
    fs.writeFileSync(path.join(INPUTS,'manifest.json'),JSON.stringify({schemaVersion:1,sha256},null,2)+'\n');
  }
  const inputs=loadInputs();
  if(args.includes('--verify'))for(const pin of PINS)compareNumeric(simulatePin(pin),inputs.find(x=>x.id===pin.id));
  const report=buildReport(inputs),output=args.includes('--out')?path.resolve(args[args.indexOf('--out')+1]):path.join(ROOT,'research/validation/results/benchmark-report');
  fs.mkdirSync(output,{recursive:true});
  for(const [file,bytes] of [['report.json',JSON.stringify(report,null,2)+'\n'],['report.md',markdown(report)],['summary.csv',csv(report)]])fs.writeFileSync(path.join(output,file),bytes);
  console.log(`Saved ${report.groups.length} separately labeled summary rows to ${output}`);
}
if(require.main===module)try{main(process.argv.slice(2));}catch(e){console.error(e.message);process.exitCode=1;}
module.exports={PINS,metrics,normalized,compareNumeric,loadInputs,buildReport,markdown,csv,simulatePin};
