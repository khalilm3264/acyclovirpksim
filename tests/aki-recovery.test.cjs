const assert = require("node:assert/strict");
const test = require("node:test");
const {
  observations,
  replay,
  crcl,
  estimatedBaseline,
  impaired,
} = require("../public/experimental/aki-recovery/model.js");

test("Haefeli markers are distinct and the text value is the replay anchor", () => {
  assert.equal(observations.length, 7);
  assert.equal(observations[0].concentration, 229.9);
  for (let i = 1; i < observations.length; i++) {
    assert.ok(observations[i].day > observations[i - 1].day);
    assert.ok(
      observations[i].concentration < observations[i - 1].concentration,
    );
  }
});
test("Recovery changes only clearance input and steepens a stable, converged tail", () => {
  assert.equal(crcl(3, "later"), impaired);
  assert.equal(crcl(12, "later"), estimatedBaseline);
  assert.ok(crcl(6, "earlier") > crcl(6, "later"));
  const fixed = replay("fixed", 7);
  const recovering = replay("later", 7);
  const fine = replay("later", 7, 0.00125);
  assert.deepEqual(fixed[0], recovering[0]);
  assert.ok(fixed.at(-1).concentration > recovering.at(-1).concentration);
  assert.ok(recovering.at(-1).concentration > 0);
  assert.ok(
    Math.abs(recovering.at(-1).concentration / fine.at(-1).concentration - 1) <
      1e-7,
  );
});
