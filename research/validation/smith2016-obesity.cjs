'use strict';

// Diagnostic reconstruction, not a blinded or prospectively held-out validation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const engine = require('../../public/assets/pk-engine.js');
const source = {doi:'10.1016/j.ijantimicag.2016.01.006',
  patient:{age:61,sex:'female',height:162.6,weight:106.7,scr:1.8},
  reportedIdealWeight:54.7,reportedEstimatedCrCl:55,measuredCrCl:19.4,
  doseMg:1000,intervalHours:8,samplingDay:19,
  endpoints:{peak:43,trough:16.1,auc8:217,clearance:4.62,apparentHalfLife:5.13},
  endpointStatus:{peak:'Observed post-infusion maximum',
    trough:'Author-extrapolated pre-next-dose concentration, not a measured trough',
    auc8:'Author-derived interval AUC using observed and extrapolated concentrations',
    clearance:'Author-derived dose / interval AUC; not an independent endpoint',
    apparentHalfLife:'Author-estimated from a one-compartment log-linear fit'},
  limitations:['Infusion duration is not reported; 1 h is assumed and 0.5/2 h explored.',
    'No individual concentration values are tabulated; no synthetic measured points are created.',
    'Measured CrCl is absolute mL/min; it is not indexed to 1.73 m2.',
    'The source samples span only 4 h after infusion; steady state was assumed on day 19.',
    'This analysis was designed after inspecting the reported endpoints; no fitting is performed.']};

function simulate({crcl=source.measuredCrCl,weight=source.patient.weight,infusion=1,
  step=0.025,horizon=336}={}) {
  const config={...structuredClone(engine.DEFAULTS),...source.patient,weight,crcl,
    crclSource:'manual',renalMode:'constant',route:'Acyclovir IV',dosingMode:'repeat',
    dose:source.doseMg,every:source.intervalHours,doseCount:horizon/8,
    infusion,horizon,draws:1,variability:0,observations:[],schedule:[]};
  assert.deepEqual(engine.validate(config,'No dialysis'),[]);
  const params=engine.drawParams(config)[0];
  const run=engine.single(config,params,[],step,engine.buildDoses(config));
  const start=horizon-8;
  function at(t){
    const i=run.t.findIndex(x=>Math.abs(x-t)<1e-8);
    assert.ok(i>=0,'Missing output time '+t);
    return run.cols.plasma[i];
  }
  let auc8=0,peak=0;
  for(let i=0;i<run.t.length;i++){
    if(run.t[i]>=start-1e-8)peak=Math.max(peak,run.cols.plasma[i]);
    if(i&&run.t[i-1]>=start-1e-8)auc8+=(run.t[i]-run.t[i-1])*
      (run.cols.plasma[i]+run.cols.plasma[i-1])/2;
  }
  // Repeat the source's post-infusion sampling window for a descriptive apparent slope.
  const times=[0,0.5,1,2,4],logs=times.map(t=>Math.log(at(start+infusion+t)));
  const mx=times.reduce((a,b)=>a+b)/times.length,my=logs.reduce((a,b)=>a+b)/logs.length;
  const slope=times.reduce((a,x,i)=>a+(x-mx)*(logs[i]-my),0)/times.reduce((a,x)=>a+(x-mx)**2,0);
  const predicted={peak,trough:at(horizon),auc8,clearance:source.doseMg/auc8,
    apparentHalfLife:-Math.log(2)/slope};
  return {inputs:{weight,crcl,infusion,dose:config.dose,every:config.every,
    horizon,comparisonWindow:[start,horizon]},predicted,
    predictedObservedRatio:Object.fromEntries(Object.entries(predicted).map(([k,v])=>[k,v/source.endpoints[k]])),
    steadyStateRelativeChange:Math.abs(at(start)-at(horizon))/at(horizon),
    modelTotalClearance:params.other+params.renal+params.form,
    terminalModelHalfLife:run.summary.modelHalfLife};
}

function report(){
  const size=engine.bodySize(source.patient);
  // Use source-rounded IBW for structural sensitivity; calculated Devine IBW is reported separately.
  const adjusted=source.reportedIdealWeight+0.4*(source.patient.weight-source.reportedIdealWeight);
  const renalInputs=[['reported-estimate',55],['measured',19.4],
    ...['actual','ideal','adjusted'].map(cgWeight=>['cg-'+cgWeight,
      engine.cockcroftGault({...source.patient,cgWeight})])];
  const renalComparison=renalInputs.map(([name,crcl])=>({name,...simulate({crcl})}));
  const infusionSensitivity=[0.5,1,2].map(infusion=>simulate({infusion}));
  const weightSensitivity=[['actual',106.7],['adjusted',adjusted],['ideal',54.7]]
    .map(([name,weight])=>({name,...simulate({weight})}));
  const nominal=renalComparison.find(x=>x.name==='measured');
  const fine=simulate({step:0.0125}),shorter=simulate({horizon:328});
  const convergence={};
  for(const k of Object.keys(source.endpoints)){
    convergence[k]=Math.abs(nominal.predicted[k]-fine.predicted[k])/fine.predicted[k];
    assert.ok(convergence[k]<0.001,k+' grid convergence must be within 0.1%');
    assert.ok(Math.abs(nominal.predicted[k]-shorter.predicted[k])/nominal.predicted[k]<0.001,
      k+' steady-state burn-in check must be within 0.1%');
  }
  assert.ok(nominal.steadyStateRelativeChange<0.001,'Final two pre-dose levels must agree');
  assert.ok(Math.abs(nominal.predicted.clearance-nominal.modelTotalClearance)/nominal.modelTotalClearance<0.001,
    'Steady-state dose/AUC must recover model total clearance');
  return {source,engineSha256:crypto.createHash('sha256').update(fs.readFileSync(require.resolve('../../public/assets/pk-engine.js'))).digest('hex'),
    reconstruction:{integrationStepHours:0.025,burnInHours:328,
      note:'Final interval of a 14-day repeated-dose run approximates day-19 steady state; checked against a one-interval shorter burn-in.',
      calculatedBodySize:size,sourceAdjustedWeight:adjusted},
    renalComparison,infusionSensitivity,weightSensitivity,
    checks:{relativeGridDifferences:convergence},
    interpretation:'Weight sensitivity replaces the PK scaling weight with source IBW/AdjBW at fixed measured CrCl and fixed 1000 mg dose. It is a structural sensitivity, not a validated obesity correction or a dosing recommendation. CG alternatives use actual PK weight throughout.'};
}
if(require.main===module){
  const result=JSON.stringify(report(),null,2)+'\n';
  if(process.argv[2])fs.writeFileSync(process.argv[2],result);
  process.stdout.write(result);
}
module.exports={source,simulate,report};
