const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const route = path.resolve(__dirname, '../public/experimental/tablet-food');
const model = require(path.join(route, 'model.js'));
const html = fs.readFileSync(path.join(route, 'index.html'), 'utf8');

test('verified published tablet samples reproduce the group peaks and 0–12 hour AUC', () => {
  const table = html.match(/<table id="measured">([\s\S]*?)<\/table>/)[1];
  const rows = [
    ...table.matchAll(
      /<tr>\s*<th scope="row">([\d.]+)<\/th>\s*<td>([\d.]+)<\/td>\s*<td>([\d.]+)<\/td>\s*<\/tr>/g
    )
  ].map(([, time, fed, fasted]) => [Number(time), Number(fed) / 1000, Number(fasted) / 1000]);
  assert.equal(rows.length, 19);
  assert.equal(rows.at(-1)[0], 24);
  for (const [column, peakTime, peak, observedAuc] of [
    [1, 3, 0.87431, 5.4038],
    [2, 1.33, 0.66813, 3.50975]
  ]) {
    const largest = rows.reduce((a, b) => (a[column] > b[column] ? a : b));
    assert.equal(largest[0], peakTime);
    assert.ok(Math.abs(largest[column] - peak) < 1e-12);
    const auc = rows.reduce((sum, row, i) => {
      if (i === 0 || row[0] > 12) return sum;
      const previous = rows[i - 1];
      return sum + ((row[column] + previous[column]) / 2) * (row[0] - previous[0]);
    }, 0);
    assert.ok(Math.abs(auc - observedAuc) < 0.00001);
  }
});

test('slower absorption delays peak without changing total model AUC', () => {
  const { referenceKa, slowKa, clearanceLh, volumeL } = model.parameters;
  const reference = model.endpoints(referenceKa);
  const slow = model.endpoints(slowKa);
  assert.ok(slow.tmax > reference.tmax);
  assert.ok(slow.cmax < reference.cmax);
  assert.equal(slow.aucInfinity, reference.aucInfinity);
  for (const rate of [referenceKa, slowKa, clearanceLh / volumeL]) {
    let integral = 0;
    let previous = 0;
    for (let i = 1; i <= 10000; i++) {
      const next = model.concentration(i / 100, rate);
      integral += (previous + next) / 200;
      previous = next;
    }
    assert.ok(Math.abs(integral - model.endpoints(rate).aucInfinity) < 0.0001);
  }
});
