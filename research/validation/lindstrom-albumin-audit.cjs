'use strict';
/**
 * Descriptive, patient-cluster-safe source audit, Lindström et al. 2019.
 * Select the first observation with an available albumin quotient for each of
 * 21 published deidentified patients. Patient #1 uses row 1b since 1a lacks QAlb.
 * Source: J Antimicrob Chemother 2019;74:3565–3572. DOI 10.1093/jac/dkz357
 * Do NOT fit a patient-level blood-brain barrier coefficient from these data.
 */
const fs=require('node:fs');
const path=require('node:path');
const source=path.join(__dirname,'data','lindstrom2019-first-eligible-observation.csv');
const header=['subject','study_row','albumin_quotient_x1e3','serum_cmmg_umol_L',
 'csf_cmmg_umol_L','csf_cmmg_below_0_15_detection_limit','crcl_mL_min'];
function load(){
 const lines=fs.readFileSync(source,'utf8').trim().split(/\r?\n/);
 const fields=lines.shift().split(',');
 if(fields.join(',')!==header.join(','))throw Error('Unexpected Lindstrom CSV schema');
 const n=x=>x===''?null:Number(x);
 const records=lines.map(line=>{
  const c=line.split(',');
  return {subject:Number(c[0]),source_row:c[1],qalb:n(c[2]),serum:n(c[3]),csf:n(c[4]),
    censored:c[5]==='true',crcl:n(c[6])};
 });
 if(records.length!==21||new Set(records.map(x=>x.subject)).size!==21)
  throw Error('Exactly one published-row record per patient is required');
 for(const x of records){
  if(!Number.isFinite(x.qalb)||x.qalb<=0)throw Error('Missing QAlb for '+x.subject);
  if(x.censored===false&&!(x.csf>=0.15))throw Error('Invalid detectable CSF '+x.subject);
  if(x.censored&&x.csf!==null)throw Error('Censored samples must remain unquantified');
 }
 return records;
}
function ranks(v){
 const order=v.map((x,i)=>({x,i})).sort((a,b)=>a.x-b.x),out=Array(v.length);
 for(let j=0;j<order.length;){
  let k=j+1;while(k<order.length&&order[k].x===order[j].x)k++;
  const rank=(j+1+k)/2;
  for(let q=j;q<k;q++)out[order[q].i]=rank;
  j=k;
 }
 return out;
}
function spearman(pairs){
 if(pairs.length<4)return null;
 const x=ranks(pairs.map(z=>z[0])),y=ranks(pairs.map(z=>z[1]));
 const mx=x.reduce((a,b)=>a+b,0)/x.length,my=y.reduce((a,b)=>a+b,0)/y.length;
 const dot=x.reduce((s,v,i)=>s+(v-mx)*(y[i]-my),0);
 const sx=x.reduce((s,v)=>s+(v-mx)**2,0),sy=y.reduce((s,v)=>s+(v-my)**2,0);
 return sx>0&&sy>0?dot/Math.sqrt(sx*sy):null;
}
const round=x=>x==null?null:Math.round(x*1e4)/1e4;
function summary(rows,omit19,method){
 let r=rows.filter(x=>!omit19||x.subject!==19);
 if(method==='detected')r=r.filter(x=>!x.censored);
 const y=x=>x.censored?(method==='upper-bound'?0.15:0.075):x.csf;
 return {specification:method+(omit19?' excluding subject 19':''),patients:r.length,
  censored_count:r.filter(x=>x.censored).length,
  qalb_to_csf_cmmg_spearman:round(spearman(r.map(x=>[x.qalb,y(x)]))),
  serum_to_csf_cmmg_spearman:round(spearman(r.filter(x=>x.serum!=null).map(x=>[x.serum,y(x)]))),
  qalb_to_detectable_csf_serum_ratio_spearman:round(spearman(r.filter(x=>x.serum>0&&!x.censored).map(x=>[x.qalb,x.csf/x.serum]))),
  detected_csf_serum_ratio_n:r.filter(x=>x.serum>0&&!x.censored).length};
}
function report(outputPath){
 const rows=load();
 const comparisons=[];
 for(const omit19 of [false,true])for(const method of ['half-LLOQ','upper-bound','detected'])
  comparisons.push(summary(rows,omit19,method));
 const output={study:'Lindström et al., J Antimicrob Chemother (2019), doi:10.1093/jac/dkz357',
  source:'Table 1, first available QAlb measurement per patient; 21 distinct patients',
  population:'Patients with herpesvirus CNS disease; not a drug disposition validation cohort',
  n_subjects:rows.length,n_below_detection:rows.filter(x=>x.censored).length,
  high_leverage_subject:{subject:19,qalb_x1e3:162.4,csf_cmmg_umol_L:6.4},
  analyses:comparisons,
  limitations:[
    'Original paper used 34 CSF observations from 21 participants, with adjusted regressions; this first-per-patient descriptive audit does not replicate their adjusted regression.',
    'Ten CMMG samples are below 0.15 µmol/L; half-LLOQ and upper-bound imputation are sensitivity choices, not actual measurements.',
    'Spearman rank correlations show association, not causal barrier transport or parameter identifiability.',
    'CSF:serum albumin quotient measures barrier dysfunction indirectly and is not a molecular transport coefficient.',
    'Serum CMMG and other covariates influence CSF CMMG; this descriptive exercise does not control for the confounding structure.',
    'CSF concentrations do not measure brain interstitial levels or prove a mechanism of neurotoxicity.'
  ]};
 if(outputPath){fs.mkdirSync(path.dirname(outputPath),{recursive:true});fs.writeFileSync(outputPath,JSON.stringify(output,null,2)+'\n');}
 return output;
}
if(require.main===module)console.log(JSON.stringify(report(process.argv[2])));
module.exports={load,ranks,spearman,report};
