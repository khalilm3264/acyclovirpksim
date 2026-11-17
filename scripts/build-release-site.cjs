'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { parse, tokenizer } = require('acorn');
const root = path.resolve(__dirname, '..');
function syntax(source) {
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
  function clean(value) {
    if (!value || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(clean);
    const out = {};
    for (const [key, child] of Object.entries(value)) {
      if (key === 'start' || key === 'end' || (key === 'raw' && value.type === 'Literal')) continue;
      out[key] = clean(child);
    }
    return out;
  }
  return clean(ast);
}
function compactJavaScript(source, file = 'source.js') {
  const legal = [];
  const stream = tokenizer(source, {
    ecmaVersion: 'latest',
    sourceType: 'module',
    onComment: (_block, text, start, end) => {
      if (
        /copyright|SPDX-License-Identifier|@license|@preserve/i.test(text) ||
        text.startsWith('!')
      )
        legal.push(source.slice(start, end));
    }
  });
  const word = /[\w$\u0080-\uffff]/;
  const pairs = new Set([
    '++',
    '--',
    '**',
    '=>',
    '==',
    '!=',
    '<=',
    '>=',
    '<<',
    '>>',
    '&&',
    '||',
    '??',
    '+=',
    '-=',
    '*=',
    '/=',
    '%=',
    '&=',
    '|=',
    '^=',
    '?.',
    '..',
    '//',
    '/*'
  ]);
  let body = '',
    previous = '',
    previousEnd = 0;
  for (const token of stream) {
    const text = source.slice(token.start, token.end),
      left = previous.slice(-1),
      right = text[0];
    if (
      previous &&
      token.start > previousEnd &&
      ((word.test(left) && word.test(right)) ||
        pairs.has(left + right) ||
        (/\d/.test(left) && right === '.'))
    )
      body += ' ';
    body += text;
    previous = text;
    previousEnd = token.end;
  }
  const code = legal.join('\n') + '\n' + body + '\n';
  assert.deepEqual(
    syntax(code),
    syntax(source),
    file + ': deployment build changed executable syntax'
  );
  return code;
}
function build() {
  const output = path.join(root, 'dist/site');
  fs.rmSync(output, { recursive: true, force: true });
  fs.mkdirSync(output, { recursive: true });
  fs.cpSync(path.join(root, 'public'), output, { recursive: true });
  const files = execFileSync('git', ['ls-files', 'public/**/*.js'], { cwd: root, encoding: 'utf8' })
    .trim()
    .split('\n');
  for (const file of files) {
    // Keep the byte-pinned model artifact and tiny release metadata as supplied.
    if (file.endsWith('/pk-engine.js') || file.endsWith('/ayflux-version.js')) continue;
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    const target = path.join(output, path.relative('public', file));
    fs.writeFileSync(target, compactJavaScript(source, file));
  }
  console.log(
    'Prepared dist/site; executable syntax verified for every compacted application file.'
  );
}
module.exports = { compactJavaScript, syntax, build };
if (require.main === module) build();
