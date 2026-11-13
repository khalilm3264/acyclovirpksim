/* Copyright (C) 2026 Muhammad Khalil. SPDX-License-Identifier: AGPL-3.0-only */
'use strict';
const $=id=>document.getElementById(id),M=globalThis.NeonatalModel;
const ns='http://www.w3.org/2000/svg',svg=$('chart');
function el(tag,attrs,text){const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));if(text)n.textContent=text;svg.append(n);return n;}
const X=x=>80+(x-25)/16*680,Y=y=>340-y/.75*300;
function render(){
 const a=$('a').valueAsNumber,b=$('b').valueAsNumber;
 if(!$('inputs').checkValidity()){$('error').textContent='Enter both ages between 25 and 41 weeks.';return;}
 $('error').textContent='';svg.querySelectorAll('path,line,circle,text,rect').forEach(n=>n.remove());
 for(let y=0;y<=.7;y+=.1){el('line',{x1:80,x2:760,y1:Y(y),y2:Y(y),stroke:'#dde3e5'});el('text',{x:65,y:Y(y)+5,'text-anchor':'end','font-size':15},y.toFixed(1));}
 for(let x=25;x<=41;x+=2)el('text',{x:X(x),y:365,'text-anchor':'middle','font-size':15},String(x));
 el('text',{x:420,y:398,'text-anchor':'middle','font-size':17},'Postmenstrual age (weeks)');
 el('text',{x:80,y:22,'font-size':17},'Typical clearance (L/h/kg)');
 el('path',{d:M.curve().map((p,i)=>(i?'L':'M')+X(p.pma)+','+Y(p.clearance)).join(' '),fill:'none',stroke:'#14687a','stroke-width':3});
 $('values').replaceChildren();
 [[a,'A','#14687a'],[b,'B','#b44f22']].forEach(([p,label,color],i)=>{
 const cl=M.clearance(p);el('circle',{cx:X(p),cy:Y(cl),r:i?10:6,fill:i?'none':color,stroke:color,'stroke-width':3});
 el('text',{x:X(p),y:Y(cl)-(i?24:10),'text-anchor':'middle',fill:color,'font-size':17},label);
 const tr=document.createElement('tr');['Infant '+label,p.toFixed(1),cl.toFixed(3)].forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.append(td);});$('values').append(tr);
 });
 $('ratio').textContent='Infant B / infant A predicted clearance ratio: '+(M.clearance(b)/M.clearance(a)).toFixed(2)+'.';
}
$('inputs').addEventListener('submit',e=>{e.preventDefault();render();});
$('inputs').addEventListener('input',render);
$('export').addEventListener('click',()=>{
 const csv='PMA_weeks,typical_clearance_L_h_kg,source_DOI\n'+M.curve().map(p=>p.pma.toFixed(1)+','+p.clearance.toFixed(8)+',10.1097/01.inf.0000435509.75114.3d').join('\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'})),a=document.createElement('a');a.href=url;a.download='ayflux-neonatal-model.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
render();
