'use strict';
async function start() {
  const response = await fetch('data.json');
  if (!response.ok) throw new Error('Data unavailable');
  const {times, examples} = await response.json();
  const patient = document.querySelector('#patient');
  const checks = [...document.querySelectorAll('fieldset input')];
  const colors = ['#005888','#984300','#644288'];
  const patterns = ['8 4','3 3','none'];
  function render() {
    const {truth, designs, samples} = examples[Number(patient.value)];
    const maximum = Math.ceil(Math.max(...samples.map(s => s.value), ...designs.flatMap(d => d.curve)) / 5) * 5;
    const x = t => 60 + t / 16 * 540;
    const y = v => 225 - v / maximum * 185;
    const curves = designs.map((d,i) => checks[i].checked ?
      '<polyline fill="none" stroke="'+colors[i]+'" stroke-width="2.5" stroke-dasharray="'+patterns[i]+'" points="'+d.curve.map((v,j)=>x(times[j])+','+y(v)).join(' ')+'"/>' : '').join('');
    const dots = samples.map(s=>'<circle cx="'+x(s.time)+'" cy="'+y(s.value)+'" r="3" fill="#172f40"/>').join('');
    const ticks = [0,4,8,12,16].map(t=>'<text text-anchor="middle" x="'+x(t)+'" y="244">'+t+'</text>').join('');
    const levels = [0,maximum/2,maximum].map(v=>'<text text-anchor="end" x="54" y="'+(y(v)+4)+'">'+v+'</text>').join('');
    document.querySelector('#chart').innerHTML='<svg viewBox="0 0 620 272" role="img" aria-label="Estimated plasma concentrations and synthetic observations over 16 hours"><text x="60" y="20">Plasma acyclovir (mg/L)</text><path d="M60 40V225H600" fill="none" stroke="#657888"/>'+ticks+levels+curves+dots+'<text x="330" y="267" text-anchor="middle">Time after infusion start (h)</text></svg>';
    const keys = ['peak','auc','clearance'];
    const fmt = n => n.toFixed(2);
    const row = (label,cells) => '<tr><th scope="row">'+label+'</th>'+cells.map(cell=>'<td>'+cell+'</td>').join('')+'</tr>';
    document.querySelector('#rows').innerHTML = row('Simulation truth',keys.map(k=>fmt(truth[k]))) +
      designs.map(d=>row(d.hours.join(', ')+' h',keys.map(k=>fmt(d[k].median)+' ('+fmt(d[k].lower)+'–'+fmt(d[k].upper)+')'))).join('');
  }
  patient.addEventListener('change',render);
  checks.forEach(check=>check.addEventListener('change',render));
  render();
}
start().catch(()=>{document.querySelector('#status').textContent='The comparison data could not be loaded. Refresh to retry.';});
