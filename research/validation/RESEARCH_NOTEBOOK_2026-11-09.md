# AyFlux research notebook: external CAPD and CNS/CMMG model assessment

**Date:** 2026-11-09  
**Software basis:** AyFlux v0.26.0, frozen `public/assets/pk-engine.js`  
**Status:** Independent research experiments; not peer reviewed, not externally clinically validated. **No manuscript or production code changes in this workstream.**

The goal is to identify what the current model can reproduce, which assumptions matter, and where further empirical evidence is necessary. Numerical solver consistency is necessary but not sufficient for physiological accuracy.

## 1. External CAPD evidence checks

We added **two independent source datasets** not used for model fitting in the research scripts. Both retain study-level rather than invented individual observations.

| Study / original evidence | AyFlux exploratory reproduction | Interpretation |
|---|---|---|
| [Shah et al. 1986](https://doi.org/10.1016/S0272-6386(86)80193-7): one 75-year-old, 55-kg CAPD patient, 5 mg/kg on day 1, 2.5 mg/kg days 2–7; observed average CAPD clearance **4.4 mL/min** | Exact seven-day IV dose events, *illustrative* 6/6/12-hour 2-L exchanges. Apparent model CAPD clearance across uniform dextrose simulations and CrCl=0/5 mL/min: **3.09–3.48 mL/min** | Undershoots the study's average clearance, but prescriptions and effluent volumes are not matched |
| Shah: measured dialysate recovery **5.7%, 10.8%, 11.0%** of daily dose on days 1, 4, 7 | With 1.5% dextrose and CrCl=0, modeled values are **7.20%, 11.57%, 11.44%** of that day's administered dose | Similar magnitude, **not a direct patient-matched validation**: each day's collected drug includes drug from earlier doses |
| [Burgess & Gill 1990](https://doi.org/10.1002/j.1552-4604.1990.tb03585.x): four IV-treated CAPD patients, average peritoneal clearance **3.4 ± 0.2 mL/min** | With four nominal six-hour, 1.5-L, 1.5%-dextrose dwells, group-average assumed 68.3 kg and CrCl=0 or 5, apparent modeled clearance **2.88–2.92 mL/min** | Some underprediction, plus unmatched demographics and residual renal function |
| Burgess: mean IV elimination half-life **13.2 ± 4.7 h** | Unmodified fixed-model *no-PD* terminal eigenvalue is 20.34 h at CrCl=0 or 13.21 h at an assumed CrCl=5 | This is a **mechanistic sensitivity**, not identification of the actual patients' CrCl nor the measured on-PD half-life |

**Important methodological improvement:** The CAPD model has a membrane permeability/PS-style input, `pdCl`, that is **not directly a measured peritoneal drug clearance**. The new scripts calculate **apparent clearance from actual modeled drug drained divided by plasma concentration AUC** over matched windows:

`CL_PD,apparent (mL/min) = [drained mass (mg) / plasma AUC (mg·h/L)] × (1000/60)`.

This permits an interpretable comparison with observed peritoneal drug clearance but cannot substitute for actual collected effluent drug amounts.

The external checks use a frozen model with no drug-parameter estimation and no study-specific minimization. Their limitations are particularly strong for Shah: the source's dextrose concentrations, effluent volumes and exchange timing differ by study day, while our sensitivity runs assign the same dextrose to all exchanges. Serum albumin, residual renal function and detailed individual dialysis fluid measurements are not known.

See `external-capd-holdouts.cjs` and the archived output in the `AyFlux mechanism hypothesis experiments` workflow.

### Boelaert 1987 mechanism assessment (prior work)

[Boelaert et al., 1987](https://doi.org/10.1093/jac/20.1.69) provide the more detailed source-fitted distribution and dialysate parameters. The full-engine v0.26 benchmark produced:

| Subject | Published dialysate recovery (%) | AyFlux 5-day drained (%) | Published source-fitted day-five plasma trough (mg/L) | AyFlux (mg/L) |
|---|---:|---:|---:|---:|
| 1 | 10.6 | 12.90 | 1.42 | 1.74 |
| 4 | 13.6 | 10.85 | 0.68 | 2.00 |
| 5 | 12.3 | 12.61 | 0.65 | 1.91 |

Matching each patient's **author-fitted** nonperitoneal `K10 × V1` to the model reduces predicted troughs but substantially worsens modeled dialysis recovery in subjects 4 and 5. This demonstrates a **joint-constraint tradeoff**, not a final calibrated solution. The authors' fitted outputs are in-sample estimates, not raw independently held-out measurements.

**Research decision:** Jointly evaluate plasma acyclovir, dialysate recovery and effluent solute clearance; do not optimize troughs alone or declare the model validated when total recovered mass happens to match.

## 2. Normal-versus-CKD CMMG model consistency

[Smith et al., 2010](https://doi.org/10.1128/AAC.00729-09) measured plasma and CSF acyclovir/CMMG after five high-dose valacyclovir administrations. Their measured CMMG **CSF/plasma AUC ratio is approximately 0.025** in both groups. AyFlux v0.26.0 uses the **exploratory** default `csfMetRatio: 0.25` (roughly 10-fold higher).

The latest research check uses CKD subjects' **reported CrCl values 17, 30, 31 mL/min** and averages *nominal model simulations*, rather than using a single assumed CrCl=20. Weight is nevertheless fixed at an *unknown-to-cohort* 70 kg, oral bioavailability is an extrapolative constant at doses >1 g, and the normal cohort uses an illustrative CrCl=100.

| Smith AUC endpoint (mg·h/L) | Source mean normal | AyFlux normal, default partition | Source mean CKD | AyFlux CKD, default partition |
|---|---:|---:|---:|---:|
| Plasma acyclovir | 30.85 | 34.43 | 129.95 | 84.53 |
| CSF acyclovir | 8.33 | 10.30 | 35.81 | 25.33 |
| Plasma CMMG | 4.07 | 4.79 | 35.40 | 47.20 |
| CSF CMMG | 0.1005 | **1.171** | 0.909 | **11.620** |

Research-only change `csfMetRatio: 0.025` reduces the nominal CSF CMMG predictions to **0.117** (normal) and **1.162 mg·h/L** (CKD), without altering plasma parent or metabolite exposure.

- The default coefficient has the wrong order of magnitude for the Smith cohorts.
- Simply decreasing CSF entry does **not** resolve the CKD plasma acyclovir underprediction or CMMG overprediction.
- A 16-setting grid varied CMMG formation (`formFactor`) and renal metabolite clearance (`metRenal`) with partition fixed to 0.025. The settings ranked best on **normal** and **CKD** group AUCs differed; even the pooled best-ranked candidate remains **in-sample** and is not a validated universal parameter set.
- Use these grids to diagnose **parameter non-identifiability**, not to choose clinical defaults.

### Structural code audit: what the current CSF outputs mean

`single()` evolves central drug, peripheral drug, circulating CMMG, oral depot and dialysate drug amount using a differential-equation integrator. **CSF acyclovir and CSF CMMG are auxiliary delayed-output filters**, updated after each timestep approximately as:

`C_CSF,new = C_CSF,old + Δt (K · C_plasma,avg − C_CSF,old)/τ`.

Their concentrations are **not coupled to a finite CNS mass compartment**, an explicit blood–CSF permeability surface, transporter saturation or a physiological CNS efflux route. Consequently a user-selected `csfMetRatio` is not a validated blood–brain-barrier permeability parameter.

Another modeling limitation: CMMG clearance during PD is currently approximated by a clearance term active during PD and **does not have its own exchange-level dialysate CMMG state or measured dialysate CMMG mass balance**. The mass accounting tests focus on acyclovir-equivalent mass rather than an independently verified CMMG clearance/CSF mass-balance model. A model discrepancy should not be hidden by displaying deceptively precise CNS toxicity indicators.

## 3. Observational CSF albumin quotient audit

[Lindström et al., 2019](https://doi.org/10.1093/jac/dkz357) report 34 CSF samples from 21 patients with treated CNS infection and observational associations between CSF acyclovir/CMMG and the CSF:serum albumin quotient (QAlb), an indirect marker of barrier dysfunction.

We manually transcribed **one earliest available QAlb record per patient** from their Table 1 (21 distinct patients; patient 1 contributes row 1b because 1a lacks QAlb). Ten CSF CMMG values are reported below the assay limit (<0.15 µmol/L) and are retained as *censored*, not fabricated measurements. Sensitivity scenarios use half-limit, upper-limit and detected-only subsets.

| Descriptive association | Spearman rho | N |
|---|---:|---:|
| QAlb versus CSF CMMG, half-limit for censored | **0.553** | 21 |
| QAlb versus CSF CMMG, excluding high-QAlb subject 19 | **0.478** | 20 |
| QAlb versus CSF CMMG, detected samples only | **0.656** | 11 |
| QAlb versus CSF CMMG, detected only, omitting subject 19 | **0.541** | 10 |

These rank correlations are **descriptive only**, not the authors' adjusted multivariable regression and not a causal estimate. Exclusion of patient 19 is an influence check, not a claim their observation is erroneous. The original study includes repeated observations and serious confounding from plasma concentrations, infection, medications, timing and kidney function; this reduced audit deliberately avoids pseudoreplication and **does not generate inferential p values**.

**Research decision:** A future optional *barrier-sensitivity hypothesis* may be reasonable, but the study's QAlb regression coefficient is not a transport-rate multiplier. CSF ≠ cerebral extracellular/interstitial fluid; clinical toxicity cannot be predicted from CSF CMMG alone.

## 4. Evidence tiers and manuscript readiness

1. **Software verification:** event ordering, mass accounting (acyclovir only), time-step convergence and reproducibility. Currently exercised in CI.
2. **Within-study descriptive agreement:** comparison against published fitted curves and summaries. Useful, but not held-out prediction validation.
3. **Independent empirical agreement:** Shah/Burgess drug-clearance summaries and reproducible source regimens, still approximate because patient-level inputs missing.
4. **Clinical validation:** representative patients, independent measured serial concentrations, prospective or external cohorts, prespecified errors and clinical review. **Not achieved.**

### What to do before drafting the paper again

- Obtain raw serial plasma and effluent measurements and exact exchange-specific outputs where possible; preserve digitization uncertainty if using figures.
- Freeze a parameter/provenance table with unit conversion and input source for each parameter; distinguish assumed vs measured vs author-fitted.
- Confirm cross-platform parity (mrgsolve / ospsuite) under matched schedules without implying physiological truth from software agreement.
- Delineate measurable CSF exposure from mechanistic barrier transport and separate CMMG systemic kinetics before introducing complex CNS physiology.
- Keep neurotoxicity associations descriptive rather than clinical-alert thresholds.

## Reproduce

```bash
node --test tests/external-capd-research.test.cjs
node research/validation/boelaert-capd.cjs
node research/validation/external-capd-holdouts.cjs
node research/validation/mechanism-sensitivity.cjs
node research/validation/smith-renal-cohort-stress.cjs
node research/validation/lindstrom-albumin-audit.cjs
```

All above run against **the actual unchanged AyFlux v0.26.0 JS model** and need Node.js only. The GitHub Actions workflow uploads results files as artifacts. This is research work on a **draft PR**, not an app release or a journal submission.

Related: [Full-engine Boelaert v0.26.0 results](RESULTS.md) · [Mechanism analysis](CAPD_CMMG_MECHANISM_REVIEW.md) · [Parameter provenance](PARAMETER_PROVENANCE_AUDIT.md) · [Source audit CSV](data/lindstrom2019-first-eligible-observation.csv)
