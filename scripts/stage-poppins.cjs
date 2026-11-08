#!/usr/bin/env node
/* Stage the licensed Poppins 300 and 800 font faces at build time.
 * CSS references only first-party URLs, keeping the existing CSP intact.
 * Files remain web assets; do not include them in the source archive manually.
 */
"use strict";
const fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"..");
const base=path.join(root,"node_modules","@fontsource","poppins");
const meta=JSON.parse(fs.readFileSync(path.join(base,"package.json"),"utf8"));
if(meta.version!=="5.3.0")throw Error("Expected @fontsource/poppins 5.3.0; got "+meta.version);
const dest=path.join(root,"public","assets","fonts");
fs.mkdirSync(dest,{recursive:true});
for(const weight of [300,800]){
 const name="poppins-latin-"+weight+"-normal.woff2";
 const from=path.join(base,"files",name);
 if(!fs.existsSync(from))throw Error("Missing pinned font asset "+name);
 const to=path.join(dest,name);
 fs.copyFileSync(from,to);
 const size=fs.statSync(to).size;
 if(size<2000||size>80000)throw Error("Unexpected font asset size "+size);
 process.stdout.write("Staged Poppins "+weight+" ("+(size/1024).toFixed(1)+" KiB)\n");
}
const license=path.join(base,"OFL.txt");
if(fs.existsSync(license))fs.copyFileSync(license,path.join(dest,"OFL.txt"));
