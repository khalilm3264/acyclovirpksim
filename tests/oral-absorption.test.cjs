'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {studies, amount, concentration, fit} = require('../public/experimental/oral-absorption/model.js');

test('Weller refit and frozen Phan check use the same systemic disposition across absorption models', () => {
  assert.equal(fit(1).value, .589);
  assert.equal(fit(2).value, 1.635);
  assert.ok(Math.abs(concentration(studies[1], 1, 2, 1.636) - 2.641) < .001);
  for (const study of studies) {
    for (const model of [[1,1.8,0],[1,1.8,.590],[2,1.636,0]]) {
      // Independent integration of the concentration curve checks its total exposure.
      let area=0;
      const dt=1/64;
      for(let t=dt/2;t<200;t+=dt) area+=dt*concentration(study,t,...model);
      assert.ok(Math.abs(area-amount/study.cl)<.001);
    }
  }
});
