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
// --lastmod (deploy only): add <lastmod> from git history. A page's date is the last commit that
// touched its HTML file or any other file in its own directory (not subdirectories); the home page
// also counts public/assets/, which holds the simulator itself. Requires full history, so it refuses
// to run on a shallow clone, where every date would be the same. The committed sitemap stays
// URL-only, so ordinary commits never churn it.
let lastmod=null;
if(process.argv.includes('--lastmod')){
 const {execFileSync}=require('node:child_process');
 const git=args=>execFileSync('git',args,{cwd:path.resolve(root,'..'),encoding:'utf8'}).trim();
 if(git(['rev-parse','--is-shallow-repository'])==='true')throw Error('--lastmod needs full git history (actions/checkout with fetch-depth: 0)');
 lastmod=new Map();
 const pages=fs.readdirSync(root,{recursive:true}).filter(p=>p.endsWith('.html')&&!excluded(parse(fs.readFileSync(path.join(root,p),'utf8'))));
 for(const page of pages){
  const dir=path.dirname(page),own=fs.readdirSync(path.join(root,dir),{withFileTypes:true}).filter(d=>d.isFile()&&(!d.name.endsWith('.html')||d.name===path.basename(page))).map(d=>path.join('public',dir,d.name));
  if(dir==='.')own.push('public/assets');
  const date=git(['log','-1','--format=%cs','--',...own]);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('No commit date for '+page);
  lastmod.set(origin+'/'+page.split(path.sep).map(encodeURIComponent).join('/').replace(/(?:^|\/)index\.html$/,m=>m.startsWith('/')?'/':'').replace(/\.html$/,''),date);
 }
}
const xml="<?xml version='1.0' encoding='utf-8'?>\n"+'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+urls.map(url=>'  <url>\n    <loc>'+url+'</loc>\n'+(lastmod?'    <lastmod>'+lastmod.get(url)+'</lastmod>\n':'')+'  </url>').join('\n')+'\n</urlset>\n';
const file=path.join(root,'sitemap.xml');
if(process.argv.includes('--write'))fs.writeFileSync(file,xml);
else if(lastmod)throw Error('--lastmod is only for deploy builds; use it with --write');
assert.equal(fs.readFileSync(file,'utf8'),xml,'Run node scripts/sitemap.cjs --write to update the sitemap');
assert.ok(fs.readFileSync(path.join(root,'robots.txt'),'utf8').split(/\r?\n/).includes('Sitemap: '+origin+'/sitemap.xml'));
console.log('Verified '+urls.length+' sitemap entries');
