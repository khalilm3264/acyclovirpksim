# Pediatric IV research module

This module implements the IV portion of Abdalla et al. (2020), DOI [10.1128/AAC.01426-20](https://doi.org/10.1128/AAC.01426-20), as an isolated research interface. It leaves the adult engine unchanged.

## Implementation decisions

- Follow the explicit final Table 2 equations, including 15 kg normalization; the Methods text also mentions 15.6 kg. This discrepancy is not silently averaged.
- Keep indexed study-defined eGFR separate from the adult engine's absolute Cockcroft–Gault input.
- Use analytical superposition of finite IV infusions. All inputs, outputs, and CSV fields have explicit units.
- Restrict weight and eGFR to reported observed ranges. Age 1–18 years is an interface restriction to avoid presenting this as a neonatal maturation model. Age is not a fitted covariate in this implementation.
- Treat reported IIV values as log-scale SDs, with independent clearance and volume effects. Covariance is unavailable. The shaded 5th–95th percentile range is conditional between-person variability, excluding residual error and uncertainty in fitted parameters. It is not a fitted posterior or confidence band.
- Do not infer dialysis, severe renal impairment, CMMG, or CSF behavior. Oral reproduction remains separate because dose conventions and formulation assumptions require review.

## Verification

Run `node --test tests/pediatric-model.test.cjs` and `node research/pediatric/benchmark.cjs`.

Checks cover published reference parameters, independent RK4 amount-state integration at three covariate combinations, dose-boundary continuity, zero-dose behavior, dose linearity, mass-balance AUC, steady-state agreement, input bounds, and seeded ensemble reproducibility. Numerical agreement verifies implementation; it is not clinical validation.

The benchmark emits illustrative concentration fixtures and steady-state summaries. These are generated model outputs, not patient observations or digitized published curves. The paper's Figure 5 target-attainment percentages and Figure 4 predictive check have **not** been reproduced: individual observations and the exact simulated covariate distribution were not available. No claim of matching these figures is made.

The browser check exercises desktop/mobile layout, curve rendering, zero dose, CSV export, and invalid inputs. Run `node scripts/check-pediatric.cjs` with Playwright and Chromium installed. The production workflow runs this browser check.

## Next research steps

1. Resolve normalization and random-effect conventions against original model code or author clarification.
2. Obtain authorized deidentified data or a complete published simulation specification before attempting population-level replication.
3. Compare the neonatal plasma estimates with an independently enrolled cohort with documented sampling times and renal function. The [fixed-effect reconstruction](evidence-review.md#neonatal-plasma-models-from-the-same-two-trials) compares two analyses of the same trials.
4. Review pediatric extracorporeal-clearance evidence before designing a dialysis extension.

## Cross-model evidence review

See [evidence-review.md](evidence-review.md) for the supplied-paper audit and [model-comparison.json](model-comparison.json) for nine deterministic Abdalla/Zeng comparisons. Regenerate with `node research/pediatric/compare.cjs`.

## Englund 1991 neonatal replay

Run `node research/pediatric/englund-neonatal-replay.cjs` from the repository root. The JSON output compares the existing experimental neonatal PMA model with measured serum acyclovir from patients 3 and 11 of [Englund et al., J Pediatr 1991;119:129–135](https://doi.org/10.1016/S0022-3476(05)81053-4). The [Table I extraction](englund-1991-table-i.csv) preserves all 16 infants and 34 representative measured values (µmol/L), separately from the authors’ fitted PK columns. It does not contain the 46 individual samples used for fitting or their exact timestamps. The table’s printed sample counts do not reconcile with the Results totals and are retained as reported, not used for scoring. The [1987 blood-exchange case](https://pubmed.ncbi.nlm.nih.gov/3794878/) is included in the 1991 cohort; do not count it again.

The two selected infants were born at 38 weeks and both began IV dosing every 12 hours on day 1, without exchange transfusion. The computation uses the [Sampson 2014](https://pubmed.ncbi.nlm.nih.gov/24346595/) typical PMA-only clearance and 2.8 L/kg volume, not the authors’ fitted estimates. No patient weight is imputed: weight cancels in this parameterization. The renal-function covariate model (D’Agate) is not scored because required patient size and individual renal clearance are not available from Table I. Serum creatinine is retained as source context, not converted to an assumed neonatal clearance.

The replay assumes a one-hour infusion, an unchanged reported regimen, and the study’s usual collection slots (1.25 h, 4 h and immediately before the next dose, measured from infusion start). Day-of-life 1 is taken as zero elapsed days for PMA. The nominal interval starts at the reported day offset from treatment start. One fewer or one additional dose illustrates sensitivity to dose-count ambiguity; these alternatives are not uncertainty bounds or actual dosing records. Representative samples need not come from a single verified dosing interval. Serum is compared with predicted plasma without additional matrix adjustment.

| Patient | Slot | Measured serum (µmol/L) | Predicted plasma (µmol/L) |
|---|---|---:|---:|
| 3 | Early | 42 | 13.47 |
| 3 | Mid | 28 | 7.72 |
| 3 | Trough | 6.2 | 1.53 |
| 11 | Mid | 93 | 8.67 |
| 11 | Trough | 52 | 1.75 |

In this exploratory comparison, the PMA-only model underpredicts all five reported values. The measured patient 11-to-3 trough ratio is **8.39** versus **1.14** predicted. Similar PMA and a small dose difference produce similar model predictions even though the infants’ observed troughs and creatinine differ substantially. The comparison does not isolate a causal creatinine effect, establish prospective clinical validity, or recommend doses. No production model or default was changed.
