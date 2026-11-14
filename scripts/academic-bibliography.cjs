/* Export the audited HTML catalogue without supplying missing metadata. */
'use strict';
const {parse}=require('parse5');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const escapeTex=value=>String(value).replace(/[\\{}%&#_$~^]/g,ch=>({'\\':'\\textbackslash{}','{':'\\{','}':'\\}','%':'\\%','&':'\\&','#':'\\#','_':'\\_','$':'\\$','~':'\\textasciitilde{}','^':'\\textasciicircum{}'}[ch]));
const text=node=>node.nodeName==='#text'?node.value:(node.childNodes||[]).map(text).join('');
const attr=(node,name)=>node.attrs?.find(a=>a.name===name)?.value;
function all(node,predicate){return [...(predicate(node)?[node]:[]),...(node.childNodes||[]).flatMap(n=>all(n,predicate))];}
function generate(main,cite,references){
 const nodes=all(parse(main),n=>n.tagName==='li'&&/^ref\d+$/.test(attr(n,'id')||''));
 assert.ok(nodes.length,'No numbered references');
 const extra=all(parse(references),n=>n.tagName==='section').find(n=>text(n).includes('Additional benchmark sources'));
 const additional=extra?all(extra,n=>n.tagName==='p'):[];
 const records=[...nodes,...additional].map((node,i)=>{
  const links=all(node,n=>n.tagName==='a'),first=links[0];assert.ok(first,'Reference title link missing');
  const title=text(first),full=text(node).replace(/\s+/g,' ').trim();
  const prefix=full.slice(0,full.indexOf(title)).trim().replace(/\.+$/,'');
  const author=prefix?prefix.replace(/\s+et al$/i,', et al').split(', ').map(name=>/^et al$/i.test(name)?'others':name.replace(/^(.+) ([A-Z][A-Z-]*)$/,'$1, $2')).join(' and '):null;
  const venue=all(node,n=>n.tagName==='em')[0];
  const year=venue?text(venue).match(/\b(19|20)\d{2}\b/)?.[0]:null;
  const doi=links.map(n=>attr(n,'href')).find(h=>h?.startsWith('https://doi.org/'))?.slice('https://doi.org/'.length);
  const fields={title,author,year,doi,url:attr(first,'href'),note:full};
  const key=i<nodes.length?`ayfluxRef${i+1}`:`ayfluxAdditional${i-nodes.length+1}`;
  return `@misc{${key},\n`+Object.entries(fields).filter(([,v])=>v).map(([k,v])=>`  ${k} = {${escapeTex(v)}}`).join(',\n')+'\n}';
 });
 const software=all(parse(cite),n=>n.tagName==='pre').map(text).find(t=>t.startsWith('@software{'));
 assert.ok(software,'Software BibTeX missing');
 return '% AyFlux complete numbered bibliography plus additional benchmark sources and software.\n% UTF-8 BibLaTeX/Biber recommended. Not a scenario-specific selection or validation claim.\n% Metadata is transcribed from the audited site; missing fields are intentionally omitted.\n% The note field preserves the complete source entry and its evidence limitations.\n\n'+[software,...records].join('\n\n')+'\n';
}
module.exports={generate,escapeTex};
if(require.main===module){
 const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
 const output=generate(read('public/index.html'),read('public/cite/index.html'),read('public/references/index.html'));
 const target=path.join(root,'public/references/ayflux.bib');
 if(process.argv.includes('--check'))assert.equal(fs.readFileSync(target,'utf8'),output,'Run node scripts/academic-bibliography.cjs to synchronize BibTeX');
 else fs.writeFileSync(target,output);
 console.log('Verified audited BibTeX catalogue');
}
