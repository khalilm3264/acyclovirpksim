# AyFlux results exchange (CSV, R, PK-Sim, and MoBi)

AyFlux provides **result-level interoperability**, not a native PK-Sim or MoBi model. In the simulator, open the single **Export CSV…** dropdown and choose **Detailed results** or **R / OSP tidy**. Choosing an option immediately downloads the selected file. The tidy format is designed for independent plotting, analysis, and cross-model comparisons. The **Research tools** tab can also import a PK-Sim or MoBi results CSV and overlay the corresponding curves after you explicitly map its columns and units. Imported data remain in your browser.

## Dynamic kidney function data

If using the optional time-varying CrCl profile, the **Detailed results** CSV includes an `entered_residual_crcl_mL_min` column at each simulated time point. The configuration JSON preserves the original user-entered hour/CrCl pairs. The **R / OSP tidy** export remains a concentration-only schema and does not carry a separate CrCl trajectory; keep the matching JSON configuration when sharing a reproducible example.

## Tidy CSV schema (v1)

The CSV contains **one row per time, scenario, analyte, and statistic**. The file is UTF-8, comma-delimited, double-quote escaped per standard CSV conventions, and uses a decimal point. It contains no patient identifiers unless someone adds such information outside AyFlux.

| Column | Meaning |
| --- | --- |
| `time_hours` | Time since simulation start, in hours (not a clock time) |
| `scenario` | AyFlux dialysis scenario name |
| `analyte` | `plasma_acyclovir`, `csf_acyclovir`, `plasma_cmmg`, or `csf_cmmg` |
| `statistic` | `median`, `lower`, or `upper` from the modeled parameter ensemble |
| `concentration_mg_L` | Simulated concentration (mg/L) |
| `central_interval_coverage` | Requested model interval coverage as a fraction (e.g., `0.9`), or blank if not supplied |

Example:

```csv
time_hours,scenario,analyte,statistic,concentration_mg_L,central_interval_coverage
0,No dialysis,plasma_acyclovir,median,0,0.9
0,No dialysis,plasma_acyclovir,lower,0,0.9
0,No dialysis,plasma_acyclovir,upper,0,0.9
```

The results are **predictions**, not measured concentrations. The interval is not a clinically validated prediction interval. No units are inferred or converted during export. AyFlux's separate JSON configuration format is **not** a PK-Sim or MoBi project file.

## R workflow

The accompanying **base-R example** is [`interop/ayflux_compare.R`](../interop/ayflux_compare.R). It requires no additional R libraries for importing and plotting CSV curves.

```r
source("interop/ayflux_compare.R")

# Read an AyFlux median plasma curve for one scenario.
ayflux <- read_ayflux_curve(
  "ayflux_results_tidy.csv",
  scenario = "Intermittent HD",
  analyte = "plasma_acyclovir"
)
plot(ayflux$time_hours, ayflux$concentration_mg_L, type = "l",
     xlab = "Time (h)", ylab = "Plasma acyclovir (mg/L)")

# Compare against one output from a PK-Sim/MoBi export.
# Replace exact column names with those from your CSV (names(osp_data)).
osp <- read_osp_curve(
  "osp_simulation_results.csv",
  time_column = "Time",
  concentration_column = "Organism|PeripheralVenousBlood|Aciclovir|Plasma (Peripheral Venous Blood)",
  time_unit = "h",
  concentration_unit = "mg/L"
)
plot_overlay(ayflux, osp)
```

If the PK-Sim/MoBi CSV has different headers, inspect it with `names(read.csv("osp_simulation_results.csv", check.names = FALSE))` or your selected delimiter; **the example column names are illustrative**. Set units explicitly. The helper refuses unrecognized units rather than silently interpreting them. In particular, `µmol/L` cannot be treated as `mg/L` without a molecular-weight conversion.

## PK-Sim and MoBi workflow

1. Run a simulation in PK-Sim or MoBi.
2. Export that simulation's **results**, not the full model, as CSV or Excel. See [OSP's import/export documentation](https://docs.open-systems-pharmacology.org/working-with-pk-sim/pk-sim-documentation/importing-exporting-project-data-models).
3. Export AyFlux results by choosing **R / OSP tidy** from the single **Export CSV…** dropdown.
4. In R, map the OSP time/concentration columns using `read_osp_curve()`. Specify the exported time and concentration units.
5. Compare time courses only after aligning dose, route, administration schedule, kidney function, dialysis settings, sampling compartment, and model assumptions.

The `ospsuite` R package can also **load and run genuine OSP `.pkml` models** and retrieve output values in R. See [OSPSuite-R](https://github.com/Open-Systems-Pharmacology/OSPSuite-R). AyFlux CSV can be compared to those R results after selecting an equivalent time/concentration series; it does not import into the underlying OSP model.

For desktop import, use the AyFlux XLSX workbook. In MoBi 12 Update 3 on Windows, the saved project retained all 385 no-dialysis plasma acyclovir concentrations over 96 hours, with absolute differences below 0.000002 mg/L from the worksheet. For a workbook containing a molecular-weight column, clear any automatic assignment of that column to Error.

## Validation checklist

- Confirm both values represent the same molecule and sampling compartment.
- Compare time axes in **hours**, not calendar timestamps or minutes.
- Check concentration units carefully: `mg/L` and `µg/mL` are numerically equivalent; `µmol/L` is not.
- Align dosing events and dialysis sessions; no-dialysis and dynamic-dialysis curves are distinct scenarios.
- Distinguish AyFlux's model ensemble **median** from OSP's single-run predicted trace.
- Do not infer clinical dosing, efficacy, or toxicity from agreement between two models.

For proposed schema changes or OSP import samples, open a GitHub issue using **synthetic or public data** and read [CONTRIBUTING.md](../CONTRIBUTING.md).


## Pediatric research CSV

The separate pediatric IV page exports `ayflux-pediatric-abdalla-iv.csv`. Each row includes model DOI, IV route, age (eligibility only), weight, selected and comparison indexed eGFR, mg/kg dose, interval and infusion hours, dose count, ensemble size, seed, time, typical concentration, 5th/50th/95th simulated percentiles, and comparison concentration. Concentrations are mg/L. This format does not replace the adult simulator export schema and cannot be imported as a native OSP model.

## OSP aciclovir import test

The browser regression uses the [OSPSuite-R SimResults.csv fixture](https://github.com/Open-Systems-Pharmacology/OSPSuite-R/blob/0618a72b8b26d8d1d3015488ff4311153f5093f1/inst/extdata/SimResults.csv), reproduced in `interop/fixtures/ospsuite_aciclovir.csv`. Select the peripheral venous plasma aciclovir output, minutes and µmol/L. The 491 samples span 0–24 h. At 1 minute, 3.254674 µmol/L corresponds to 0.732985 mg/L. This test checks file parsing, unit conversion and curve display.

## Shareable scenario links

*Copy shareable link* (Research tools → Save / load) encodes a scenario in the URL fragment: `https://ayflux.org/#s=<base64url JSON>`.

- Payload: `{"v":1,"c":{…settings that differ from defaults…},"p":"<selected scenario>","s":[…visible scenarios…],"a":"standard|accessible","u":"mg|umol"}`.
- Measured concentrations (`observations`) are never written to a link, and a link that contains them is rejected.
- On open, missing settings are filled from the current defaults and the result passes the same validation as a schema 2 JSON import. A link that fails validation changes nothing.
- The fragment is removed from the address bar as soon as the page reads it. Links are capped at 6,000 characters; larger scenarios should use the JSON file.
- Because defaults are filled in at open time, a link made today can produce different results after a release that changes a default. Use the JSON export when a scenario must be reproducible.

## Runnable nominal scenario scripts

From the main simulator's Export results menu, select Nominal Python (.py) or
Nominal R / mrgsolve (.R). The export describes the primary scenario, not all
counterfactual overlays. Both write `ayflux_nominal_systemic.csv` with time in
hours and plasma acyclovir/CMMG in mg/L. The parameter snapshot includes the
resolved Cockcroft–Gault weight choice, probenecid and scaling modifiers.

Python requires NumPy and SciPy. R requires mrgsolve plus a working C++ toolchain.
All dosing and HD/CRRT start/stop events become explicit solver boundaries; the
Python integration is split at those boundaries and the R event table includes
EVID=2 solver-reset records. The scripts support constant or piecewise-linear
CrCl, IV infusions, oral valacyclovir and mixed routes. They do not export measured
levels. Applied fitting blocks nominal export rather than silently discarding the
fit. Exchange-resolved PD is unsupported and raises a clear message.

These are nominal **systemic** curves. They do not reproduce the uncertainty
ensemble median, Bayesian reweighting, CSF lag proxies or PD mass accounting.
Use configuration JSON with the actual AyFlux engine for those features.
Agreement between implementations does not establish clinical validity.

Re-run the four numerical export scenarios with
`node scripts/check-scenario-scripts.cjs` (Python) or the same command with `--r`.
The cases cover off-grid HD events, overlapping infusions, oral/IV transitions,
changing CrCl, CRRT→HD, anuria and zero dosing. The comparison threshold is
0.005% normalized maximum systemic concentration error against a fine-grid engine
run; it is an implementation check, not a clinical acceptance limit.

## Printable teaching handout

Choose **Printable summary** from Export results. The renderer captures the current
primary scenario before loading the preview, so later updates cannot relabel an
older curve. The handout includes model version, capture time, patient/kidney
inputs, regimen and dialysis summary, selected non-default modifiers, five output
metrics and plasma acyclovir/CMMG curves. Parameter bands retain the configured
coverage; fitting is disclosed as a count, never as individual measurements.

The handout is a summary, not a complete model file. Custom dosing lists, CrCl knots
and dialysis schedules are abbreviated explicitly. Keep the configuration JSON and
CSV alongside it for reproducibility. End-window concentration is not labeled as a
steady-state trough. Numerical outputs, prior assumptions and clinical limitations
are unchanged. The local preview supports Print / save PDF; it transmits nothing.

The summary renderer and stylesheet load only when requested. Print styling is
scoped to an open preview, so closing it restores the application's normal print
behavior. Browser regression checks require a single PDF page for the default,
mobile, 200-dose/dynamic-kidney, PD and fitted-result summaries.
