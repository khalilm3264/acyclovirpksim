# AyFlux manuscript development package

This directory contains a **research-planning experiment**, not a clinically validated dosing model or final manuscript.

## Reproduce the experiment

From the repo root, with Node.js installed:

```bash
node research/ayflux-paper/run_study.cjs
```

The script uses the **existing production engine** `public/assets/pk-engine.js` with `draws=1`, `variability=0`, 0.25-hour event-aware integration, and named fixed assumptions. No Node dependencies are needed. It overwrites these four CSVs:

- `results/case1_hd.csv`: Laskin et al. 1982 anuric HD source mean ± SD versus nominal model
- `results/case2_capd.csv`: Boelaert et al. 1987 repeated-dose CAPD group means versus nominal model
- `results/ablations.csv`: four component-removal experiments and baseline
- `results/curves.csv`: exported deterministic HD and CAPD model concentrations

**Engine code snapshot reviewed:** GitHub blob SHA `cb07505a2b9e619ee3351bb0bf66d5610a611a6f` (non-kidney CMMG clearance 0.5 L/h, #46). The study was rerun for that change: only the CMMG columns of `ablations.csv` and `curves.csv` moved (full-model CMMG peak 3.82 → 3.03 mg/L); every plasma value quoted in the manuscript is unchanged. If the engine changes again, rerun the study and update the manuscript.

## Read next

- [Manuscript draft](manuscript_draft.md)
- [Journal targets and constraints](journal_targets.md)
- [Original independent-model-comparison documentation](../../docs/research-model-comparison.md)

## Source evidence and limitations

**Case 1.** [Laskin et al., 1982](https://doi.org/10.1038/clpt.1982.83): six anuric subjects; 2.5 mg/kg, one-hour IV infusion, six-hour HD approximately two days later. Nominal weight is an invented 70-kg surrogate because individual covariates are not available in the abstract. The model default HD clearance (81.8 mL/min) was anchored to this paper; therefore this is NOT an independent HD clearance validation. The 48 and 54-hour observation timestamps are approximate.

**Case 2.** [Boelaert et al., 1987](https://doi.org/10.1093/jac/20.1.69): six CAPD patients with mean weight 60 kg, five once-daily IV 2.5 mg/kg doses. Published peaks and troughs are aggregated; exact individual sampling times are unknown. The study's three-compartment fit differs from AyFlux's parent-drug model. Modeled CAPD troughs exceed reported means.

The data represent **historical group-level aggregate means**, not patient-level concentration-time records. The case studies are useful to detect model discrepancies, but do not provide a generalizable predictive accuracy estimate. They cannot test uncertainty-interval coverage. Structural ablations do not prove the full model is more accurate.

## Modeling classification

AyFlux is a **mechanistic compartmental PK / ODE simulator** using an event-aware RK4 solver. The optional Monte Carlo lognormal parameter draws are not trained ML. Its likelihood-based reweighting is an exploratory discrete particle/importance weighting procedure, **not a population PK posterior estimated from clinical data**. The coarse grid search of clearance and volume scales is numerical parameter optimization, not evidence of supervised machine learning. CSF outputs are lagged ratio proxies, not fitted CSF mass-balance compartments. The PD transfer mechanism is illustrative and not a validated three-pore peritoneal model.

**Independent comparisons not completed by this script:** run `interop/compare_mrgsolve.R` for equation/solver parity; carefully match a genuine PK-Sim/MoBi model for a scientifically meaningful PBPK comparison. No mrgsolve/OSPSuite runs are claimed here.

## Checklist before publication

- [ ] Add frozen version/tag and DOI, archived source and exact dependency versions
- [ ] Audit model units, calibration sources, parameter provenance, mass balance and numerical convergence
- [ ] Resolve CMMG CSF partition discrepancy with observed literature
- [ ] Match clinical dialysis settings and exact subject covariates; obtain ethically usable individual PK data if possible
- [ ] Separate model calibration and external validation datasets; avoid data leakage
- [ ] Run and report mrgsolve solver parity and *matched* OSPSuite benchmark with full assumptions
- [ ] Add sensitivity analyses with plausible parameter ranges and holdout predictive checks
- [ ] Consult pharmacometrician and nephrologist; assess whether any renal recommendation is justified
- [ ] Decide article type, author contributions, data availability, ethics and AI disclosure
- [ ] Re-render publication-quality figures with scripts and exact source versions
