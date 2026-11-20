# Boelaert patient 5 measured predose replay

Boelaert et al. Figure 2 (printed p. 74) shows plasma acyclovir measurements as squares and dialysate recovery as triangles. The four predose squares near 24, 48, 72 and 96 h are distinguishable from the fitted line. No separate square was identified near 120 h. The Table I values already used in the scorecard were derived by the original authors from their fitted model. [Primary source](https://doi.org/10.1093/jac/20.1.69)

At 145 dpi with Poppler, the full PDF page raster measured 951 × 1400 px. The plasma axis spans 0–30 µmol/L between y = 1188 and 799. The runner stores the four marker centers, measured from the top left. The ±0.5 µmol/L reading allowance is a sensitivity range for picking marker centers on this scan and has no probabilistic interpretation. The source reports pre-infusion collection. Nominal times come from that protocol and the plot ticks, with no attempt to recover individual collection clocks from pixel offsets.

The replay uses the patient 5 configuration and solver from revision `8fc1c9d`, the nominal anuric assumption and the reported 4/4/4/12-hour dwell schedule. Zero residual creatinine clearance is an assumption. Sensitivity checks place each draw 0, 7.5, 15 or 30 minutes before its infusion and use residual CrCl 0, 2 or 5 mL/min. Exchange timing stays at the reported nominal schedule. The combined range includes the full marker-reading allowance.

| Nominal hour | Figure 2 (µmol/L) | Nominal AyFlux (mg/L) | Predicted / digitized | Range across timing, CrCl and reading assumptions |
|---:|---:|---:|---:|---:|
| 24 | 3.2 | 1.22 | 1.70 | 0.87–2.05 |
| 48 | 3.2 | 1.67 | 2.31 | 1.07–2.79 |
| 72 | 3.0 | 1.83 | 2.70 | 1.18–3.30 |
| 96 | 3.3 | 1.88 | 2.54 | 1.09–3.04 |

With CrCl fixed at zero, moving a draw up to 30 minutes earlier changes the simulated concentration by at most 0.035 mg/L. Under the combined sensitivity, the later predictions remain above the digitized values, but the fold error is sensitive to the assumed CrCl. This is a fixed-parameter replay of measured points from one patient already represented through the fitted endpoints. No measurement enters a fit in this replay.

## Reproduce

From a clone with revision `8fc1c9d` available locally:

```sh
frozen_assets=$(mktemp -d)
git show 8fc1c9d:public/assets/pk-engine.js > "$frozen_assets/pk-engine.js"
git show 8fc1c9d:public/assets/study-library.js > "$frozen_assets/study-library.js"
node research/validation/boelaert-measured-predose.cjs "$frozen_assets"
```

The runner checks both input blob hashes and repeats the calculation with the solver step halved. The article PDF is required only to verify digitization.
