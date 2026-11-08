/*
 * AyFlux — educational simulation result CSV exchange.
 * Copyright (C) 2026 Muhammad Khalil
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * This file is part of AyFlux. No warranty; not for patient care.
 * See https://github.com/khalilm3264/acyclovirpksim/blob/main/LICENSE
 */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AyFluxExchange = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const ANALYTES = [
    ["plasma", "plasma_acyclovir"],
    ["csf", "csf_acyclovir"],
    ["cmmg", "plasma_cmmg"],
    ["csfCmmg", "csf_cmmg"],
  ];
  const STATISTICS = ["median", "lower", "upper"];
  const HEADERS = [
    "time_hours",
    "scenario",
    "analyte",
    "statistic",
    "concentration_mg_L",
    "central_interval_coverage",
  ];

  function csvCell(value) {
    const str = String(value == null ? "" : value);
    return /[,"\r\n]/.test(str) ? '"' + str.replace(/"/g, '""') + '"' : str;
  }

  function exportTidyCSV(results, scenarioNames, options = {}) {
    if (!results || typeof results !== "object") throw new Error("No simulation results to export.");
    if (!Array.isArray(scenarioNames) || !scenarioNames.length) {
      throw new Error("No scenarios selected for CSV export.");
    }
    const coverage = options.coverage;
    if (coverage !== undefined && (!Number.isFinite(coverage) || coverage <= 0 || coverage > 1)) {
      throw new Error("The model interval coverage must be between 0 and 1.");
    }
    const coverageText = coverage === undefined ? "" : String(coverage);
    const rows = [HEADERS.join(",")];
    for (const name of scenarioNames) {
      const simulation = results[name];
      if (!simulation || !Array.isArray(simulation.time) || !simulation.time.length ||
          simulation.time.length > 100000) {
        throw new Error("Missing or invalid time series for scenario: " + name);
      }
      const n = simulation.time.length;
      for (const [key] of ANALYTES) {
        for (const statistic of STATISTICS) {
          if (!Array.isArray(simulation[key]?.[statistic]) ||
              simulation[key][statistic].length !== n) {
            throw new Error("Missing " + key + " " + statistic + " series for scenario: " + name);
          }
        }
      }
      for (let i = 0; i < n; i++) {
        const time = simulation.time[i];
        if (!Number.isFinite(time) || time < 0) {
          throw new Error("Invalid time value in scenario: " + name);
        }
        for (const [key, label] of ANALYTES) {
          for (const statistic of STATISTICS) {
            const value = simulation[key][statistic][i];
            if (!Number.isFinite(value)) {
              throw new Error("Invalid concentration in " + name + " / " + label + ".");
            }
            rows.push([
              time, name, label, statistic, value, coverageText,
            ].map(csvCell).join(","));
          }
        }
      }
    }
    return rows.join("\r\n") + "\r\n";
  }

  return { ANALYTES, STATISTICS, HEADERS, exportTidyCSV };
});
