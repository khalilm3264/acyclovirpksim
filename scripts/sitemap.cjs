// Validate indexable page coverage and robots.txt discovery, or regenerate with --write.
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {parse}=require('parse5');
const root=path.resolve(__dirname,'../public'), origin='https://ayflux.org';
function excluded(node){
 if(node.tagName==='meta'){
  const attrs=Object.fromEntries(node.attrs.map(a=>[a.name,a.value.toLowerCase()]));
  if(['robots','googlebot'].includes(attrs.name)&&attrs.content?.split(/[\s,]+/).some(t=>['noindex','none'].includes(t)))return true;
 }
 return node.childNodes?.some(excluded)??false;
}
const urls=fs.readdirSync(root,{recursive:true}).filter(p=>p.endsWith('.html')&&!excluded(parse(fs.readFileSync(path.join(root,p),'utf8'))))
 .map(p=>origin+'/'+p.split(path.sep).map(encodeURIComponent).join('/').replace(/(?:^|\/)index\.html$/,m=>m.startsWith('/')?'/':'').replace(/\.html$/,'')).sort();
const xml="<?xml version='1.0' encoding='utf-8'?>\n"+'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+urls.map(url=>'  <url>\n    <loc>'+url+'</loc>\n  </url>').join('\n')+'\n</urlset>\n';
const file=path.join(root,'sitemap.xml');
if(process.argv.includes('--write'))fs.writeFileSync(file,xml);
assert.equal(fs.readFileSync(file,'utf8'),xml,'Run node scripts/sitemap.cjs --write to update the sitemap');
assert.ok(fs.readFileSync(path.join(root,'robots.txt'),'utf8').split(/\r?\n/).includes('Sitemap: '+origin+'/sitemap.xml'));
console.log('Verified '+urls.length+' sitemap entries');
