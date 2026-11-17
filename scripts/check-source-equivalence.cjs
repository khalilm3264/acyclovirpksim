'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { parse } = require('acorn');
const base = process.argv[2];
if (base !== '--model' && (!base || !/^[0-9a-f]{40}$/.test(base)))
  throw Error('Pass the full commit SHA to compare.');
const files = execFileSync('git', ['ls-files', 'public/**/*.js', 'src/index.js'], {
  encoding: 'utf8'
})
  .trim()
  .split('\n')
  .filter((file) => !file.endsWith('/ayflux-version.js'));
function syntax(source, file) {
  const ast = parse(source, {
    ecmaVersion: 'latest',
    sourceType: file === 'src/index.js' ? 'module' : 'script'
  });
  return JSON.parse(
    JSON.stringify(ast, function (key, value) {
      if (key === 'start' || key === 'end' || (key === 'raw' && this.type === 'Literal'))
        return undefined;
      return value;
    })
  );
}
if (base === '--model') {
  assert.deepEqual(
    syntax(fs.readFileSync('src/model/pk-engine.js', 'utf8'), 'model'),
    syntax(fs.readFileSync('public/assets/pk-engine.js', 'utf8'), 'model'),
    'Readable model and deployed model must have identical executable syntax'
  );
  console.log('Readable model matches the byte-pinned runtime.');
} else
  for (const file of files) {
    const before = execFileSync('git', ['show', base + ':' + file], { encoding: 'utf8' });
    assert.deepEqual(
      syntax(
        fs.readFileSync(
          file === 'public/assets/pk-engine.js' ? 'src/model/pk-engine.js' : file,
          'utf8'
        ),
        file
      ),
      syntax(before, file),
      file + ': executable syntax changed'
    );
    console.log('Unchanged executable syntax: ' + file);
  }
