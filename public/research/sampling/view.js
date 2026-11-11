'use strict';
async function start() {
  const response = await fetch('data.json');
  if (!response.ok) throw new Error('Data unavailable');
  const {times, examples} = await response.json();
  const patient = document.querySelector('#patient');
  const checks = [...document.querySelectorAll('fieldset input')];
  const colors = ['#005888','#984300','#644288'];
  const patterns = ['dashed','dotted','solid'];
  function render() {
    const {truth, designs, samples} = examples[Number(patient.value)];
    const charts=window.AyFluxCharts;
    const series=designs.flatMap((d,i)=>checks[i].checked?[charts.line(d.hours.join(', ')+' h',times,d.curve,colors[i],2.5,patterns[i])]:[]);
    series.push({name:'Synthetic observations',type:'scatter',itemStyle:{color:'#172f40'},data:samples.map(s=>[s.time,s.value])});
    charts.ensure().then(()=>charts.draw(document.querySelector('#chart'),charts.options(series,'Time after infusion start (h)','Plasma acyclovir (mg/L)')))
     .catch(error=>{document.querySelector('#status').textContent=error.message;});
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
