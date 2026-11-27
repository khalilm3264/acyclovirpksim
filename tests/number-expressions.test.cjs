'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const evaluate = require('../public/assets/number-expressions.js');

test('numeric expressions honor precedence, grouping, signs and decimal notation', () => {
  assert.equal(evaluate('24*9'), 216);
  assert.equal(evaluate('24*(9+1)'), 240);
  assert.equal(evaluate('24+9*2'), 42);
  assert.equal(evaluate('10 − -2 × 3 ÷ .5'), 22);
  assert.equal(evaluate('1e-2 * 2e+2'), 2);
  assert.equal(evaluate(' 96 / 2 / 4 '), 12);
  assert.equal(evaluate('0'), 0);
});

test('numeric expressions reject malformed input, executable syntax and nonfinite values', () => {
  for (const input of [
    '', '2 4', '24*', '2(3)', '(24*9', '1/0', '1/1e309', '1e308*24',
    '24h', '2**4', '2;alert(1)', 'Math.max(2,3)', '('.repeat(161)
  ]) {
    assert.equal(evaluate(input), null, input);
  }
});
