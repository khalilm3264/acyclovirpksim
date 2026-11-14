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

## Where the urine discrepancy occurs

The final paper reports two separate collections. In the 16 h from admission to HD1, 4.51 mg was recovered (0.282 mg/h). In the 14 h between sessions, 600 mL at 22 mg/L yielded 13.2 mg (0.943 mg/h). The observed recovery rate increased 3.35-fold, whereas the reconstruction puts the higher rate before HD1 in every timing scenario. [Table 1A and results, pp. 2470–2472](https://doi.org/10.1002/bcp.70138)

| Assumed last dose to admission | First 16 h, mg | Between sessions, mg | Between-session plasma AUC, mg·h/L |
|---|---:|---:|---:|
| Observed recovery | 4.51 | 13.20 | — |
| AyFlux, 0 h | 152.24 | 41.85 | 72.15 |
| AyFlux, 4 h | 119.82 | 34.03 | 58.67 |
| AyFlux, 8 h | 97.14 | 27.67 | 47.71 |

For the second collection only, use the post-HD1 concentration of 3.2 mg/L and the pre-HD2 concentration of 2.1 mg/L as interval endpoints. Linear and log-linear interpolation give AUCs of 37.10 and 36.56 mg·h/L. Dividing the 13.2 mg recovered by these AUCs gives apparent renal acyclovir clearances of 5.93 and 6.02 mL/min. These depend on the assumed unsampled plasma trajectory and alignment of the pre-HD2 draw with collection end. Rebound or incomplete collection could alter the estimates. The first interval lacks a starting plasma concentration.

In the four-hour-delay scenario, modeled between-session exposure is 1.58 times the linear AUC estimate and modeled renal drug clearance is 1.63 times the corresponding estimate (9.67 vs 5.93 mL/min). Their product accounts for the 2.58-fold difference in recovered mass. Changing the last-dose timing alone leaves excess predicted recovery in both intervals. These measurements cannot establish how renal function evolved or single out a model coefficient for adjustment.

During HD2, the measured inlet concentrations at 0, 1, 2 and 2.5 h were 2.00, 1.20, 0.99 and 1.00 mg/L. Relative to session start these are 1.000, 0.600, 0.495 and 0.500. The corresponding modeled fractions are 1.000, 0.748, 0.608 and 0.557 across all three timing assumptions. The reported pre-HD2 value of 2.1 mg/L is a separate draw. These are repeated measurements from the same session evaluated in the effluent analysis.

Run `node research/validation/vasquez-urine-intervals.cjs` to reproduce the tables and compare step sizes. The runner also checks modeled urinary mass by independently integrating the modeled plasma curve over the interdialytic collection.

## Pediatric hemodialysis evidence

Strong and Hébert report serum acyclovir of 7.02 µmol/L immediately before an infusion and 182.5 µmol/L one hour after infusion in a five-year-old receiving intermittent hemodialysis. These correspond to 1.58 and 41.10 mg/L using a molecular weight of 225.21 g/mol. After nephrectomy, the reported regimen was 460 mg/m² after hemodialysis three times weekly. The pediatric AyFlux model lacks an intermittent hemodialysis clearance term, so these concentrations are retained as observations only. [Strong and Hébert, Pediatric Nephrology (1997)](https://doi.org/10.1007/s004670050379)

## Direct oral acyclovir in Jamez 2026

Jamez et al. describe two anuric adults treated with oral acyclovir. The first, a 69-year-old man on hemodiafiltration, received 800 mg twice daily and later IV acyclovir. The article reports no drug concentration for him. The second, a 78-year-old woman on thrice-weekly high-flux HD, received 400 mg twice daily. On treatment day 6 her **predialysis plasma acyclovir was 4.4 mg/L (19.54 µmol/L), seven hours after her last dose**. The authors used LC-DAD. There was no paired post-HD level or CMMG assay. The abstract calls this a trough. The seven-hour clock time in the case narrative matters for interpreting it against a 12-hour regimen. [Jamez et al., pp. 2–4](https://doi.org/10.1684/ndt.2026.199)

To illustrate the timing effect, assume no further dose or dialysis from hour 7 to hour 12, completed absorption and monoexponential decline. Applying the seven **different** terminal half-lives in Almond Table 3 (10.0–42.8 h) to 4.4 mg/L gives 3.11–4.06 mg/L at hour 12. Using their mean half-life of 20.23 h gives 3.71 mg/L. The seven printed rows yield a standard error of 4.22 h, while the source summary lists 4.6 h. The range here uses the individual rows. It is neither a confidence interval nor an observed Jamez trough. In particular, the measured sample preceded a scheduled HD session and the time to dialysis is unavailable. The seven-source study involved oliguric patients after a single 800 mg oral dose.

The calculation uses the observed concentration solely as a starting value. It cannot test oral absorption, identify an individual clearance, establish a toxicity cutoff or estimate HD removal. AyFlux models IV acyclovir and oral valacyclovir, so direct oral acyclovir has no matched route in the production simulator. [Almond et al., Table 3, p. 431](https://doi.org/10.1159/000188514) · [Reproduction script](jamez-oral-sampling.cjs)

## Whole-blood partition sensitivity in the second HD session

The blood-side mass calculation under a whole-blood/plasma concentration ratio of 1 gives 26.25 mg. The effluent fit gives 66.57 mg. With a constant ratio applied to both arterial and venous plasma curves, the blood-side mass scales directly with that ratio and requires 2.54 to match the effluent fit. As a separate bound, even complete extraction would require a time-averaged inlet blood/plasma ratio of at least 1.39, given 250 mL/min blood flow and the inlet plasma AUC of 191.55 mg·min/L. Both calculations depend on the same sparse samples and flow assumptions used in the original comparison. [Vasquez Vasquez et al., Table 1 and Figure 2](https://doi.org/10.1002/bcp.70138)

De Miranda Table II supplies paired fitted clearance estimates for total radiolabel in plasma and whole blood after IV acyclovir in four adults with cancer. Dividing plasma clearance by blood clearance cancels the identical tracer dose and body-surface normalization within each participant, yielding the integrated whole-blood/plasma **radioactivity** AUC ratio.

| Participant | Plasma / blood tracer clearance, mL/min/1.73 m² | Blood/plasma tracer AUC ratio | Illustrative Vasquez blood-side mass, mg |
|---|---:|---:|---:|
| VMB | 238 / 209 | 1.139 | 29.89 |
| EJH | 260 / 244 | 1.066 | 27.97 |
| MAM | 291 / 276 | 1.054 | 27.68 |
| GSS | 265 / 248 | 1.069 | 28.05 |

The fifth participant lacks a whole-blood row. The plasma and blood group means use different denominators. The four paired ratios are all below the inlet bound, even before allowing for circulating drug leaving the dialyzer. They describe total tracer exposure in a separate cohort. They cannot determine parent-specific red-cell partition on either side of the dialyzer in this patient.

A further sensitivity interprets the “haematocrit 26.7 g/dL” entry in Vasquez Table 1B as 26.7% by volume. With equal haematocrit and cell/plasma concentration ratios on both sides, whole-blood/plasma = (1 − haematocrit) + haematocrit × cell/plasma. A whole-blood/plasma ratio of 2.54 would require a cell/plasma ratio of 6.75. No cell assay was reported. The source-unit ambiguity, differing assays, sample interpolation, effluent fit and lack of measured whole-blood concentrations preclude assigning the discrepancy to partition. [De Miranda et al., p. 668, Table II](https://doi.org/10.1038/clpt.1981.218) · [Reproduction script](vasquez-hd-extraction.cjs)
