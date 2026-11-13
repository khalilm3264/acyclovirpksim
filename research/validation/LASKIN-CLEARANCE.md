# Laskin renal and nonrenal clearance comparison

Addresses #51 using the production engine. Run `node research/validation/laskin-clearance.cjs`.

Laskin et al., 1982, DOI [10.1128/AAC.21.5.804](https://doi.org/10.1128/AAC.21.5.804), report three adults. Mean body weight is 79.1 kg and BSA is 1.89 m². CrCl is 90 mL/min/1.73 m². The full-text extraction is recorded in the private source repository under `data/extracted/laskin1982/`.

The engine takes absolute CrCl, so the input is 90 × 1.89 / 1.73 = 98.324 mL/min. The dose is 5 mg/kg over one hour. Engine clearances are converted back by multiplying by 1.73 / 1.89. Scaling published group means this way is an approximation to the cohort, with no individual-level fit.

| Quantity | Published | Engine |
|---|---:|---:|
| Renal clearance, mL/min/1.73 m² | 248 ± 80 | 332.1 |
| Nonrenal clearance, same units | 52, derived by subtraction | 28.8 |
| Total clearance, same units | 300 ± 69 | 360.8 |
| Renal fraction | 83% | 92% |
| Renal clearance / CrCl | 2.76 | 3.69 |
| AUC increase with approximately 32% renal inhibition | 39.8% | 41.7% |

Renal clearance is approximately 34% high and slightly exceeds the published mean plus one SD. Total clearance is approximately 20% high. A reported SD describes the small cohort's spread and does not establish model agreement. The earlier 70-kg comparison mixed absolute and indexed clearance and understated the difference.

The probenecid illustration multiplies the model's renal term by 0.68 through the CrCl input. It is a sensitivity experiment, with no separate secretion pathway. Total clearance from simulated AUC, with a terminal half-life tail correction, is checked against the parameter sum.

At a separate nominal 70-kg, CrCl-zero setting, nonrenal clearance is 28.7 mL/min. Its similarity to the cited Sadjadi intercept is a construction anchor. A BSA of 1.73 m² would make this numerically identical in indexed units, but no matched patient is represented. About 93% of that nonrenal clearance is assigned to CMMG formation. Parent-drug clearance alone does not identify this formation fraction or metabolite elimination, so #46 remains unresolved.

This comparison supports reporting clearance bias and studying alternatives. It supplies no basis for a unique parameter correction.
