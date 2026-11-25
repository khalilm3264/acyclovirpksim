(function (root) {
  'use strict';
  function tablets(pk, fraction, ka, gap, includeTablets, dt=1/24) {
    // Illustrative clocks within the author-confirmed oral dates. First IV follows last tablet.
    const times = Array.from({length:24}, (_,i)=>i*6);
    const start=times.at(-1)+gap, trough=start+72, sample=trough+1+25/60;
    const c=pk.effectiveConfig({...pk.DEFAULTS, weight:86, age:36, sex:'male', scr:87/88.4,
      crclSource:'estimated', horizon:sample, draws:1, variability:0, dosingMode:'custom',
      customDoses:Array.from({length:10},(_,i)=>({time:start+i*8,route:'Acyclovir IV',amount:i<6?750:850,infusion:1}))});
    const doses=pk.buildDoses(c), events=pk.prepareEvents(c,[],dt,doses);
    if(includeTablets)events.tabletInputs=new Map(times.map(t=>[t,400*fraction]));
    const p=pk.drawParams(c)[0];p.oralKa=ka;
    const run=pk.single(c,p,[],dt,doses,events);
    return [run.cols.plasma[run.t.indexOf(trough)],run.cols.plasma.at(-1)];
  }
  function dwell(pk,hours,dt=1/16) {
    const c={...pk.DEFAULTS,weight:68.3,crcl:0,pdVolume:1.5,pdGlucose:1.5,capdDwell:6,
      capdExchanges:4, dose:1000, doseCount:1, infusion:1, horizon:240, draws:1,variability:0,trackMassBalance:true};
    // Change the first drain time only. Subsequent fresh fills last six hours.
    const rows=[{type:'CAPD',start:0,end:hours}];
    for(let start=hours;start<c.horizon;start+=6) rows.push({type:'CAPD',start,end:Math.min(c.horizon,start+6)});
    const run=(ip)=>{
      const doses=ip?[]:pk.buildDoses(c);
      const events=pk.prepareEvents(c,rows,dt,doses);
      if(ip)events.firstFillMg=1000;
      return pk.single(c,pk.drawParams(c)[0],rows,dt,doses,events);
    };
    const ip=run(true),iv=run(false);
    function auc(sim){return sim.t.slice(1).reduce((sum,t,i)=>sum+(t-sim.t[i])*(sim.cols.plasma[i]+sim.cols.plasma[i+1])/2,0)}
    return {relativeAuc:auc(ip)/auc(iv),drained:ip.drains[0].mass, peak:Math.max(...ip.cols.plasma),residual:Math.max(...ip.accounting.map(x=>Math.abs(x.residual)))};
  }
  // 800 mg single-dose protocols. Fraction and absorption rate are sensitivity inputs.
  function dialysisTablet(pk,hd,fraction,ka) {
    const c={...pk.DEFAULTS,weight:70,crcl:0,horizon:hd?54:31,draws:1,variability:0};
    const rows=hd?[{type:'HD',start:48,end:52.5}]:pk.scheduleFor('Peritoneal dialysis',c);
    const p=pk.drawParams(c)[0];p.oralKa=ka;
    const ev=pk.prepareEvents(c,rows,1/24,[]);ev.tabletInputs=new Map([[0,800*fraction]]);
    const run=pk.single(c,p,rows,1/24,[],ev);
    const peak=Math.max(...run.cols.plasma);
    return {peak:peak*1000/225.21, time:run.t[run.cols.plasma.indexOf(peak)]};
  }
  const api={tablets,dwell,dialysisTablet};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.AyFluxRouteResearch=api;
})(globalThis);
