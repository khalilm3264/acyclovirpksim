'use strict';
// Search indexing: every page in the sitemap describes itself consistently, hidden pages stay out,
// and deploys add accurate <lastmod> dates from git history.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),pub=path.join(root,'public'),ORIGIN='https://ayflux.org';
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const sitemapUrls=()=>[...read('public/sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
const fileFor=url=>{
 const rel=decodeURIComponent(url.slice(ORIGIN.length));
 return rel.endsWith('/')?path.join(pub,rel,'index.html'):path.join(pub,rel+'.html');
};
const ENTITIES={'&quot;':'"','&#x27;':"'",'&#39;':"'",'&lt;':'<','&gt;':'>','&amp;':'&'};
const decode=t=>t.replace(/&(?:quot|#x27|#39|lt|gt|amp);/g,m=>ENTITIES[m]||m);
const meta=(html,attr,name)=>{const m=html.match(new RegExp('<meta\\s+'+attr+'="'+name+'"\\s+content="([^"]*)"'));return m&&decode(m[1]);};

test('every sitemap page has a title, a description, a matching canonical URL and social tags',()=>{
 const urls=sitemapUrls();
 assert.ok(urls.length>=15);
 for(const url of urls){
  const file=fileFor(url);assert.ok(fs.existsSync(file),url+' has no page file');
  const html=fs.readFileSync(file,'utf8');
  const title=html.match(/<title>([\s\S]*?)<\/title>/);assert.ok(title&&title[1].trim(),url+' title');
  const description=meta(html,'name','description');
  assert.ok(description&&description.length>=50&&description.length<=170,url+' description length '+(description||'').length);
  const canonical=html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/);
  assert.equal(canonical&&canonical[1],url,url+' canonical must equal its sitemap URL');
  assert.equal(meta(html,'property','og:url'),url,url+' og:url');
  assert.ok(meta(html,'property','og:title'),url+' og:title');
  assert.equal(meta(html,'property','og:description'),description,url+' og:description matches the description');
  assert.doesNotMatch(meta(html,'name','robots')||'',/noindex/,url+' must not be noindex');
 }
});

test('pages marked noindex stay out of the sitemap',()=>{
 const listed=new Set(sitemapUrls().map(fileFor));
 const html=fs.readdirSync(pub,{recursive:true}).filter(p=>p.endsWith('.html'));
 const hidden=html.filter(p=>/<meta\s+name="robots"\s+content="[^"]*noindex/.test(fs.readFileSync(path.join(pub,p),'utf8')));
 assert.ok(hidden.includes(path.join('cats','index.html')),'the cats page is noindex');
 for(const p of hidden)assert.ok(!listed.has(path.join(pub,p)),p+' is noindex but listed');
 assert.match(read('public/robots.txt'),/^Sitemap: https:\/\/ayflux\.org\/sitemap\.xml$/m);
});

test('the home page has valid structured data describing a free educational web app',()=>{
 const html=read('public/index.html');
 const blocks=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
 assert.equal(blocks.length,1);
 const graph=blocks[0]['@graph'];
 const app=graph.find(n=>n['@type']==='SoftwareApplication'),site=graph.find(n=>n['@type']==='WebSite');
 assert.equal(site.url,ORIGIN+'/');assert.equal(app.url,ORIGIN+'/');assert.equal(app.name,'AyFlux');
 assert.equal(app.applicationCategory,'EducationalApplication');assert.equal(app.isAccessibleForFree,true);
 assert.equal(app.author.name,read('CITATION.cff').match(/given-names: "([^"]+)"/)[1]+' '+read('CITATION.cff').match(/family-names: "([^"]+)"/)[1]);
 assert.equal(app.description,meta(html,'name','description'));
 assert.doesNotMatch(JSON.stringify(blocks[0]),/clinical decision|dosing tool|diagnos/i,'no clinical claims in structured data');
});

test('deploys add <lastmod> from full git history; the committed sitemap stays URL-only',()=>{
 assert.doesNotMatch(read('public/sitemap.xml'),/<lastmod>/,'commit the URL-only sitemap; dates are added at deploy');
 const r=spawnSync(process.execPath,['scripts/sitemap.cjs','--lastmod'],{cwd:root,encoding:'utf8'});
 assert.notEqual(r.status,0,'--lastmod without --write (or on a shallow clone) must fail');
 const yml=read('.github/workflows/pages.yml');
 for(const job of ['deploy-pages','deploy-cloudflare']){
  const start=yml.indexOf('\n  '+job+':'),next=yml.indexOf('\n  deploy-',start+5),block=yml.slice(start,next<0?undefined:next);
  assert.match(block,/fetch-depth: 0/,job+' checks out full history');
  assert.match(block,/parse5@/,job+' installs parse5 for the sitemap script');
  const step=block.indexOf('node scripts/sitemap.cjs --write --lastmod');
  assert.ok(step>0,job+' adds lastmod');
  const publish=Math.max(block.indexOf('upload-pages-artifact'),block.indexOf('wrangler-action'));
  assert.ok(step<publish,job+' adds lastmod before publishing');
 }
});
