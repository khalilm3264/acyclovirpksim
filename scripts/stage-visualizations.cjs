'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
fs.mkdirSync(path.join(root,'public/assets/vendor'),{recursive:true});
for (const [name,version] of [['echarts','5.6.0'],['echarts-gl','2.0.9']]) {
  const directory=path.join(root,'node_modules',name);
  const target=path.join(root,'public/assets/vendor');
  if (require(path.join(directory,'package.json')).version !== version) throw Error('Unexpected '+name+' version');
  fs.copyFileSync(path.join(directory,'dist',name+'.min.js'),path.join(target,name+'-'+version+'.min.js'));
  for (const file of fs.readdirSync(directory).filter(file=>/^(license|notice)(\.|$)/i.test(file))) {
    fs.copyFileSync(path.join(directory,file),path.join(target,name+'-'+file));
  }
}
