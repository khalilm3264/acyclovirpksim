// Give each deployed static shell a distinct service worker, including HTML-only changes.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../public');
const worker = path.join(root, 'sw.js');
const original = fs.readFileSync(worker, 'utf8');
const version = require('../package.json').version;
const marker = /^const CACHE = "ayflux-static-v[^"]+";$/m;
if (!marker.test(original)) throw Error('Missing offline cache version');
const template = original.replace(marker, 'const CACHE = "ayflux-static-v' + version + '";');
const hash = crypto.createHash('sha256').update(template);
function addDirectory(directory) {
 for (const entry of fs.readdirSync(directory, {withFileTypes: true}).sort((a, b) =>
   a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
   const file = path.join(directory, entry.name);
   if (entry.isDirectory()) addDirectory(file);
   else if (entry.isFile() && file !== worker) {
     const digest = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
     hash.update(path.relative(root, file).split(path.sep).join('/') + '\0' + digest + '\n');
   }
 }
}
addDirectory(root);
const cache = 'ayflux-static-v' + version + '-' + hash.digest('hex').slice(0, 20);
fs.writeFileSync(worker, template.replace(marker, 'const CACHE = "' + cache + '";'));
console.log('Staged offline cache ' + cache);
