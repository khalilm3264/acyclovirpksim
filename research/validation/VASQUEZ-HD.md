# Acyclovir recovery during intermittent hemodialysis

Vasquez Vasquez et al. reported four 1,000 mg oral valacyclovir doses in a 69-year-old woman weighing 49.9 kg. Table 1A gives dialyzer-inlet plasma concentrations. The authors estimated second-session recovery by integrating measured effluent concentrations and multiplying by dialysate flow. The two timed urine collections contained 4.51 and 13.2 mg of acyclovir. [Full citation and DOI](https://doi.org/10.1002/bcp.70138)

## Reconstruction

The simulation spaces the four doses eight hours apart. Admission falls 0, 4 or 8 hours after the fourth dose in three illustrative reconstructions. Hemodialysis begins 16 hours after admission and lasts two hours. The second session begins 14 hours after the first ends and lasts 2.5 hours. Urinary recovery sums the two collection intervals, excluding the first session.

AyFlux estimates constant creatinine clearance by Cockcroft–Gault using admission serum creatinine (11.3 mg/dL), giving 3.70 mL/min. The authors report eGFR of 3.3 mL/min. Both sessions use the AyFlux default drug clearance of 81.8 mL/min. The reported blood and dialysate flows were 250 and 500 mL/min. All pharmacokinetic coefficients retain their default values. Central plasma represents the inlet sample. No parameters were fitted.

## Results

Run `node research/validation/vasquez-hd.cjs` from the repository root. Percent difference is relative to the published value. Halving the integration step must change each prediction by less than 0.001 in the endpoint's units.

Assumed last dose to admission: 0 h

| Endpoint | Published | Predicted | Absolute difference | Difference (%) |
|---|---:|---:|---:|---:|
| HD1 inlet at start (mg/L) | 8.8 | 10.17 | 1.37 | 15.6 |
| HD1 inlet at 2 h (mg/L) | 3.2 | 6.19 | 2.99 | 93.4 |
| HD2 removal (mg) | 66.6 | 31.94 | 34.66 | -52.0 |
| Urinary recovery over 16 + 14 h (mg) | 17.7 | 194.09 | 176.39 | 996.6 |

Assumed last dose to admission: 4 h

| Endpoint | Published | Predicted | Absolute difference | Difference (%) |
|---|---:|---:|---:|---:|
| HD1 inlet at start (mg/L) | 8.8 | 8.27 | 0.53 | -6.0 |
| HD1 inlet at 2 h (mg/L) | 3.2 | 5.03 | 1.83 | 57.3 |
| HD2 removal (mg) | 66.6 | 25.97 | 40.63 | -61.0 |
| Urinary recovery over 16 + 14 h (mg) | 17.7 | 153.85 | 136.15 | 769.2 |

Assumed last dose to admission: 8 h

| Endpoint | Published | Predicted | Absolute difference | Difference (%) |
|---|---:|---:|---:|---:|
| HD1 inlet at start (mg/L) | 8.8 | 6.73 | 2.07 | -23.6 |
| HD1 inlet at 2 h (mg/L) | 3.2 | 4.09 | 0.89 | 27.9 |
| HD2 removal (mg) | 66.6 | 21.12 | 45.48 | -68.3 |
| Urinary recovery over 16 + 14 h (mg) | 17.7 | 124.81 | 107.11 | 605.2 |

Across these timing assumptions, the predicted first-session concentration decline is about 39%, compared with 64% observed. The model underestimates second-session dialysate recovery and overestimates urinary recovery in all three reconstructions. This single case cannot identify which clearance or distribution assumptions explain the discrepancies.

## Pediatric hemodialysis evidence

Strong and Hébert report serum acyclovir of 7.02 µmol/L immediately before an infusion and 182.5 µmol/L one hour after infusion in a five-year-old receiving intermittent hemodialysis. These correspond to 1.58 and 41.10 mg/L using a molecular weight of 225.21 g/mol. After nephrectomy, the reported regimen was 460 mg/m² after hemodialysis three times weekly. The pediatric AyFlux model lacks an intermittent hemodialysis clearance term, so these concentrations are retained as observations only. [Strong and Hébert, Pediatric Nephrology (1997)](https://doi.org/10.1007/s004670050379)
