'use strict';
const test = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs');
const { compactJavaScript, syntax, build } = require('../scripts/build-release-site.cjs');
const { includesCode } = require('./source-tokens.cjs');
test('syntax-based source checks ignore formatting but preserve tokens and string boundaries', () => {
  assert.ok(includesCode('const dose = /* note */ 500;', 'const dose=500;'));
  assert.ok(!includesCode('const dose=50;', 'const dose=500;'));
  assert.ok(!includesCode('const note="const dose=500;";', 'const dose=500;'));
  assert.ok(includesCode('const note="value";', "const note='value';"));
});
test('compact deployment keeps template text, operators, numeric values and legal notices', () => {
  const source =
    '/* Copyright 2026; SPDX-License-Identifier: AGPL-3.0-only */\n  const a = 2;\n  let b = 3;\n  const x = `sheet${a}_${b}`;\n  const y = a + ++b;\n  this.result = [x, y];\n';
  const compact = compactJavaScript(source);
  assert.deepEqual(syntax(compact), syntax(source));
  assert.match(compact, /SPDX-License-Identifier/);
  assert.ok(compact.length < source.length);
  const before = {},
    after = {};
  require('node:vm').runInNewContext(source, before);
  require('node:vm').runInNewContext(compact, after);
  assert.equal(JSON.stringify(after.result), JSON.stringify(before.result));
});
test('production build verifies every compacted file and retains the byte-pinned model', () => {
  fs.mkdirSync('dist/site', { recursive: true });
  fs.writeFileSync('dist/site/stale.txt', 'old artifact');
  build();
  assert.equal(fs.existsSync('dist/site/stale.txt'), false);
  assert.equal(
    fs.readFileSync('dist/site/assets/pk-engine.js', 'utf8'),
    fs.readFileSync('public/assets/pk-engine.js', 'utf8')
  );
});
