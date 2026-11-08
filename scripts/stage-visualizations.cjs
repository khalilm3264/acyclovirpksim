/* Stage the pinned MIT-licensed full Plotly distribution for optional 3D only. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),pkg=path.join(root,'node_modules/plotly.js-dist-min');
const meta=JSON.parse(fs.readFileSync(path.join(pkg,'package.json'),'utf8'));
if(meta.version!=='3.3.1')throw Error('Expected Plotly 3.3.1');
fs.mkdirSync(path.join(root,'public/assets/vendor'),{recursive:true});
fs.copyFileSync(path.join(pkg,'plotly.min.js'),path.join(root,'public/assets/vendor/plotly-full-3.3.1.min.js'));
fs.copyFileSync(path.join(pkg,'LICENSE'),path.join(root,'public/assets/vendor/plotly-full-LICENSE.txt'));
console.log('Staged optional Plotly 3D bundle; downloaded only when requested.');
