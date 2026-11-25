const routeField = id => document.getElementById(id);
function renderTablets(){
  const course=routeField('course').value, f=parseFloat(routeField('fraction').value)/100, ka=Number(routeField('ka').value);
  const out=routeField('oralResult'),notes=routeField('courseNotes');
  routeField('gapLabel').hidden=course!=='iv';
  routeField('gap').disabled=course!=='iv';
  if(course==='iv'){
    const gap=Number(routeField('gap').value);
    const withOral=AyFluxRouteResearch.tablets(RenalPKV7,f,ka,gap,true);
    const without=AyFluxRouteResearch.tablets(RenalPKV7,f,ka,gap,false);
    const table=document.createElement('table');
    table.createCaption().textContent='Plasma forecast and measured serum acyclovir (mg/L)';
    const header=table.createTHead().insertRow();
    for(const label of ['Sample','Oral then IV','IV alone','Measured'])header.appendChild(document.createElement('th')).textContent=label;
    const body=table.createTBody();
    ['Before fourth 850 mg dose','25 min after infusion'].forEach((label,i)=>{
      const row=body.insertRow();for(const v of [label,withOral[i].toFixed(5),without[i].toFixed(5),[1.70,8.90][i].toFixed(2)])row.insertCell().textContent=v;
    });out.replaceChildren(table);
    notes.textContent='The author confirmed 400 mg orally four times daily July 17–22 and the sampled infusion. The reconstruction assumes 24 tablets exactly six hours apart, then six 750 mg IV doses and four 850 mg IV doses eight hours apart, infused over one hour. Weight 86 kg; serum creatinine 87 µmol/L.';
  }else{
    const hd=course==='hd',r=AyFluxRouteResearch.dialysisTablet(RenalPKV7,hd,f,ka);
    out.textContent='Simulated peak '+r.peak.toFixed(2)+' µmol/L at '+r.time.toFixed(2)+' h. Published group mean peak '+(hd?'12.54 µmol/L at 3 h.':'8.95 µmol/L at 4.1 h.');
    notes.textContent='Representative 70 kg adult with assumed zero residual clearance. '+(hd?'One 4.5-hour HD session starts 48 hours after the dose.':'Four six-hour 2 L exchanges daily at default transport settings.')+' The measured cohort peak provides a descriptive comparison.';
  }
}
function renderDwell(){const r=AyFluxRouteResearch.dwell(RenalPKV7,Number(routeField('hours').value));
routeField('dwellResult').textContent='Simulated first drain: '+r.drained.toFixed(1)+' mg of the 1,000 mg fill dose. Peak plasma: '+r.peak.toFixed(2)+' mg/L. Systemic exposure relative to IV: '+(100*r.relativeAuc).toFixed(1)+'%.';
}
for(const id of ['course','fraction','ka','gap'])routeField(id).addEventListener('change',renderTablets);
routeField('hours').addEventListener('change',renderDwell);renderTablets();renderDwell();
