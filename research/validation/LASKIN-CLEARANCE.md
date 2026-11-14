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
| AUC without / with probenecid, µmol·h/L | 91.3 / 127.6 | 74.25 / 105.24 |
| AUC increase with approximately 32% renal inhibition | 39.8% | 41.7% |
| Terminal half-life without / with probenecid, h | 2.3 / 2.7 | 2.99 / 3.57 |

Renal clearance is approximately 34% high and slightly exceeds the published mean plus one SD. Total clearance is approximately 20% high. A reported SD describes the small cohort's spread and does not establish model agreement. The earlier 70-kg comparison mixed absolute and indexed clearance and understated the difference.

The reconstruction activates the simulator’s probenecid switch while holding CrCl fixed. This applies the study-informed factor of 0.68 to parent renal clearance. Metabolite renal clearance stays fixed. The simulated relative AUC increase is close to the observed ratio, while both absolute AUCs are low and both terminal half-lives are long. The calculated 26.7% decrease in total clearance assumes the source’s baseline nonrenal clearance also applies during probenecid treatment. Total clearance from simulated AUC, with a terminal half-life tail correction, is checked against the parameter sum.

At a separate nominal 70-kg, CrCl-zero setting, nonrenal clearance is 28.7 mL/min. Its similarity to the cited Sadjadi intercept is a construction anchor. A BSA of 1.73 m² would make this numerically identical in indexed units, but no matched patient is represented. About 93% of that nonrenal clearance is assigned to CMMG formation. Parent-drug clearance alone does not identify this formation fraction or metabolite elimination, so #46 remains unresolved.

This comparison supports reporting clearance bias and studying alternatives. It supplies no basis for a unique parameter correction.

## Whitley multiday IV comparison

Whitley et al. reported three sequential studies in 43 immunocompromised patients. The multiday arm enrolled 20 and used one-hour infusions every eight hours for five days plus a sixteenth dose. Table II gives the dose-specific group sizes. The published peaks are group means in µmol/L. AyFlux uses a nominal 70 kg, BSA 1.73 m² and the **whole arm's** mean indexed CrCl of 70.2 mL/min/1.73 m². Here, the end of dose 16 represents the reported steady-state peak. [Whitley et al., pp. 166–169](https://doi.org/10.1016/0002-9343(82)90084-5)

| IV dose (mg/kg) | n | First peak, observed / predicted | Steady peak, observed / predicted | Observed ratio of means |
|---|---:|---:|---:|---:|
| 2.5 | 3 | 22.5 / 21.1 | 30.1 / 22.3 | 1.34 |
| 5 | 6 | 36.2 / 42.2 | 43.2 / 44.6 | 1.19 |
| 10 | 7 | 66.6 / 84.3 | 66.9 / 89.2 | 1.00 |
| 15 | 4 | 94.6 / 126.5 | 91.7 / 133.8 | 0.97 |

The fixed-parameter linear model gives the same ratio of 1.057 at each dose. Varying assumed weight from 50 to 90 kg and BSA from 1.50 to 2.10 m² gives 1.035–1.081. The apparent trend in the source ratios compares four small groups with different participants. It cannot establish dose-dependent accumulation. The authors described dose-proportional kinetics and excluded two unusual CrCl values from their steady-state dose-correlation analysis. The individual paired peaks and dose-specific CrCl distributions are unavailable.

For the single-dose, single-day multidose and multiday arms, the reported ratios of mean renal acyclovir clearance to mean CrCl are 125/57 = 2.19, 177/62.9 = 2.81 and 184/70.2 = 2.62, respectively. At 70 kg the current model uses 3.37. Multiday cumulative urinary parent recovery averaged 68% (SD 14). Under constant inputs the model's eventual renal fraction is 89.2%. Collection completeness and follow-up differ from an infinite-time fraction. The paper also reports two measured CSF concentrations two hours after infusion ended, 16.6 and 17.8 µmol/L. Their corresponding plasma values, 35.0 and 36.1, were **author-predicted**. The resulting ratios of 0.474 and 0.493 cannot be treated as measured pairs. AyFlux gives 0.358 after the first dose and 0.442 after dose 16 at that lag with the intact-barrier default. Individual sampling dose and barrier status are unknown. The report summarizes earlier phase-I work. We do not add its endpoints to the independent scorecard or assume independence from the label. [Source transcription and sensitivity runner](whitley-iv-course.cjs)

## Boosman ICU trough monitoring

Boosman et al. studied 259 ICU patients treated with IV acyclovir. They collected 787 samples in 254 patients and excluded six draws taken outside the trough window, leaving 781 eligible samples. Individuals supplied 1–15 samples (median two). The reported population median was 1.59 mg/L, with an interval of 0.87–3.25 mg/L. The ICU protocol used 5–10 mg/kg IV over 60 minutes three times daily, with trough monitoring after at least 24 hours and subsequent dose adjustments. The publication does not link each dose and trough to its contemporaneous renal function or RRT. [Boosman et al., §§2.2–3 and Table 1](https://doi.org/10.3390/jcm14051409)

At nominal 70 kg, BSA 1.73 m², constant renal function and no RRT, the predicted troughs (mg/L) are:

| Baseline CKD-EPI numeral used as absolute CrCl | 5 mg/kg q8h, 24 h / 128 h | 10 mg/kg q8h, 24 h / 128 h |
|---|---:|---:|
| 34.3 | 2.11 / 2.19 | 4.23 / 4.38 |
| 56.8 | 0.97 / 0.98 | 1.95 / 1.97 |
| 92.8 | 0.38 / 0.39 | 0.77 / 0.77 |

Table 1 supplies the baseline estimated GFR median and quartiles. It labels the values mL/min and specifies CKD-EPI in Methods. The additional scenarios treat them as indexed values and vary assumed BSA from 1.50 to 2.10 m² and weight from 55 to 90 kg. CrCl and estimated GFR are different quantities. At the nominal median kidney input the two regimens bracket the cohort median. This cannot establish predictive accuracy or reproduce the trough distribution in a population receiving dose adjustments. The ratio of the marginal median cumulative dose (5,500 mg) to median treatment duration (5.5 days) does not identify an individual’s dose. The nephrotoxicity analysis compares outcomes in matched groups and supplies no concentration-specific validation of a toxicity boundary. [Study](https://doi.org/10.3390/jcm14051409) · [Reproduction script](boosman-icu-trough.cjs)

## Dispersion among the six anuric subjects

In the original scan, Table I row 2 at 1 h is **36.1** µmol/L. Re-summing the six rows reproduces every printed mean and sample SD, including the post-HD column at its nominal time. The 1 h group mean is 37.53, median 28.75, and range 22.8–83.9 µmol/L. Omitting only the highest observation changes that mean to 28.26, close to the 27.44 predicted by averaging unmodified deterministic runs at the six reported weights. At 2 h, omitting that same participant gives 17.58 against the full mean of 17.57. This sharpens the interpretation of mean peak error without excluding that observation from the analysis. [Laskin et al., Am J Med, Table I, p. 198](https://doi.org/10.1016/0002-9343(82)90090-0)

| Hours from IV start | Measured sample SD | SD with observed weights alone | SD with six source-fitted PK parameter sets |
|---:|---:|---:|---:|
| 1 | 23.29 | 0.22 | 21.18 |
| 2 | 3.34 | 0.31 | 3.52 |
| 8 | 2.94 | 0.13 | 2.29 |
| 12 | 2.66 | 0.16 | 2.32 |
| 24 | 2.38 | 0.21 | 2.09 |
| 48 | 1.38 | 0.18 | 1.41 |

All SDs are in µmol/L. Weight-only results use 2.5 mg/kg IV over one hour, CrCl zero, and default PK coefficients with random variability disabled. The other column uses all six parameter sets fitted by the source authors to these data. It describes in-sample dispersion. The calculation pairs no patient identifiers across papers and supplies no coverage estimate for the model’s Monte Carlo band. The paper’s post-HD draws varied from 15 to 90 minutes, so modeled SDs stop at 48 h. [CPT parameter source](https://doi.org/10.1038/clpt.1982.83) · [Digitized rows and reproduction script](laskin-individual-spread.cjs)
