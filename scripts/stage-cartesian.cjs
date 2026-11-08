#!/usr/bin/env node
/*
 * Stage the pinned, official Plotly Cartesian distribution for AyFlux's
 * on-demand heatmap. The main simulator still loads the smaller Basic bundle.
 *
 * Usage:
 *   npm install --no-save --ignore-scripts --no-audit --no-fund plotly.js-cartesian-dist-min@3.3.1
 *   node scripts/stage-cartesian.cjs
 *
 * The published npm package is MIT licensed, with no runtime dependencies.
 * Do not pull an unversioned script from a CDN at runtime.
 */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const packageRoot=path.join(root,'node_modules','plotly.js-cartesian-dist-min');
const meta=JSON.parse(fs.readFileSync(path.join(packageRoot,'package.json'),'utf8'));
if(meta.version!=='3.3.1')throw Error('Expected Plotly Cartesian v3.3.1, found '+meta.version);
const src=path.join(packageRoot,'plotly-cartesian.min.js');
if(!fs.existsSync(src))throw Error('Official Plotly Cartesian distribution is missing: '+src);
const dst=path.join(root,'public','assets','vendor','plotly-cartesian-3.3.1.min.js');
fs.copyFileSync(src,dst);
const n=fs.statSync(dst).size;
if(n<500000 || n>3000000)throw Error('Unexpected Cartesian bundle size '+n);
process.stdout.write('Staged pinned Plotly Cartesian '+meta.version+' ('+(n/1024/1024).toFixed(2)+' MiB)\n');
