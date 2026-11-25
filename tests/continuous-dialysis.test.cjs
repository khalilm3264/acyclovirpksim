const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const folder = path.join(__dirname, '../public/experimental/continuous-dialysis');
const { rows, methods, plasmaAt, volumeL, endogenousMlMin, anchorMgL } = require(
  path.join(folder, 'model.js')
);

test('Collignon Table 1 and clearance ranges match the static fallback', () => {
  const html = fs.readFileSync(path.join(folder, 'index.html'), 'utf8');
  const body = html.split('<tbody>')[1].split('</tbody>')[0];
  const table = [...body.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(([, row]) =>
    [...row.matchAll(/>(H?\d+(?:\.\d+)?)<\//g)].map(([, val]) => Number(val.replace(/^H/, '')))
  );
  assert.deepEqual(rows, table);
  for (const [key, col] of [
    ['postfilter', 4],
    ['effluent', 5]
  ]) {
    assert.equal(methods[key].low, Math.min(...rows.map((row) => row[col])));
    assert.equal(methods[key].high, Math.max(...rows.map((row) => row[col])));
  }
});

test('fixed post-H1 sensitivity preserves the observed starting value and separates filter estimates', () => {
  assert.equal(volumeL, 10.8);
  assert.equal(endogenousMlMin, 29.45);
  for (const method of Object.values(methods)) {
    for (const clearance of [method.low, method.high])
      assert.equal(plasmaAt(0, clearance), anchorMgL);
  }
  assert.ok(plasmaAt(7, methods.effluent.low) < plasmaAt(7, methods.postfilter.high));
  const halfTime = (Math.log(2) * volumeL) / ((endogenousMlMin + methods.postfilter.low) * 0.06);
  assert.ok(Math.abs(plasmaAt(halfTime, methods.postfilter.low) - anchorMgL / 2) < 1e-12);
});
