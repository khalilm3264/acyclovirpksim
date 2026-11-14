/* Nominal systemic scenario exports. Copyright (C) 2026 Muhammad Khalil; AGPL-3.0-only. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AyFluxScenarioScript=api;})(typeof globalThis==='undefined'?this:globalThis,function(){
 'use strict';
 const NOTICE='Nominal systemic acyclovir/CMMG only; not ensemble medians, CSF proxies, PD, Bayesian fitting or clinical dosing guidance.';
 function snapshot(E,input,mode,version='unknown'){
  if(!E.MODES.includes(mode))throw Error('Select a recognized primary scenario.');
  const c=E.effectiveConfig({...structuredClone(input),draws:1,variability:0});
  const errors=E.validate(c,mode);if(errors.length)throw Error(errors.join('; '));
  if((c.observations||[]).some(o=>o.role==='fit'))throw Error('Script export uses nominal parameters. Remove applied fitting measurements before exporting.');
  const windows=E.scheduleFor(mode,c);
  if(windows.some(w=>!['HD','CRRT'].includes(w.type)))throw Error('Scenario script export supports no dialysis, HD and CRRT only. Exchange-resolved PD is not represented; use configuration JSON and the AyFlux engine.');
  const doses=E.buildDoses(c),profile=c.renalMode==='profile'?c.renalProfile:[{time:0,crcl:c.crcl},{time:c.horizon,crcl:c.crcl}];
  const params=E.drawParams(c)[0];
  if(Object.values(params).some(v=>!Number.isFinite(v)))throw Error('Nominal parameters must be finite.');
  const breaks=[...new Set([0,c.horizon,...doses.flatMap(d=>[d.time,...(d.route==='Acyclovir IV'?[Math.min(c.horizon,d.time+d.infusion)]:[])]),...windows.flatMap(w=>[w.start,Math.min(w.end,c.horizon)]),...profile.map(p=>p.time)].filter(t=>t>=0&&t<=c.horizon))].sort((a,b)=>a-b);
  return {schemaVersion:1,version:String(version).replace(/[\r\n]/g,' '),mode,notice:NOTICE,horizon:c.horizon,params,profile,dynamic:c.renalMode==='profile',metDial:c.metDial,doses,windows,breaks};
 }
 function python(s){
  const data=JSON.stringify(s);
  return `# AyFlux nominal systemic scenario; AGPL-3.0-only\n# ${NOTICE}\n# Requires numpy and scipy. Run: python ayflux_scenario.py\nimport csv, json\nimport numpy as np\nfrom scipy.integrate import solve_ivp\nS = json.loads(${JSON.stringify(data)})\np = S['params']\ny = np.zeros(4)  # central acyclovir, peripheral, CMMG, bioavailable oral depot (mg)\nrows = []\nfor left, right in zip(S['breaks'][:-1], S['breaks'][1:]):\n    for d in S['doses']:\n        if d['route'] == 'Valacyclovir oral' and abs(d['time']-left) < 1e-8:\n            y[3] += d['amount'] * (225.21/324.34) * p['oralF']\n    mid = (left+right)/2\n    rate = sum(d['amount']/d['infusion'] for d in S['doses'] if d['route'] == 'Acyclovir IV' and d['time'] <= mid < d['time']+d['infusion'])\n    dial = sum(p['hd'] if w['type']=='HD' else p['crrt'] for w in S['windows'] if w['start'] <= mid < w['end'])\n    def rhs(t, x):\n        crcl = float(np.interp(t, [r['time'] for r in S['profile']], [r['crcl'] for r in S['profile']])) if S['dynamic'] else 1.0\n        cc, cp, cm = x[0]/p['vc'], x[1]/p['vp'], x[2]/p['vm']\n        exchange = p['q']*(cc-cp)\n        return [rate+p['oralKa']*x[3]-(p['other']+p['renal']*crcl+p['form']+dial)*cc-exchange, exchange, p['form']*cc*(239.19/225.21)-(p['mn']+p['mr']*crcl+dial*S['metDial'])*cm, -p['oralKa']*x[3]]\n    grid = np.unique(np.concatenate(([left], np.arange(0, S['horizon'], 0.025), [right])))\n    grid = grid[(grid >= left) & (grid <= right)]\n    sol = solve_ivp(rhs, (left,right), y, method='DOP853', t_eval=grid, rtol=1e-10, atol=1e-12, max_step=0.1)\n    if not sol.success: raise RuntimeError(sol.message)\n    for t, x in zip(sol.t[:-1], sol.y.T[:-1]): rows.append([t,x[0]/p['vc'],x[2]/p['vm']])\n    y = sol.y[:,-1]\nrows.append([S['horizon'],y[0]/p['vc'],y[2]/p['vm']])\nwith open('ayflux_nominal_systemic.csv','w',newline='') as f:\n    writer=csv.writer(f); writer.writerow(['time_hours','plasma_acyclovir_mg_L','plasma_cmmg_mg_L']); writer.writerows(rows)\nprint(S['notice'])\nprint('Saved ayflux_nominal_systemic.csv; source AyFlux version '+S['version']+'; '+S['mode'])\n`;
 }
 function r(s){
  const p=s.params;
  let crcl='double kidney=1.0;';
  if(s.dynamic){
   crcl=`double kidney=${s.profile[0].crcl};`;
   for(let i=1;i<s.profile.length;i++){
    const a=s.profile[i-1],b=s.profile[i];crcl+=`\n${i===1?'if':'else if'}(SOLVERTIME<=${b.time})kidney=${a.crcl}+(${b.crcl-a.crcl})*(SOLVERTIME-${a.time})/${b.time-a.time};`;
   }
   crcl+=`\nelse kidney=${s.profile.at(-1).crcl};`;
  }
  const dial=s.windows.map(w=>`if(SOLVERTIME>=${w.start} && SOLVERTIME<${w.end})dial+=${w.type==='HD'?p.hd:p.crrt};`).join('\n');
  const code=`$CMT CENT PERI MET DEPOT\n$ODE\n${crcl}\ndouble dial=0;\n${dial}\ndouble cc=CENT/${p.vc}, cp=PERI/${p.vp}, cm=MET/${p.vm};\ndouble exchange=${p.q}*(cc-cp);\ndxdt_CENT=${p.oralKa}*DEPOT-(${p.other}+${p.renal}*kidney+${p.form}+dial)*cc-exchange;\ndxdt_PERI=exchange;\ndxdt_MET=${p.form}*cc*(239.19/225.21)-(${p.mn}+${p.mr}*kidney+dial*${s.metDial})*cm;\ndxdt_DEPOT=-${p.oralKa}*DEPOT;\n$TABLE\ncapture plasma_acyclovir_mg_L=CENT/${p.vc};\ncapture plasma_cmmg_mg_L=MET/${p.vm};`;
  const events=s.breaks.map(time=>({time,evid:2,cmt:1,amt:0,rate:0}));
  for(const d of s.doses)if(d.amount>0)events.push({time:d.time,evid:1,cmt:d.route==='Acyclovir IV'?1:4,amt:d.route==='Acyclovir IV'?d.amount:d.amount*(225.21/324.34)*p.oralF,rate:d.route==='Acyclovir IV'?d.amount/d.infusion:0});
  events.sort((a,b)=>a.time-b.time||a.evid-b.evid);
  return `# AyFlux nominal systemic scenario; AGPL-3.0-only\n# ${NOTICE}\n# Requires mrgsolve and its C++ toolchain. Run: Rscript ayflux_scenario.R\nif (!requireNamespace('mrgsolve',quietly=TRUE)) stop("Install mrgsolve: install.packages('mrgsolve')")\n# Source version: ${s.version}; primary scenario: ${s.mode}\ncode <- ${JSON.stringify(code)}\nmodel <- mrgsolve::mcode('ayflux_export', code, project=tempdir())\nevents <- data.frame(ID=1, time=c(${events.map(e=>e.time)}), evid=c(${events.map(e=>e.evid)}), cmt=c(${events.map(e=>e.cmt)}), amt=c(${events.map(e=>e.amt)}), rate=c(${events.map(e=>e.rate)}))\n# EVID=2 records force solver restarts at every HD/CRRT/profile boundary.\noutput <- mrgsolve::mrgsim(model, data=events, end=${s.horizon}, delta=0.025, add=c(${s.breaks}), obsaug=TRUE, obsonly=TRUE, recsort=3, atol=1e-12, rtol=1e-10, output='df')\noutput <- output[!duplicated(output$time, fromLast=TRUE), c('time','plasma_acyclovir_mg_L','plasma_cmmg_mg_L')]\nnames(output)[1] <- 'time_hours'\nwrite.csv(output, 'ayflux_nominal_systemic.csv', row.names=FALSE)\ncat('Saved ayflux_nominal_systemic.csv; nominal systemic concentrations only.\\n')\n`;
 }
 function generate(E,input,mode,language,version){const s=snapshot(E,input,mode,version);if(language==='python')return python(s);if(language==='r')return r(s);throw Error('Choose Python or R.');}
 return {NOTICE,snapshot,generate};
});
