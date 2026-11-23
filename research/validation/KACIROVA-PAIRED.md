# Paired acyclovir and CMMG concentrations during intravenous therapy

Kacířová, Uřinovská and Sagan report a 36-year-old man weighing 86 kg who received 750 mg IV acyclovir every eight hours for two days, followed by 850 mg every eight hours. Figure 1 identifies a trough and a sample taken 25 minutes after the infusion ended. Only the two measured points for each compound enter this comparison. The continuous curve in the figure is the authors’ pharmacokinetic reconstruction. [Original publication, Figure 1](https://www.klinickafarmakologie.cz/incpdfs/far-202204-0002_10_001.pdf)

Dr. Kacířová confirmed oral acyclovir 400 mg four times daily from July 17 to 22 before IV therapy. The last oral dose time and the interval to the first IV dose remain unknown. Time zero is the first IV infusion. The simulation starts with zero drug and metabolite because the preceding oral acyclovir course lacks a measured baseline. Dr. Kacířová also confirmed that the acyclovir samples bracketed the fourth 850 mg infusion. After six 750 mg doses this is the tenth IV dose, starting at hour 72 on the nominal schedule. The reference reconstruction places the second draw at hour 73 plus 25 minutes, assumes a one-hour infusion, and uses the last listed serum creatinine, 87 µmol/L, as a constant Cockcroft–Gault input. The figure gives no sampling-day creatinine or explicit infusion duration. The historical benchmark at `8fc1c9d` assumed the ninth IV dose and explored doses eight through ten. The updated six scenarios fix the sampled dose and vary infusion duration (one or two hours) and each listed creatinine (86, 87 and 102 µmol/L). It reflects these input choices only. The model uses its default coefficients with no fitting or dialysis.

All concentrations and differences are in mg/L. Reproduce with `node research/validation/kacirova-paired.cjs` from the repository root.

| Serum endpoint | Measured | Predicted | Predicted minus measured | Scenario range |
|---|---:|---:|---:|---:|
| Acyclovir trough | 1.7 | 0.45 | -1.25 | 0.44–0.71 |
| Acyclovir +25 min | 8.9 | 9.05 | 0.15 | 5.97–10.34 |
| CMMG trough | 0.27 | 0.11 | -0.16 | 0.10–0.21 |
| CMMG +25 min | 0.64 | 0.70 | 0.06 | 0.66–0.83 |

The model underpredicts both troughs throughout the tested scenarios. In the reference reconstruction both post-infusion predictions are within 0.15 mg/L of the measured values. The resulting trough-to-post-infusion increases exceed the observed increases for both compounds. Two sampling times in one patient cannot distinguish clearance, distribution, metabolite formation and baseline effects.

## Prospective Ostrava IV cohort

A separate prospective publication from the same hospital enrolled 27 patients in 2019–2021. Table 2 gives group medians. Table 3 has 15 troughs and 15 post-infusion observations in the higher-eGFR group, and 11 and 10 in the lower group. Patients received one-hour IV infusions. Samples were collected before the morning dose and 1–40 minutes after infusion end (median 30), on days 4–10 (median 5). The article reports daily dose and leaves the individual intervals unspecified. Whether the single case above belonged to this series is unknown. [Kacířová et al., Tables 2–3 and §2.1](https://doi.org/10.1016/j.biopha.2022.113852)

The scenarios pair median daily doses of 2250/1500 mg with the corresponding median weights of 77/70 kg and heights of 174/160 cm. Sampling-day eGFR was 85.8/48.0 mL/min/1.73 m². Mosteller de-indexing gives 95.68/48.94 mL/min, used as proxies for absolute CrCl. Each simulated course starts drug-free and uses the same dose, renal function and interval up to its day-five morning dose at 96 h. Group medians need not describe any one participant.

| Group and regimen | ACV trough / +30 min (mg/L) | CMMG trough / +30 min (mg/L) | CMMG/ACV mass ratio, trough / +30 min |
|---|---:|---:|---:|
| Higher eGFR, measured medians | 1.90 / 14.0 | 0.39 / 0.92 | 0.18 / 0.07 |
| Higher, 750 mg q8h | 0.74 / 9.91 | 0.25 / 0.94 | 0.34 / 0.095 |
| Higher, 1125 mg q12h | 0.40 / 14.36 | 0.13 / 1.24 | 0.33 / 0.086 |
| Lower eGFR, measured medians | 3.20 / 13.6 | 1.30 / 1.85 | 0.38 / 0.15 |
| Lower, 500 mg q8h | 1.81 / 11.15 | 1.05 / 1.63 | 0.58 / 0.146 |
| Lower, 750 mg q12h | 1.18 / 15.53 | 0.77 / 1.77 | 0.66 / 0.114 |

Observed post-infusion medians combine draws at different times. The ratio column uses the published medians of individual ratios. Both modeled regimens reproduce the direction of the between-group difference in troughs and ratios, while both underpredict the parent and metabolite troughs in each stratum. Post-infusion parent agreement is sensitive to timing. For the higher-eGFR q8h scenario, sampling at +1 versus +40 min gives 17.31 versus 8.33 mg/L. Replacing the current renal metabolite coefficient with the thesis slope of 3.7474 mL/min per mL/min absolute CrCl lowers q8h CMMG troughs to 0.10/0.46 mg/L and post-infusion levels to 0.71/1.05 mg/L, further below the two measured troughs. These aggregate comparisons do not identify an individual elimination rate. The article's daily mg/kg divided by trough mg/L has units L/kg and is excluded from clearance comparisons.

Run `node research/validation/kacirova-iv-cohort.cjs` for all 16 combinations of interval, kidney-function proxy and CMMG slope, including the sensitivity that directly substitutes the indexed eGFR number. Each output includes the three post-infusion times and a step-halving check.

## Forecasting the next sample from a measured trough

Run `node research/validation/kacirova-forecast.cjs` to reproduce the two Figure 1–2 cases with the forecast replay engine used at `44ddec7`. The JSON includes each forecast, the observed target and the effective sample size. Each run uses 120 parameter draws and an assumed assay coefficient of variation of 15%. Only the predose acyclovir measurement is used to update the weights. The post-infusion acyclovir measurement is held out.

In case 1, the population median forecast was 9.58 mg/L and the trough-updated median was 14.68 mg/L against 8.90 mg/L measured. Absolute error increased by 5.09 mg/L.

Figure 2 reports a second patient, an 85-year-old woman weighing 70 kg, with measured trough and post-infusion serum acyclovir of 3.2 and 25.7 mg/L. Eight 750 mg doses eight hours apart were approximated from the figure. The next 750 mg dose was placed at hour 64 or 66 and the sampled infusion 24 hours later. One-hour infusions were assumed. The figure labels 700 mg and 750 mg daily regimens. Both doses were tested for the sampled infusion. Each of the four reported creatinine values (126, 135, 148 and 160 µmol/L) was held constant in turn as a sensitivity analysis during changing renal function. Exact clock times and the patient-specific post-infusion sampling lag remain uncertain.

| Assumed minutes after infusion end | Reconstructions with smaller absolute error after updating | Reduction in absolute error (mg/L) |
|---:|---:|---:|
| 1 | 10/16 | −2.36 to 2.28 |
| 15 | 16/16 | 2.37 to 3.20 |
| 30 | 16/16 | 2.54 to 3.87 |
| 40 | 16/16 | 2.60 to 4.16 |

Each row varies dose, transition time and creatinine for the same patient. The counts describe sensitivity to assumptions. They cannot estimate how often a trough improves forecasting across patients. [Kacířová et al., Figures 1 and 2, p. 134](https://www.solen.cz/incpdfs/far-202204-0002_10_001.pdf)
