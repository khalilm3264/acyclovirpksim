# Manders 2026 & Sadjadi 2018 External Evaluations

Executed with Node v26.13.0 after freezing [the pre-execution protocol](MANDERS2026-SADJADI2018-PROTOCOL.md) at commit `29f271e9da1410f4d073ad9af9346b56f832387b` (blob `63919bd4e1b73e02ec66083e427516255988b5a2`). The model is pinned to commit `304ce5308ea78907d18b07d8670c164295829eb3` (`public/assets/pk-engine.js` blob `17971df66e0a97b4d382572a582d35c444a3c83f`), whose plasma and CSF acyclovir equations are identical to frozen manuscript commit `8fc1c9d`. All `engine.validate(...)` checks pass cleanly; no model parameter or default was tuned or changed.

## Part A: Manders et al. 2026 (`n = 6` primary steady-state plasma acyclovir)

Max step-size difference (`0.025 h` vs `0.0125 h`) across all 18 primary-surrogate runs: **1.21e-12%** (< 0.1%). Max difference vs analytical $R_0 / CL_{\text{total}}$ across all 72 combinations: **1.66e-12%** (< 0.1%).

### Summary across prespecified kidney surrogates and model variants (`n = 6`: Cases A, B, C, D, E, G)

| Kidney surrogate | Variant | GMR (bias) | AFE | Within 0.80–1.25 | Within twofold |
| --- | --- | ---: | ---: | ---: | ---: |
| `during-raw` | `default` | 0.95 | 1.37 | 2/6 | 6/6 |
| `during-raw` | `renal-x0.75` | 1.23 | 1.35 | 4/6 | 6/6 |
| `during-raw` | `no-allometric` | 0.96 | 1.30 | 3/6 | 6/6 |
| `before-raw` | `default` | 1.00 | 1.30 | 3/6 | 6/6 |
| `before-raw` | `renal-x0.75` | 1.30 | 1.33 | 4/6 | 6/6 |
| `before-raw` | `no-allometric` | 1.01 | 1.23 | 4/6 | 6/6 |
| `during-censored-105` | `default` | 0.89 | 1.33 | 3/6 | 6/6 |
| `during-censored-105` | `renal-x0.75` | 1.15 | 1.32 | 4/6 | 6/6 |
| `during-censored-105` | `no-allometric` | 0.89 | 1.27 | 3/6 | 6/6 |
| `during-bsa-scaled` | `default` | 0.91 | 1.43 | 1/6 | 6/6 |
| `during-bsa-scaled` | `renal-x0.75` | 1.18 | 1.42 | 2/6 | 6/6 |
| `during-bsa-scaled` | `no-allometric` | 0.92 | 1.36 | 2/6 | 6/6 |

### Per-case predictions on primary surrogate (`during-raw` eGFR, mg/L)

| Case (W, CrCl) | Observed | Default (ratio) | Renal ×0.75 (ratio) | No allometric (ratio) |
| --- | ---: | ---: | ---: | ---: |
| Case A (54.4 kg, 90) | 2.9 | 4.13 (1.42) | 5.35 (1.84) | 3.42 (1.18) |
| Case B (75 kg, 90) | 2.9 | 4.47 (1.54) | 5.80 (2.00) | 4.71 (1.62) |
| Case C (60 kg, 79) | 5.1 | 4.76 (0.93) | 6.15 (1.21) | 4.24 (0.83) |
| Case D (89 kg, 81) | 6.4 | 5.14 (0.80) | 6.64 (1.04) | 6.15 (0.96) |
| Case E (81.5 kg, 80) | 8.1 | 5.08 (0.63) | 6.57 (0.81) | 5.70 (0.70) |
| Case G (69 kg, 90) | 6.1 | 4.38 (0.72) | 5.68 (0.93) | 4.33 (0.71) |

### Secondary CSF check: Case F (`48 F`, `91.0 kg`, observed CSF `2.5 mg/L`; plasma `43.4 mg/L` excluded as PICC contamination)

Step-size max difference on Case F: **4.28e-12%**. Default model predictions across the `2 × 2 × 2` bounding grid:

| Dose (`mg/kg/day`) | CrCl (`mL/min`) | Barrier (`csfRatio`) | Predicted plasma (`mg/L`) | Predicted CSF (`mg/L`) | CSF pred/obs (vs `2.5 mg/L`) |
| ---: | ---: | --- | ---: | ---: | ---: |
| 30 | 25 | intact (0.3) | 13.80 | 4.14 | 1.66 |
| 30 | 25 | damaged (0.37) | 13.80 | 5.11 | 2.04 |
| 30 | 76 | intact (0.3) | 5.47 | 1.64 | 0.66 |
| 30 | 76 | damaged (0.37) | 5.47 | 2.02 | 0.81 |
| 20 | 25 | intact (0.3) | 9.20 | 2.76 | 1.10 |
| 20 | 25 | damaged (0.37) | 9.20 | 3.40 | 1.36 |
| 20 | 76 | intact (0.3) | 3.65 | 1.09 | 0.44 |
| 20 | 76 | damaged (0.37) | 3.65 | 1.35 | 0.54 |

## Part B: Sadjadi et al. 2018 diagnostic reconstructability & sensitivity grid

Sadjadi et al. 2018 (`doi:10.12659/AJCR.911520`) cannot be scored as a point-level validation benchmark because patient weight, cyclic PD exchange volumes/dwells, oral-acyclovir tablet absorption, resumed IV dose, and blood-draw timings relative to infusion and HD are unreported (and Case Report age `80` vs Abstract `83` conflicts). Instead, the prespecified bounded grid (`CrCl = 0`, 5 daily 1 h IV doses) maps which plausible steady-state `[trough 120 h, peak 97 h]` ranges span the reported elevated serum acyclovir concentrations (`2.1` and `6.3 mg/L`).

Max step-size difference (`0.025 h` vs `0.0125 h`) across all 36 Sadjadi cells: **1.42e-7%**.

| Weight (`kg`) | Dose (`mg/kg/day`) | Schedule | Variant | Day-5 trough `120 h` (`mg/L`) | Day-5 peak `97 h` (`mg/L`) | Brackets `2.1` / `6.3` |
| ---: | ---: | --- | --- | ---: | ---: | --- |
| 50 | 2.5 | no-dialysis | `default` | 2.32 | 8.33 | no / yes |
| 50 | 2.5 | no-dialysis | `no-allometric` | 1.57 | 7.30 | yes / yes |
| 50 | 2.5 | daily-hd | `default` | 1.20 | 7.29 | yes / yes |
| 50 | 2.5 | daily-hd | `no-allometric` | 0.85 | 6.63 | yes / yes |
| 50 | 2.5 | alt-hd | `default` | 1.39 | 8.00 | yes / yes |
| 50 | 2.5 | alt-hd | `no-allometric` | 0.96 | 7.12 | yes / yes |
| 50 | 5 | no-dialysis | `default` | 4.63 | 16.67 | no / yes |
| 50 | 5 | no-dialysis | `no-allometric` | 3.15 | 14.60 | no / yes |
| 50 | 5 | daily-hd | `default` | 2.40 | 14.58 | no / yes |
| 50 | 5 | daily-hd | `no-allometric` | 1.71 | 13.25 | yes / yes |
| 50 | 5 | alt-hd | `default` | 2.79 | 16.00 | no / yes |
| 50 | 5 | alt-hd | `no-allometric` | 1.92 | 14.25 | yes / yes |
| 70 | 2.5 | no-dialysis | `default` | 2.61 | 8.71 | no / yes |
| 70 | 2.5 | no-dialysis | `no-allometric` | 2.61 | 8.71 | no / yes |
| 70 | 2.5 | daily-hd | `default` | 1.56 | 7.73 | yes / yes |
| 70 | 2.5 | daily-hd | `no-allometric` | 1.56 | 7.73 | yes / yes |
| 70 | 2.5 | alt-hd | `default` | 1.77 | 8.39 | yes / yes |
| 70 | 2.5 | alt-hd | `no-allometric` | 1.77 | 8.39 | yes / yes |
| 70 | 5 | no-dialysis | `default` | 5.21 | 17.41 | no / yes |
| 70 | 5 | no-dialysis | `no-allometric` | 5.21 | 17.41 | no / yes |
| 70 | 5 | daily-hd | `default` | 3.11 | 15.47 | no / yes |
| 70 | 5 | daily-hd | `no-allometric` | 3.11 | 15.47 | no / yes |
| 70 | 5 | alt-hd | `default` | 3.54 | 16.78 | no / yes |
| 70 | 5 | alt-hd | `no-allometric` | 3.54 | 16.78 | no / yes |
| 90 | 2.5 | no-dialysis | `default` | 2.84 | 8.99 | no / yes |
| 90 | 2.5 | no-dialysis | `no-allometric` | 3.60 | 9.89 | no / yes |
| 90 | 2.5 | daily-hd | `default` | 1.85 | 8.09 | yes / yes |
| 90 | 2.5 | daily-hd | `no-allometric` | 2.28 | 8.70 | no / yes |
| 90 | 2.5 | alt-hd | `default` | 2.07 | 8.70 | yes / yes |
| 90 | 2.5 | alt-hd | `no-allometric` | 2.60 | 9.47 | no / yes |
| 90 | 5 | no-dialysis | `default` | 5.67 | 17.99 | no / yes |
| 90 | 5 | no-dialysis | `no-allometric` | 7.20 | 19.78 | no / no |
| 90 | 5 | daily-hd | `default` | 3.70 | 16.18 | no / yes |
| 90 | 5 | daily-hd | `no-allometric` | 4.56 | 17.41 | no / yes |
| 90 | 5 | alt-hd | `default` | 4.15 | 17.39 | no / yes |
| 90 | 5 | alt-hd | `no-allometric` | 5.20 | 18.94 | no / yes |
