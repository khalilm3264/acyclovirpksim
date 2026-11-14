# Unified AyFlux benchmark report

Generated from pinned normalized endpoint inputs. No new model fitting and no change to application parameters.

GMR = exp(mean(log(predicted/observed))); absolute fold error = exp(mean(abs(log(predicted/observed)))). Bounds are inclusive. Counts refer to endpoints, not independent patients. The 0.80–1.25 band is descriptive and is not a clinical or regulatory acceptance rule. The model band is seeded parameter variability, not a validated prediction interval.

The frozen paper uses CMMG nonrenal clearance 0.5 L/h and CSF CMMG partition 0.25. Later evaluations use their separately pinned engine; they do not replace the paper results. No grand total is formed across studies, ablations or sensitivity reconstructions.

## Pinned sources

| Input | Source commit | Model commit | Engine blob |
|---|---|---|---|
| manuscript | 8fc1c9d97590c81d3fbcf65ecb1f0ead273ab4a0 | 8fc1c9d97590c81d3fbcf65ecb1f0ead273ab4a0 | cb07505a2b9e619ee3351bb0bf66d5610a611a6f |
| manders | c5eb2984fd9e024dd780310d44f3b00bf370b431 | 304ce5308ea78907d18b07d8670c164295829eb3 | 17971df66e0a97b4d382572a582d35c444a3c83f |
| turner | 341f1467562e004fd26b67e38744d061e9b8815d | 304ce5308ea78907d18b07d8670c164295829eb3 | 17971df66e0a97b4d382572a582d35c444a3c83f |
| smith | b0defab8b9af6a87e7fdd42d01390b30d21e4457 | 304ce5308ea78907d18b07d8670c164295829eb3 | 17971df66e0a97b4d382572a582d35c444a3c83f |

## frozen manuscript

| Study / stratum | Reconstruction | Variant | n endpoints | GMR | Absolute fold error | Within 0.80–1.25 | Within twofold | Inside model band |
|---|---|---|---:|---:|---:|---:|---:|---:|
| All 37 published endpoints | all scenarios | default | 37 | 0.963 | 1.453 | 17/37 | 30/37 | 33/37 |
| Laskin 1982 (normal kidney function) | laskin-normal | default | 12 | 0.774 | 1.293 | 5/12 | 12/12 | 12/12 |
| Laskin 1982 (anuric, before dialysis) | laskin-anuric | default | 3 | 0.940 | 1.149 | 2/3 | 3/3 | 2/3 |
| US label 5 mg/kg q8h (steady state) | label-5 | default | 2 | 0.693 | 1.442 | 1/2 | 2/2 | 2/2 |
| US label 10 mg/kg q8h (steady state) | label-10 | default | 2 | 0.551 | 1.816 | 0/2 | 1/2 | 2/2 |
| Kacirova 2022, one patient (with CMMG) | kacirova | default | 4 | 0.586 | 1.809 | 2/4 | 2/4 | 3/4 |
| Vasquez 2025, HD patient | vasquez | default | 2 | 1.216 | 1.293 | 1/2 | 2/2 | 2/2 |
| Boelaert 1987 CAPD, patient 1 | boelaert-1 | default | 4 | 1.196 | 1.196 | 4/4 | 4/4 | 4/4 |
| Boelaert 1987 CAPD, patient 4 | boelaert-4 | default | 4 | 1.971 | 1.971 | 0/4 | 2/4 | 2/4 |
| Boelaert 1987 CAPD, patient 5 | boelaert-5 | default | 4 | 1.687 | 1.687 | 2/4 | 2/4 | 4/4 |
| Plasma acyclovir, no dialysis | stratum | default | 21 | 0.734 | 1.382 | 9/21 | 19/21 | 19/21 |
| Plasma acyclovir, dialysis | stratum | default | 14 | 1.526 | 1.539 | 7/14 | 10/14 | 12/14 |
| Plasma CMMG | stratum | default | 2 | 0.661 | 1.647 | 1/2 | 1/2 | 2/2 |
| Excluding author-fitted CAPD | source sensitivity | default | 25 | 0.758 | 1.394 | 11/25 | 22/25 | 23/25 |

## frozen ablation

| Study / stratum | Reconstruction | Variant | n endpoints | GMR | Absolute fold error | Within 0.80–1.25 | Within twofold | Inside model band |
|---|---|---|---:|---:|---:|---:|---:|---:|
| Plasma, no dialysis | fixed 37-point set | full | 21 | 0.734 | 1.382 | 9/21 | 19/21 | — |
| Plasma, dialysis | fixed 37-point set | full | 14 | 1.526 | 1.539 | 7/14 | 10/14 | — |
| Plasma CMMG | fixed 37-point set | full | 2 | 0.661 | 1.647 | 1/2 | 1/2 | — |
| All plasma acyclovir | fixed 37-point set | full | 35 | 0.984 | 1.443 | 16/35 | 29/35 | — |
| Plasma, no dialysis | fixed 37-point set | no-peripheral | 21 | 0.237 | 4.918 | 7/21 | 13/21 | — |
| Plasma, dialysis | fixed 37-point set | no-peripheral | 14 | 1.124 | 1.553 | 1/14 | 12/14 | — |
| Plasma CMMG | fixed 37-point set | no-peripheral | 2 | 0.485 | 2.413 | 1/2 | 1/2 | — |
| All plasma acyclovir | fixed 37-point set | no-peripheral | 35 | 0.442 | 3.101 | 8/35 | 25/35 | — |
| Plasma, no dialysis | fixed 37-point set | no-other | 21 | 0.742 | 1.380 | 9/21 | 19/21 | — |
| Plasma, dialysis | fixed 37-point set | no-other | 14 | 1.605 | 1.605 | 4/14 | 10/14 | — |
| Plasma CMMG | fixed 37-point set | no-other | 2 | 0.664 | 1.643 | 1/2 | 1/2 | — |
| All plasma acyclovir | fixed 37-point set | no-other | 35 | 1.010 | 1.466 | 13/35 | 29/35 | — |
| Plasma, no dialysis | fixed 37-point set | no-cmmg | 21 | 0.845 | 1.366 | 9/21 | 18/21 | — |
| Plasma, dialysis | fixed 37-point set | no-cmmg | 14 | 3.540 | 3.540 | 2/14 | 3/14 | — |
| Plasma CMMG | fixed 37-point set | no-cmmg | 2 | undefined | undefined | — | — | — |
| All plasma acyclovir | fixed 37-point set | no-cmmg | 35 | 1.499 | 1.999 | 11/35 | 21/35 | — |
| Plasma, no dialysis | fixed 37-point set | gfr-only | 21 | 1.886 | 1.988 | 6/21 | 11/21 | — |
| Plasma, dialysis | fixed 37-point set | gfr-only | 14 | 1.599 | 1.599 | 6/14 | 9/14 | — |
| Plasma CMMG | fixed 37-point set | gfr-only | 2 | 2.223 | 2.223 | 0/2 | 0/2 | — |
| All plasma acyclovir | fixed 37-point set | gfr-only | 35 | 1.766 | 1.822 | 12/35 | 20/35 | — |
| Plasma, no dialysis | fixed 37-point set | no-dialysis | 21 | 0.734 | 1.382 | 9/21 | 19/21 | — |
| Plasma, dialysis | fixed 37-point set | no-dialysis | 14 | 1.694 | 1.709 | 3/14 | 9/14 | — |
| Plasma CMMG | fixed 37-point set | no-dialysis | 2 | 0.661 | 1.647 | 1/2 | 1/2 | — |
| All plasma acyclovir | fixed 37-point set | no-dialysis | 35 | 1.026 | 1.505 | 12/35 | 28/35 | — |
| Plasma, no dialysis | fixed 37-point set | no-allometry | 21 | 0.797 | 1.323 | 10/21 | 19/21 | — |
| Plasma, dialysis | fixed 37-point set | no-allometry | 14 | 1.229 | 1.385 | 6/14 | 12/14 | — |
| Plasma CMMG | fixed 37-point set | no-allometry | 2 | 0.803 | 1.390 | 1/2 | 2/2 | — |
| All plasma acyclovir | fixed 37-point set | no-allometry | 35 | 0.948 | 1.348 | 16/35 | 31/35 | — |
| Plasma, no dialysis | fixed 37-point set | renal-75 | 21 | 0.972 | 1.210 | 14/21 | 20/21 | — |
| Plasma, dialysis | fixed 37-point set | renal-75 | 14 | 1.551 | 1.551 | 7/14 | 10/14 | — |
| Plasma CMMG | fixed 37-point set | renal-75 | 2 | 0.900 | 1.416 | 0/2 | 2/2 | — |
| All plasma acyclovir | fixed 37-point set | renal-75 | 35 | 1.172 | 1.336 | 21/35 | 30/35 | — |

## subsequent external evaluation

| Study / stratum | Reconstruction | Variant | n endpoints | GMR | Absolute fold error | Within 0.80–1.25 | Within twofold | Inside model band |
|---|---|---|---:|---:|---:|---:|---:|---:|
| Turner 2016 | absolute-egfr | default | 4 | 0.693 | 1.474 | 1/4 | 3/4 | — |
| Turner 2016 | absolute-egfr | renal-x0.75 | 4 | 0.827 | 1.289 | 2/4 | 4/4 | — |
| Turner 2016 | cg-actual | default | 4 | 0.652 | 1.586 | 1/4 | 3/4 | — |
| Turner 2016 | cg-actual | renal-x0.75 | 4 | 0.782 | 1.376 | 2/4 | 3/4 | — |
| Turner 2016 | cg-ideal | default | 4 | 0.839 | 1.242 | 2/4 | 4/4 | — |
| Turner 2016 | cg-ideal | renal-x0.75 | 4 | 0.987 | 1.097 | 4/4 | 4/4 | — |
| Turner 2016 | cg-adjusted | default | 4 | 0.747 | 1.392 | 1/4 | 4/4 | — |
| Turner 2016 | cg-adjusted | renal-x0.75 | 4 | 0.886 | 1.219 | 2/4 | 4/4 | — |
| Manders 2026 | during-raw | default | 6 | 0.952 | 1.366 | 2/6 | 6/6 | — |
| Manders 2026 | during-raw | renal-x0.75 | 6 | 1.231 | 1.352 | 4/6 | 6/6 | — |
| Manders 2026 | during-raw | no-allometric | 6 | 0.956 | 1.298 | 3/6 | 6/6 | — |
| Manders 2026 | before-raw | default | 6 | 1.004 | 1.295 | 3/6 | 6/6 | — |
| Manders 2026 | before-raw | renal-x0.75 | 6 | 1.296 | 1.328 | 4/6 | 6/6 | — |
| Manders 2026 | before-raw | no-allometric | 6 | 1.009 | 1.231 | 4/6 | 6/6 | — |
| Manders 2026 | during-censored-105 | default | 6 | 0.886 | 1.334 | 3/6 | 6/6 | — |
| Manders 2026 | during-censored-105 | renal-x0.75 | 6 | 1.149 | 1.322 | 4/6 | 6/6 | — |
| Manders 2026 | during-censored-105 | no-allometric | 6 | 0.891 | 1.268 | 3/6 | 6/6 | — |
| Manders 2026 | during-bsa-scaled | default | 6 | 0.914 | 1.432 | 1/6 | 6/6 | — |
| Manders 2026 | during-bsa-scaled | renal-x0.75 | 6 | 1.183 | 1.416 | 2/6 | 6/6 | — |
| Manders 2026 | during-bsa-scaled | no-allometric | 6 | 0.918 | 1.361 | 2/6 | 6/6 | — |

Turner: retrospective group-mean reconstruction with known published endpoints; kidney surrogates and all sensitivities are reported. Manders: six primary plasma levels, including one adolescent; Case F plasma and H are excluded. Rows are repeated analyses, not additional participants.

## Smith 2016 diagnostic reconstruction

Dependent PK descriptors are shown separately; no pooled fold-error score is assigned. Trough is author-extrapolated; AUC, clearance and apparent half-life are author-derived. Infusion duration is assumed; PK-weight replacements are structural sensitivities, not dosing recommendations.

| Axis | Assumption | Peak ratio | Trough ratio | AUC ratio | Clearance ratio | Apparent half-life ratio |
|---|---|---:|---:|---:|---:|---:|
| CrCl input | reported-estimate | 0.502 | 0.146 | 0.262 | 3.810 | 0.331 |
| CrCl input | measured | 0.721 | 0.598 | 0.596 | 1.674 | 0.639 |
| CrCl input | cg-actual | 0.501 | 0.145 | 0.261 | 3.827 | 0.330 |
| CrCl input | cg-ideal | 0.629 | 0.387 | 0.451 | 2.212 | 0.506 |
| CrCl input | cg-adjusted | 0.563 | 0.250 | 0.349 | 2.858 | 0.412 |
| PK scaling weight | actual | 0.721 | 0.598 | 0.596 | 1.674 | 0.639 |
| PK scaling weight | adjusted | 0.969 | 0.750 | 0.772 | 1.292 | 0.606 |
| PK scaling weight | ideal | 1.276 | 0.924 | 0.983 | 1.014 | 0.579 |
| Infusion assumption | 0.5 | 0.797 | 0.584 | 0.596 | 1.674 | 0.590 |
| Infusion assumption | 1 | 0.721 | 0.598 | 0.596 | 1.674 | 0.639 |
| Infusion assumption | 2 | 0.614 | 0.627 | 0.596 | 1.674 | 0.731 |

## Exclusions and non-scorable evidence

- **Manders F plasma:** PICC-contaminated sample; excluded by source protocol.
- **Manders H:** No measured concentration.
- **Manders F CSF:** Bounded sensitivity analysis; unknown paired regimen/kidney timing; no pooled scoring.
- **Sadjadi 2018:** Unreported weight, dose, PD prescription and blood-draw times; non-scorable sensitivity grid.
- **Turner clearance:** Derived exposure descriptor, excluded from co-primary Cmax/AUC count; group means are not independent patient records.
- **Smith 2016 combined endpoint score:** Peak, extrapolated trough, AUC, dose/AUC clearance and fitted half-life are dependent descriptors; report ratios separately.

## Interpretation notes

- Descriptive endpoint-weighted summary, includes 12 author-fitted CAPD values.
- published means.
- measured concentrations.
- author-fitted peaks and troughs.
- Full model (reference).
- No peripheral compartment (Q = 0).
- No other nonrenal acyclovir clearance.
- No CMMG formation.
- Renal clearance = CrCl (no net secretion).
- No dialytic clearance.
- No allometric weight scaling.
- Renal coefficient ×0.75 (post hoc, from [16]).
- 4 Cmax/AUC group-mean endpoints; two groups of 7 participants.
- 6 plasma levels; includes one 16-year-old; kidney-function surrogates are assumptions.
