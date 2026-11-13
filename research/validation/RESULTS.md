# AyFlux 0.26.0: canonical CAPD engine research results

**Status:** Reproducible implementation checks and source-anchored exploratory comparisons, **not clinical validation**. Published plasma troughs are author-fitted values, not independent individual measurements. The published dialysate percentage represents daily recovered dose; AyFlux percent below is cumulative drained mass across five days divided by five administered doses.

## Study and method

- Boelaert et al. (1987), *J Antimicrob Chemother* 20:69-76. https://doi.org/10.1093/jac/20.1.69
- Subjects 1, 4, 5 were prespecified with no reported urinary recovery; manual CrCl=0 is an **assumption**, not a measured CrCl.
- Patient-specific weights/doses (kg; mg): 1 (46.5;110), 4 (59;142), 5 (48;122).
- Five IV one-hour infusions at 0, 24, 48, 72 and 96 h; 120-h horizon.
- Exchange-specific CAPD per day: 2 L, 1.36% dextrose, dwell lengths **4/4/4/12 hours**.
- Engine: `public/assets/pk-engine.js`, deterministic, no fitting, one draw, event-aware RK4 at 0.25 h with 0.125 h convergence repeat.
- Reproduce: `node research/validation/boelaert-capd.cjs`; `node --test tests/capd-publication.test.cjs`.
- Canonical source-derived numerical output: [v0.26.0 JSON](boelaert-v026-reference-results.json). CI: [CAPD workflow](../../.github/workflows/capd-research.yml).

## Numerical summary

| Subject | Published mean daily dialysate recovery (% dose) | AyFlux five-day drained mass (% cumulative dose) | Published fitted day-five trough (mg/L) | AyFlux day-five trough (mg/L) |
|---|---:|---:|---:|---:|
| 1 | 10.6 | 12.90 | 1.42 | 1.74 |
| 4 | 13.6 | 10.85 | 0.68 | 2.00 |
| 5 | 12.3 | 12.61 | 0.65 | 1.91 |

The correspondence in dialysate recovery is only descriptive. Plasma trough predictions are markedly higher than author-fitted values for subjects 4 and 5.

### Five-day AUC and ablations

| Subject | With source-matched PD (mg h/L) | No PD (mg h/L) | Four equal six-hour dwells (mg h/L) |
|---|---:|---:|---:|
| 1 | 332.05 | 377.66 | 332.56 |
| 4 | 361.74 | 402.36 | 362.05 |
| 5 | 360.13 | 408.29 | 360.65 |

AUC is **integrated over all 120 hours**. The timing ablation changes dosing-relative exchange boundaries; similarity in five-day AUC does not imply identical detailed concentration or dialysate profiles. Transport multiplier variations (0.7/1.3) changed the five-day model AUC but did not establish transport parameter accuracy.

Every dedicated CAPD mass-accounting test passed, including comparison against disabled PD, nonnegative state amounts, and 0.125-h time-step convergence. The maximum mass-accounting residual is rounded to zero at 4 decimal places in the archived summary; it is not a guarantee of exact analytical conservation.

## Research limitations

1. No serial raw subject-level plasma concentrations were independently extracted from the paper.
2. Individual effluent volumes, actual residual renal function, and membrane properties were not available for matching.
3. The PD mass-transfer parameters were not estimated from held-out measurements; the model could achieve similar dialysate recovery for incorrect mechanistic reasons.
4. Source and simulated dialysate-recovery percentages use related but differently aggregated periods.
5. External predictive validity, CNS CMMG distribution, and matched alternative-model comparisons remain unverified.
6. **No change** to default clinical model equations, parameters, safety thresholds, or schema 2 was made for this release.

## Next independent checks

Use Shah (1986) and Burgess & Gill (1990) IV protocols with the current frozen model before any retuning. Do not simulate Burgess & Gill's intraperitoneal administration because AyFlux does not implement it. Acquire observed concentration-time points and actual exchanged effluent mass/volume data if available, and preregister an external error metric before model recalibration. Review with domain experts before submission to any clinical or pharmacometrics journal.
