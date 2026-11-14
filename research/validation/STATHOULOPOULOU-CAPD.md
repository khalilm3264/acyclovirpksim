# Timed urinary and peritoneal acyclovir recovery

Stathoulopoulou et al. administered a single 500 mg oral valacyclovir dose after a morning CAPD exchange and collected urine and effluent for 24 hours. Table 2 reports urinary recovery of 3, 4, 3.3 and 3.3% for participants 5–8 (mean 3.4%, SD 0.4243). Participants 1–4 and 9–12 are marked anuric. CAPD recovery for participants 1–8 is 8.6, 4.8, 7.8, 6.7, 5.7, 3.4, 8.4 and 6.7% (mean 6.51%, SD 1.81). These means therefore cover different subsets. [Source, Nephron 2002;91:164–166](https://doi.org/10.1159/000057621)

## Denominators

The manuscript describes these percentages as fractions of administered acyclovir despite administering valacyclovir, and doubles them when assuming 50% bioavailability. It does not provide the calculation needed to resolve whether recovery was divided by tablet mass or by the equimolar acyclovir dose. Both interpretations are retained here.

The methods on printed p. 165 define the acyclovir-equivalent dose as 500 × 0.6944 = 347.2 mg for the apparent-clearance calculation. A cross-check of the separate concentration prediction reveals a discrepancy. Multiply each Table 1 predicted concentration for 500 mg every 24 hours (µmol/L) by 0.22521 mg/µmol, 24 hours and the corresponding Table 2 apparent clearance (L/h). For patient 1, 20.13 × 0.22521 × 24 × 4.6 = 500.5 mg. All twelve rows imply 500.2–500.7 mg with the printed rounded values. Thus the predicted concentrations are consistent with approximately 500 mg in the numerator. The paper gives no individual recovered masses for an analogous check of the recovery percentages. The concentration calculation alone cannot resolve which denominator was used for recovery.

A 500 mg valacyclovir dose corresponds to 347.18 mg acyclovir before the bioavailability factor, using molecular weights of 324.34 and 225.21 g/mol. The alternative observed recovery masses are therefore:

| Published mean | Tablet mass denominator | Acyclovir equivalent denominator |
|---|---:|---:|
| Urine, 3.4% | 17.00 mg | 11.80 mg |
| CAPD, 6.51% | 32.55 mg | 22.60 mg |

## Simulation assumptions

Individual weights, creatinine clearances and exchange prescriptions are unavailable. The grid uses illustrative weights of 50, 70 and 90 kg and constant CrCl values of 0–10 mL/min. It uses the engine's four six-hour, 2 L CAPD exchanges, 2.5% glucose and default transport coefficients. Bioavailability is 0.545. The 24-hour endpoint includes the fourth drain. These assumptions support a sensitivity analysis across incomplete published inputs.

Run `node research/validation/stathoulopoulou-capd.cjs` from the repository root. The script checks mass conservation and verifies that halving the integration step changes recovery by less than 0.001 mg.
| Weight (kg) | CrCl (mL/min) | Urine (mg) | Drained CAPD (mg) | Urine / tablet mass (%) | CAPD / tablet mass (%) | Urine / ACV equivalent (%) | CAPD / ACV equivalent (%) |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 50.00 | 0.00 | 0.00 | 17.80 | 0.00 | 3.56 | 0.00 | 5.13 |
| 50.00 | 0.50 | 6.06 | 17.37 | 1.21 | 3.47 | 1.75 | 5.00 |
| 50.00 | 1.00 | 11.85 | 16.96 | 2.37 | 3.39 | 3.41 | 4.88 |
| 50.00 | 2.00 | 22.66 | 16.17 | 4.53 | 3.23 | 6.53 | 4.66 |
| 50.00 | 5.00 | 49.85 | 14.13 | 9.97 | 2.83 | 14.36 | 4.07 |
| 50.00 | 10.00 | 82.23 | 11.52 | 16.45 | 2.30 | 23.69 | 3.32 |
| 70.00 | 0.00 | 0.00 | 13.44 | 0.00 | 2.69 | 0.00 | 3.87 |
| 70.00 | 0.50 | 5.89 | 13.13 | 1.18 | 2.63 | 1.70 | 3.78 |
| 70.00 | 1.00 | 11.52 | 12.83 | 2.30 | 2.57 | 3.32 | 3.70 |
| 70.00 | 2.00 | 22.07 | 12.26 | 4.41 | 2.45 | 6.36 | 3.53 |
| 70.00 | 5.00 | 48.80 | 10.77 | 9.76 | 2.15 | 14.06 | 3.10 |
| 70.00 | 10.00 | 81.05 | 8.85 | 16.21 | 1.77 | 23.34 | 2.55 |
| 90.00 | 0.00 | 0.00 | 10.84 | 0.00 | 2.17 | 0.00 | 3.12 |
| 90.00 | 0.50 | 5.73 | 10.60 | 1.15 | 2.12 | 1.65 | 3.05 |
| 90.00 | 1.00 | 11.23 | 10.37 | 2.25 | 2.07 | 3.23 | 2.99 |
| 90.00 | 2.00 | 21.54 | 9.93 | 4.31 | 1.99 | 6.21 | 2.86 |
| 90.00 | 5.00 | 47.83 | 8.76 | 9.57 | 1.75 | 13.78 | 2.52 |
| 90.00 | 10.00 | 79.88 | 7.24 | 15.98 | 1.45 | 23.01 | 2.08 |

## Interpretation

Urinary recovery crosses the published mean between CrCl 0.5 and 2 mL/min across these weights and denominator interpretations. This range reflects the selected grid and assumptions. Patient-specific CrCl was unreported, so the crossing does not estimate their actual kidney function.

Drained CAPD recovery remains below the published eight-person mean throughout the grid, under either denominator interpretation. Its maximum is 17.80 mg, compared with alternative observed means of 22.60 or 32.55 mg. Individual published values span 3.4–8.6%, so the group mean discrepancy coexists with overlap of some individual results. Exchange prescriptions and body weights would be needed to assess patient-level agreement.

These results do not establish a general renal clearance overprediction. They support further investigation of exchange timing, transport and residual renal function before attributing the Vasquez discrepancy to one coefficient.
