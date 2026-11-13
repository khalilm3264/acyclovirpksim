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

## What it does not fix

CNS infection with blood–brain barrier damage raises CSF CMMG several-fold: the Lindström disrupted-barrier samples imply a partition of about 0.11, and above 0.7 in the most severe case. AyFlux has no barrier input. The CSF CMMG chart caption now says so and points to the Advanced setting. Representing barrier damage stays open under #47.

## Effect on users

Default CSF CMMG curves are ten times lower than in v0.27.0. Nothing else in a simulation changes.
