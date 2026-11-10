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

The browser check exercises desktop/mobile layout, curve rendering, zero dose, CSV export, and invalid inputs. Run `node scripts/check-pediatric.cjs` with Playwright and Chromium installed. Local browser launch in the implementation environment was blocked by an OS socket restriction; CI runs the browser check.

## Next research steps

1. Resolve normalization and random-effect conventions against original model code or author clarification.
2. Obtain authorized deidentified data or a complete published simulation specification before attempting population-level replication.
3. Assess an independently sourced neonatal model separately.
4. Review pediatric extracorporeal-clearance evidence before designing a dialysis extension.
