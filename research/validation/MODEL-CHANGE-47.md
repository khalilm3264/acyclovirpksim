# Model change for #47: CSF CMMG partition 0.25 → 0.025

**What changed.** `DEFAULTS.csfMetRatio` in `public/assets/pk-engine.js` goes from 0.25 to 0.025. It only affects the CSF CMMG output. Plasma acyclovir, plasma CMMG and CSF acyclovir are unchanged, because the CSF proxy does not feed back. The user can still set any value from 0.01 to 1 under Advanced settings, and saved configurations keep the value they were saved with.

**Calibration source:** Smith 2010, CSF:plasma CMMG AUC ratio about 0.025 in healthy volunteers and in chronic kidney disease (#47). **Independent check:** Lindström 2019 ([4]; `LINDSTROM-CSF.md`), 34 paired samples, each reconstructed at its weight, dose, CrCl and sampling time.

## Before and after

| Benchmark | Endpoint | Observed | 0.25 (before) | 0.025 (after) |
|---|---|---:|---:|---:|
| Smith 2010, normal kidney function (calibration source) | CSF CMMG AUC, dose 5, mg·h/L | 0.100 | 0.945 (9.4×) | 0.094 (0.94×) |
| Smith 2010, kidney impairment (calibration source) | same | 0.909 | 9.44 (10.4×) | 0.944 (1.04×) |
| Lindström 2019, intact barrier (independent) | CSF CMMG GMR, 3 measured | — | 5.85 | 0.58 |
| | within twofold / below-limit consistent | — | 0/3, 0/7 | 3/3, 7/7 |
| Lindström 2019, disrupted barrier | CSF CMMG GMR, 17 measured | — | 2.21 | 0.22 |

Every script in `research/validation/` and `research/ayflux-paper/run_study.cjs` was run with Node 24 on `main` at f049227 (before) and on this branch (after). No benchmark output changes except the configuration echo in `hara-hd-results.json` (`csfMetRatio`) and ODEX run times. No scorecard point is a CSF CMMG value. The 144 unit tests pass after updating the Smith comparison, which now shows the previous default as its second column.

## Barrier damage (added in #89)

CNS infection with blood–brain barrier damage raises CSF CMMG several-fold: Lindström's disrupted-barrier samples imply a partition of about 0.11, and one patient with severe damage implies above 0.7. #89 added a **Blood–brain barrier** setting: *Intact* (default; 0.30 / 0.025) or *Damaged (CNS infection; exploratory)* (0.37 / 0.11). The damaged values are fitted in-sample to those samples and have no independent test (`LINDSTROM-CSF.md`).

## Effect on users

Default CSF CMMG curves are ten times lower than in v0.27.0. Nothing else in a simulation changes.

## Decision record (for the manuscript)

**Decision:** change, from 0.25 to 0.025, for an intact barrier. Barrier damage is an exploratory preset, not the default. Final at `main` 3d585c1.

**Observations that support the value**

| Source | Population | Role | What it shows |
|---|---|---|---|
| Smith 2010 | 9 adults, normal and impaired kidney function, no CNS infection | Calibration | CSF:plasma CMMG AUC ratio about 0.025 in both groups |
| Lindström 2019 [4], intact barrier | 3 measured, 7 below limit (albumin ratio within age-specific normal) | Independent check | 0.025 within twofold for 3/3; consistent with all 7 below-limit values. 0.25 fits none |
| Lindström 2019 [4], disrupted barrier | 17 measured, 6 below limit | Contrary for CNS infection | implies about 0.11; basis of the exploratory Damaged preset |
| Unita 2023 | 1 case before dialysis | Supporting | CSF CMMG about 1% of plasma |
| Helldén 2006 cohort, summarized in [Helldén’s 2010 thesis](https://files01.core.ac.uk/download/pdf/70338802.pdf), p. 16 | symptomatic patients, barrier status unreported | Context only | Sampled CSF/serum CMMG concentration ratio 0.065 ± 0.037. Sampling times varied. |

**Sensitivity.** Predicted CSF CMMG is proportional to the partition, so the Lindström fit can be read off for any value:

| Partition | 0.015 | 0.02 | **0.025** | 0.03 | 0.035 | 0.05 | 0.11 | 0.25 |
|---|---|---|---|---|---|---|---|---|
| GMR, intact barrier (3 measured) | 0.35 | 0.47 | **0.58** | 0.70 | 0.82 | 1.17 | 2.57 | 5.84 |
| GMR, disrupted barrier (17 measured) | 0.13 | 0.18 | **0.22** | 0.27 | 0.31 | 0.44 | 0.97 | 2.21 |

The intact-barrier fit is acceptable (GMR within 0.5–2) from about 0.022 to 0.085; the intact group has only 3 measured values, so that range is wide and data-limited. **Nothing else depends on the partition:** plasma acyclovir, plasma CMMG and CSF acyclovir are unchanged, no evidence-scorecard point is a CSF CMMG value, and every validation script except the configuration echo in `hara-hd-results.json` gives identical output before and after. The manuscript's plasma results are therefore insensitive to this choice.

**Why change rather than retain.** 0.25 had no source: it is tenfold Smith's measured ratio, and it overpredicts the only independent intact-barrier data about sixfold while predicting measurable CSF CMMG in all seven samples that were below the limit. 0.025 is the measured value and passes the independent check. 0.035 fits Lindström slightly better but was not adopted, because choosing it from Lindström would leave no independent check. Retaining 0.25 would have been defensible only as a rough stand-in for barrier damage. Even for that it is too high (disrupted-barrier GMR 2.21), and the Damaged preset now covers that case explicitly.
