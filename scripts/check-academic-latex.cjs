/* Compile a generated table independently of the browser. Requires pdflatex/booktabs. */
'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process'),assert=require('node:assert/strict');
require('../public/assets/academic-exports.js');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ayflux-latex-'));
try{
 const summary=Object.fromEntries(['peak','auc','mPeak','mass','endPlasma'].map(k=>[k,{median:12.345,lower:.001,upper:2345.6}]));
 const table=AyFluxAcademic.latex({run:{summary},config:{horizon:168,coverage:.9,observations:[{role:'fit'}]},primary:'Custom sequence & HD_1 50% # $ {x} ~ ^ \\',version:'0.27.0'});
 fs.writeFileSync(path.join(dir,'table.tex'),'\\documentclass{article}\n\\usepackage[margin=1in]{geometry}\n\\usepackage{booktabs}\n\\begin{document}\n'+table+'\\end{document}\n');
 execFileSync('pdflatex',['-halt-on-error','-interaction=nonstopmode','table.tex'],{cwd:dir,stdio:'pipe'});
 const log=fs.readFileSync(path.join(dir,'table.log'),'utf8');assert.doesNotMatch(log,/Overfull \\hbox|LaTeX Error/);
 assert.ok(fs.statSync(path.join(dir,'table.pdf')).size>1000);console.log('LaTeX export compiled without overflow');
}catch(error){if(error.stdout)console.error(String(error.stdout));throw error;}finally{fs.rmSync(dir,{recursive:true,force:true});}
