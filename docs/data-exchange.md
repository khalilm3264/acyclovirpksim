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

**Not supported:** writing or importing native `.pkml`, `.pksim5`, or `.mbp3` models; replacing PBPK structures; assuming direct compatibility with `ospsuite::importResultsFromCSV()` (which expects its own results format). Direct CSV import into a PK-Sim/MoBi data repository may require column mapping or conversion and has **not** been verified for this exact AyFlux schema.

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
