'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const {evaluate} = require('../research/validation/manders2026-sadjadi2018.cjs');

function assertCloseRecursive(actual, expected, propPath = '') {
  if (typeof actual === 'number' && typeof expected === 'number') {
    if (Number.isNaN(actual) && Number.isNaN(expected)) return;
    const diff = Math.abs(actual - expected);
    const tol = 1e-6 * Math.max(1, Math.abs(actual), Math.abs(expected));
    assert.ok(diff <= tol, `Numeric mismatch at ${propPath}: actual=${actual}, expected=${expected}`);
    return;
  }
  if (Array.isArray(actual) && Array.isArray(expected)) {
    assert.equal(actual.length, expected.length, `Array length mismatch at ${propPath}`);
    for (let i = 0; i < actual.length; i++) {
      assertCloseRecursive(actual[i], expected[i], `${propPath}[${i}]`);
    }
    return;
  }
  if (actual && expected && typeof actual === 'object' && typeof expected === 'object') {
    const actKeys = Object.keys(actual).sort();
    const expKeys = Object.keys(expected).sort();
    assert.deepEqual(actKeys, expKeys, `Keys mismatch at ${propPath}`);
    for (const key of expKeys) {
      if (propPath === '' && key === 'metadata') {
        assert.equal(actual.metadata.modelCommit, expected.metadata.modelCommit);
        assert.equal(actual.metadata.engineBlob, expected.metadata.engineBlob);
        assert.equal(actual.metadata.engineSha256, expected.metadata.engineSha256);
        assert.equal(actual.metadata.protocolPath, expected.metadata.protocolPath);
        assert.equal(actual.metadata.protocolCommit, expected.metadata.protocolCommit);
        assert.equal(actual.metadata.protocolBlob, expected.metadata.protocolBlob);
        assert.equal(actual.metadata.protocolSha256, expected.metadata.protocolSha256);
        continue;
      }
      assertCloseRecursive(actual[key], expected[key], propPath ? `${propPath}.${key}` : key);
    }
    return;
  }
  assert.equal(actual, expected, `Value mismatch at ${propPath}`);
}

test('Manders 2026 and Sadjadi 2018 frozen-protocol evaluations reproduce pinned results', () => {
  const actual = evaluate();
  const savedPath = path.resolve(__dirname, '../research/validation/manders2026-sadjadi2018-results.json');
  const saved = JSON.parse(fs.readFileSync(savedPath, 'utf8'));

  assert.equal(actual.metadata.engineBlob, '17971df66e0a97b4d382572a582d35c444a3c83f');
  assert.equal(actual.metadata.protocolCommit, '29f271e9da1410f4d073ad9af9346b56f832387b');

  // Verify prespecified primary n=6 inclusion (Case F plasma 43.4 mg/L PICC outlier and Case H NA excluded).
  const primaryDefault = actual.manders2026.primaryPlasma.combinations.find(
    c => c.surrogate === 'during-raw' && c.variant === 'default',
  );
  assert.deepEqual(primaryDefault.cases.map(r => r.caseId), ['A', 'B', 'C', 'D', 'E', 'G']);
  assert.ok(actual.manders2026.primaryPlasma.maxStepRelDiff < 0.001);
  assert.ok(actual.manders2026.primaryPlasma.maxAnalyticRelDiff < 0.001);

  assert.equal(actual.manders2026.caseFCsf.patient.observedPlasmaExcludedMgL, 43.4);
  assert.equal(actual.manders2026.caseFCsf.gridRows.length, 24);
  assert.ok(actual.manders2026.caseFCsf.maxStepRelDiff < 0.001);

  assert.equal(actual.sadjadi2018.rows.length, 36);
  assert.ok(actual.sadjadi2018.maxStepRelDiff < 0.001);
  for (const row of actual.sadjadi2018.rows) {
    assert.ok(Number.isFinite(row.day5Peak97hMgL) && row.day5Peak97hMgL > row.day5Trough120hMgL);
    assert.ok(Number.isFinite(row.day5Trough120hMgL) && row.day5Trough120hMgL > 0);
  }

  // Cross-platform recursive parity against the pinned results JSON artifact.
  assertCloseRecursive(actual, saved);
});
