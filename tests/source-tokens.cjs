'use strict';
const { tokenizer } = require('acorn');
const cache = new Map();
function tokens(source) {
  if (cache.has(source)) return cache.get(source);
  const out = [];
  for (const t of tokenizer(source, { ecmaVersion: 'latest', sourceType: 'module' }))
    out.push({ key: t.type.label + ':' + JSON.stringify(t.value), start: t.start, end: t.end });
  cache.set(source, out);
  return out;
}
function findCode(source, fragment, from = 0) {
  const query = tokens(fragment),
    all = tokens(source);
  if (!query.length) return source.indexOf(fragment.trim(), from);
  for (let i = 0; i <= all.length - query.length; i++) {
    if (all[i].start < from) continue;
    if (query.every((q, j) => q.key === all[i + j].key)) return all[i].start;
  }
  return -1;
}
function includesCode(source, fragment) {
  return findCode(source, fragment) >= 0;
}
module.exports = { findCode, includesCode };
