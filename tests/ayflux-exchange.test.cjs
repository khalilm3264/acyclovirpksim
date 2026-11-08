const test = require("node:test");
const assert = require("node:assert/strict");
const { exportTidyCSV, HEADERS } = require("../public/assets/ayflux-exchange.js");

function sample() {
  const concentration = { median: [0, 1.5], lower: [0, 1], upper: [0, 2] };
  return {
    time: [0, 0.25],
    plasma: concentration,
    csf: concentration,
    cmmg: concentration,
    csfCmmg: concentration,
  };
}

test("Tidy CSV includes explicit time, scenario, analyte, statistic and units", () => {
  const csv = exportTidyCSV({ "No dialysis": sample() }, ["No dialysis"], { coverage: 0.9 });
  const lines = csv.trimEnd().split("\r\n");
  assert.equal(lines[0], HEADERS.join(","));
  assert.equal(lines.length, 1 + 2 * 4 * 3);
  assert.equal(lines[1], "0,No dialysis,plasma_acyclovir,median,0,0.9");
  assert.ok(lines.includes("0.25,No dialysis,csf_cmmg,upper,2,0.9"));
});

test("Scenario strings are safely CSV-escaped", () => {
  const name = 'Mode, "special"';
  const csv = exportTidyCSV({ [name]: sample() }, [name]);
  assert.match(csv, /"Mode, ""special"""/);
  assert.equal(csv.split("\r\n")[1].split(",")[0], "0");
});

test("Rejects missing result arrays rather than silently exporting wrong values", () => {
  const broken = sample();
  delete broken.plasma.lower;
  assert.throws(
    () => exportTidyCSV({ HD: broken }, ["HD"], { coverage: 0.9 }),
    /Missing plasma lower/,
  );
});

test("Rejects nonfinite model output and invalid coverage", () => {
  const broken = sample();
  broken.cmmg.median[0] = NaN;
  assert.throws(() => exportTidyCSV({ HD: broken }, ["HD"]), /Invalid concentration/);
  assert.throws(
    () => exportTidyCSV({ HD: sample() }, ["HD"], { coverage: 2 }),
    /interval coverage/,
  );
});

test("All scenarios appear in a single CSV", () => {
  const csv = exportTidyCSV({ HD: sample(), PD: sample() }, ["HD", "PD"]);
  assert.equal(csv.trimEnd().split("\r\n").length, 1 + 2 * 2 * 4 * 3);
  assert.match(csv, /0,HD,plasma_acyclovir,median,0,/);
  assert.match(csv, /0,PD,plasma_acyclovir,median,0,/);
});
