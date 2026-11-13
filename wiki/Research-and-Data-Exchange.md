# Research and data exchange

AyFlux exchanges **simulation results**, not native PK-Sim or MoBi models. Keep exported predictions labeled as simulated data.

## Choose an export

| Format | Use | What else to retain |
| --- | --- | --- |
| Detailed CSV | Time-series analysis including entered CrCl | Configuration JSON and version |
| R / OSP tidy CSV | Plotting and grouped analysis by scenario/analyte/statistic | Configuration JSON; this concentration schema does not include a separate renal trajectory |
| PK-Sim / MoBi XLSX | Importing simulated comparison curves into OSP data tools | Route, compartment, molecule, and unit mapping |
| Configuration JSON | Recreating inputs in AyFlux | Corresponding results and application version |
| Printable report | Sharing a readable summary and figures | Underlying numeric results and configuration |
| Explorer grid CSV | Analyzing a parameter sweep | Baseline settings, axis ranges, and selected output |

Use **Export results** above the charts for available result formats. Run and finish the intended simulation before exporting.

## Tidy CSV columns

| Column | Meaning |
| --- | --- |
| `time_hours` | Elapsed simulation time |
| `scenario` | Dialysis scenario |
| `analyte` | Plasma/CSF acyclovir or plasma/CSF CMMG |
| `statistic` | `median`, `lower`, or `upper` |
| `concentration_mg_L` | Predicted concentration |
| `central_interval_coverage` | Requested interval coverage, when supplied |

The [schema and R guide](https://github.com/khalilm3264/acyclovirpksim/blob/main/docs/data-exchange.md) provides details and a base-R example. The helper script is [interop/ayflux_compare.R](https://github.com/khalilm3264/acyclovirpksim/blob/main/interop/ayflux_compare.R).

## Compare an external curve in AyFlux

1. Run an AyFlux simulation.
2. Open **Research tools → Compare an external PK-Sim / MoBi CSV**.
3. Choose a CSV up to 4 MB. For an XLSX input, first save the relevant worksheet as CSV in your spreadsheet application.
4. Select time and concentration columns, their units, and the target analyte.
5. Choose **Compare curves** and inspect the overlay, differences, and reported errors.

Imported CSV data are processed locally in the browser. Match dose, route, timing, kidney assumptions, molecule, total versus unbound concentration, and compartment before interpreting differences. An error metric cannot correct an unmatched scenario.

## Export to PK-Sim or MoBi

Choose **PK-Sim / MoBi (.xlsx)**. The workbook contains time and median concentration sheets for scenario/analyte combinations with unit and simulated-data labels. In OSP's data-import interface, map the appropriate columns and confirm metadata. Its **Add Observed Data** terminology does not turn these predictions into observations.

Map the workbook's **Molecular Weight [g/mol]** field when required. The export supplies molecule-specific values. Uncertainty bounds are omitted because model intervals are not measurement standard deviations.

AyFlux does not export runnable `.pkml` simulation models, `.pksim5` projects, or `.mbp3` projects. See the [interoperability guide](https://ayflux.org/learn/interoperability/) for the full workflow and OSP documentation links.

## Independent calculation and reporting

The repository includes separate **mrgsolve** equation-parity and **OSPSuite-R** comparison scripts. Their scope and prerequisites are documented in [research-model-comparison.md](https://github.com/khalilm3264/acyclovirpksim/blob/main/docs/research-model-comparison.md). Equation parity, cross-model agreement, and validation against independent empirical measurements are different checks.

The research report opens a print-ready window. Use your browser's **Save as PDF** option and review pagination and scenario labels before sharing it.

[Home](Home) · [Model and uncertainty](Model-and-Uncertainty)
