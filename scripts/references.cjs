/* Generate the standalone bibliography from the simulator's stable reference entries. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const main=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
const cite=fs.readFileSync(path.join(root,'public/cite/index.html'),'utf8');
const entries=[...main.matchAll(/<li id="ref(\d+)">[\s\S]*?<\/li>/g)];
assert.ok(entries.length,'No reference entries found');
assert.deepEqual(entries.map(m=>Number(m[1])),Array.from({length:entries.length},(_,i)=>i+1),'Reference anchors must remain sequential');
const title='References | AyFlux';
const description='Numbered acyclovir, valacyclovir, CMMG, dialysis and pediatric pharmacokinetic references with DOI links and evidence notes.';
const header=cite.slice(0,cite.indexOf('  <main')).replaceAll('How to Cite AyFlux | Software Citation',title)
 .replaceAll('Citation details, BibTeX, and the machine-readable CITATION.cff file for the AyFlux acyclovir pharmacokinetics simulator.',description)
 .replaceAll('https://ayflux.org/cite/','https://ayflux.org/references/');
const footer=cite.slice(cite.indexOf('  <footer'));
const output=header+`  <main id="main-content" class="legal-content">
    <section class="page-intro"><span class="eyebrow">Scientific sources</span><h1>References</h1><p>Primary literature, labeling and guidance used in AyFlux. Numbers match the simulator.</p></section>
    <section class="card"><h2>Using these references</h2><p><a href="/cite/">Cite the software</a> and the studies relevant to your analysis. Read <a href="/learn/model-methods/#source-notes">parameter sources and model assumptions</a> and the <a href="/research/pediatric/evidence">pediatric evidence review</a> for what each source can support.</p><p>Bibliographic details do not imply full-text review or model validation. Individual entries identify abstract-only evidence, reconstructed cases, overlapping reports and publication versions.</p><p><a href="#ref1">Renal failure and dialysis anchors</a> · <a href="#ref15">Plasma and CSF</a> · <a href="#ref25">Pediatric and population models</a> · <a href="#ref38">CRRT studies</a></p></section>
    <section class="card"><h2>Numbered bibliography</h2><ol class="refs">\n${entries.map(m=>m[0]).join('\n')}\n</ol></section>
    <div class="actions"><a class="btn" href="/">Return to simulator</a><a class="btn" href="/learn/">User guide</a></div>
  </main>
`+footer;
const file=path.join(root,'public/references/index.html');
if(process.argv.includes('--check'))assert.equal(fs.readFileSync(file,'utf8'),output,'Run node scripts/references.cjs to synchronize the bibliography');
else{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,output);}
console.log('Verified '+entries.length+' synchronized references');
