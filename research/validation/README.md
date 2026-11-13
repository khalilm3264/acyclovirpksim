# AyFlux v0.26.0 — source-anchored CAPD research benchmark

**This is a scientific verification experiment, not clinical dose guidance and not patient-level clinical validation.**

## Provenance

Boelaert et al. *Multiple dose pharmacokinetics of intravenous acyclovir in patients on continuous ambulatory peritoneal dialysis.* J Antimicrob Chemother. 1987;20:69–76. DOI: [10.1093/jac/20.1.69](https://doi.org/10.1093/jac/20.1.69).

- Published Tables I–II supply six patient doses, weights, *author-fitted* day-one and day-five peak/troughs, and observed dialysate acyclovir recovery.
- We prespecify patients **1, 4, and 5** because the paper does not report urinary recovery for them. We use illustrative CrCl=0; lack of measured urinary recovery is not proof of absolutely no residual filtration.
- Actual IV dose is patient-specific (110, 142, 122 mg respectively), one-hour infusion at 0, 24, 48, 72 and 96 h.
- Published prescription: four 2 L, 1.36% dextrose CAPD exchanges daily at dwell offsets 0–4, 4–8, 8–12, and 12–24 hours.
- Actual patient-specific dialysate volumes, membrane transport traits, serum albumin, residual filtration, and all raw serial plasma observations are not available here. Keep nominal model defaults documented, not fitted to the source.
- We do **not** simulate Burgess & Gill's intraperitoneal dosing; AyFlux does not implement it.

## Run the *actual* AyFlux engine

```bash
node research/validation/boelaert-capd.cjs research/validation/results
node --test tests/capd-publication.test.cjs
```

The script calls the same `public/assets/pk-engine.js` functions the website uses—`validate`, `scheduleFor`, `drawParams` and `single`—with `trackMassBalance: true`. It does not reconstruct an approximate surrogate. It writes a JSON and compact CSV, both suitable for review, and prints the JSON for transparent CI logs.

## Endpoints and ablations

1. Compare 1 h / 24 h and 97 h / 120 h plasma predictions to **author-fitted** source values (convert micromol/L to mg/L at 0.22521 mg/L per micromol/L). Do not report these as measured independent observations.
2. Compare true modeled **drained effluent mass** accumulated over five days, divided by the actual administered dose, to published dialysate recovery. Report day-five drug recovery separately.
3. Explicitly disable PD to measure mechanistic sensitivity (not model accuracy).
4. Replace unequal 4/4/4/12-h exchanges with uniform 6/6/6/6-h timing as a *timing sensitivity*, not an independent physiological model.
5. Vary the exploratory membrane-transport coefficient over 0.7, 1, and 1.3.
6. Re-run at 0.125 h to check the default 0.25-h integration grid.

Outputs are exploratory and should not be interpreted as independently validated patient PK. Software-model agreement, fitted-reference concordance, and patient-level predictive validation are separate evidence categories.

## Scientific cautions

- The source's group-average 12.1% ± 2.1% daily recovery was calculated from actual collected dialysate, but AyFlux uses illustrative membrane and ultrafiltration assumptions. Agreement may be coincidental.
- The PD model approximates membrane transport; it is not parameterized from this study's patient-specific exchange measurements.
- The low CMMG CSF partition discrepancy highlighted by Smith et al. (2010) remains unresolved and is **not silently modified**.
- No UI or simulation defaults are changed in this release. The saved JSON configuration schema stays version 2.

## Cross-study comparison

Run `node research/validation/compare-benchmarks.cjs` to reproduce the [benchmark comparison](COMPARISON-RESULTS.md). It selects clearance and central-volume multipliers against two parent acyclovir samples, then applies them to serum, CSF, CMMG, urinary recovery and dialysis recovery endpoints in the other studies.

## CRRT clearance

[Collignon CRRT comparison](COLLIGNON-CRRT.md) evaluates the extracorporeal clearance calculation against blood- and effluent-based estimates.

## Oral valacyclovir and hemodialysis

[Hara 2008](HARA-HD.md) compares the model with acyclovir and CMMG endpoints after oral valacyclovir. Run `node research/validation/hara-hd.cjs`.

## Obesity and renal-function estimation

[Smith 2016](SMITH2016-OBESITY.md) separates CrCl estimation from PK weight scaling in one obese patient with measured renal impairment. Run `node research/validation/smith2016-obesity.cjs`; source-derived endpoints and unknown infusion duration are explicitly identified. This is a diagnostic sensitivity comparison, not a blinded validation or an obesity correction. It changes no model defaults or pooled scorecard statistics.
