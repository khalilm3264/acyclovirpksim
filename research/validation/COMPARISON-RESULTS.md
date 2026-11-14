# Exploratory benchmark comparison

Selected multipliers: {"clearanceScale":0.7,"vcScale":2}

| Endpoint | Published | Default | Selected grid point |
|---|---:|---:|---:|
| Kacířová ACV trough (mg/L) | 1.700 | 0.445 | 1.411 |
| Kacířová ACV +25 min (mg/L) | 8.900 | 9.053 | 10.225 |
| Kacířová CMMG trough (mg/L) | 0.270 | 0.108 | 0.258 |
| Kacířová CMMG +25 min (mg/L) | 0.640 | 0.702 | 0.659 |
| Vasquez HD1 inlet at start (mg/L) | 8.800 | 8.272 | 10.448 |
| Vasquez HD1 inlet at 2 h (mg/L) | 3.200 | 5.033 | 7.628 |
| Vasquez HD2 removal (mg) | 66.600 | 25.972 | 52.210 |
| Vasquez Urinary recovery over 16 + 14 h (mg) | 17.700 | 153.850 | 126.718 |
| Bataille day-3 serum (mg/L) | 0.252 | 0.720 | 1.296 |
| Bataille day-3 CSF (mg/L) | 0.151 | 0.342 | 0.529 |
| Bataille rechallenge serum (mg/L) | 3.964 | 5.728 | 5.452 |
| Boelaert subject 1 five-day CAPD recovery (%) | 10.600 | 12.900 | 11.818 |
| Boelaert subject 4 five-day CAPD recovery (%) | 13.600 | 10.848 | 9.857 |
| Boelaert subject 5 five-day CAPD recovery (%) | 12.300 | 12.609 | 11.538 |
| Stathoulopoulou urine, tablet denominator (mg) | 17.000 | 11.519 | 6.494 |
| Stathoulopoulou urine, ACV equivalent denominator (mg) | 11.804 | 11.519 | 6.494 |
| Stathoulopoulou dialysate, tablet denominator (mg) | 32.550 | 12.829 | 10.493 |
| Stathoulopoulou dialysate, ACV equivalent denominator (mg) | 22.602 | 12.829 | 10.493 |

## Interpretation

A 36-point grid selected clearanceScale 0.7 and vcScale 2 using the mean squared log error of the two Kacířová parent acyclovir observations. This improves the parent trough and both CMMG predictions, while the parent post-infusion error increases. The volume multiplier lies at the upper grid boundary. ClearanceScale multiplies renal and nonrenal parent elimination terms. CMMG formation and dialysis clearance retain their model values. VcScale changes central volume only.

Applying that same pair to other reconstructions produces mixed results. Vasquez first-session plasma predictions and Bataille day-3 serum and CSF move farther from observation. Vasquez second-session removal and urinary recovery move toward observation, though the urinary prediction remains much higher. Boelaert CAPD recovery improves for subject 1 and worsens for subjects 4 and 5.

The Stathoulopoulou rows use 70 kg and CrCl 1 mL/min with the standard illustrative CAPD prescription. The observed urinary mean covers four participants and the observed dialysate mean covers eight. Individual weight, CrCl and exchange prescriptions are unavailable. The two denominator rows reflect uncertainty in the source calculation.

The other studies were excluded from grid selection, but their outcomes were already known when this experiment was designed. This is an exploratory cross-study comparison. Prospective parameter selection and independent evaluation would be needed to quantify predictive performance.

All reconstructions and source links are documented in the accompanying study files. Differences in dose history, sampling time and unreported patient inputs remain sources of uncertainty.
