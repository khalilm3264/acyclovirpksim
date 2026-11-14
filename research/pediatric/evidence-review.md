# Evidence audit and pediatric comparison

Reviewed supplied PDFs on 2026-11-09. These notes distinguish published measurements, published simulations and new AyFlux calculations. No uploaded journal PDFs are redistributed.

## Pediatric IV comparison

Zeng’s final model is CL = 3.55 × (weight/19.6)^0.75 × (CLCR/3.7)^0.51 L/h and V = 7.36 × (weight/19.6) L. CLCR is in L/h/m². Convert a numerical indexed value in mL/min/1.73 m² by multiplying by 60/1000/1.73. The 3.7 reference corresponds to 106.6833 mL/min/1.73 m².

Zeng uses Counahan (0.43 × height/creatinine); Abdalla uses age/sex-dependent historical Schwartz coefficients. Equal numerical indexed inputs are therefore a mathematical sensitivity comparison, not necessarily the same patient’s renal function. All comparison points lie within both studies’ marginal weight/renal ranges; this does not establish joint covariate support. These are typical IV predictions without random effects or efficacy targets. The models describe different populations. No clinical superiority is inferred.

Illustrative 10 mg/kg every 8 hours over 1 hour; all peaks/troughs below are theoretical steady state, in mg/L. These are generated predictions, not observed measurements.

| Weight kg | Indexed renal input | Abdalla CL L/h | Zeng CL L/h | Abdalla peak / trough | Zeng peak / trough |
|---|---|---|---|---|---|
| 10 | 90 | 2.560 | 1.965 | 9.700 / 1.845 | 21.054 / 0.540 |
| 10 | 120 | 3.094 | 2.276 | 8.957 / 1.206 | 20.130 / 0.289 |
| 10 | 160 | 3.738 | 2.635 | 8.350 / 0.740 | 19.207 / 0.141 |
| 19.6 | 90 | 4.241 | 3.255 | 10.506 / 2.585 | 22.166 / 1.003 |
| 19.6 | 120 | 5.125 | 3.769 | 9.609 / 1.765 | 21.192 / 0.588 |
| 19.6 | 160 | 6.193 | 4.365 | 8.883 / 1.146 | 20.264 / 0.319 |
| 40 | 90 | 7.241 | 5.558 | 11.545 / 3.571 | 23.475 / 1.761 |
| 40 | 120 | 8.750 | 6.436 | 10.449 / 2.531 | 22.386 / 1.115 |
| 40 | 160 | 10.574 | 7.453 | 9.563 / 1.724 | 21.397 / 0.663 |

Regenerate with `node research/pediatric/compare.cjs`; full precision results are in `model-comparison.json`. Tests check the published Zeng reference values, renal-unit conversion, eligibility bounds, and dose/clearance AUC identity. The existing infusion solver also has independent RK4 verification.

## Important interpretation decisions

- **CAPD:** Stathoulopoulou 2002 reports mean half-life 22.27 hours in eight patients. The authors report mean 24-hour dialysate recovery of 6.51% of administered acyclovir in eight patients. The exact recovery denominator is uncertain ([comparison of the two source tables](../validation/STATHOULOPOULOU-CAPD.md#denominators)). The paper’s approximately 13% figure assumes 50% bioavailability; it is a different denominator. Neither figure is a measured PD clearance. Repeated-dose concentrations in its Table 1 are predictions, not observed repeated-dose validation.
- **CMMG:** Kably’s supplement contains five diagnostic figures, not executable model code or individual data. Apparent ACV parameters, CMMG parameter definitions and the renal covariate specification need a complete structural implementation before reproducing the joint model. Do not substitute the reported Kp (h⁻¹) for a dimensionless CSF partition coefficient, or infer metabolite formation fraction from an AUC ratio.
- **Clearance terminology:** Kacirova calculates its “CL/F (L/kg)” as daily dose (mg/kg) divided by trough concentration (mg/L). This dose/trough index is not conventional dose/AUC pharmacokinetic clearance and must not be inserted into AyFlux as L/h/kg.
- **Observed renal strata:** Kacirova Table 3 reports median CMMG trough 0.39 vs 1.30 mg/L above vs below eGFR 1 mL/s/1.73 m² (=60 mL/min/1.73 m²). Samples and doses differ; this is an observational check on direction, not a parameter fit or toxicity cutoff.
- **Neonates:** D’Agate includes maturation and infection effects; extrapolating the older-child model is inappropriate. Funaki is a single changing-treatment CRRT/plasma-exchange case, not an independent population model.
- **CNS:** Sun separates CSF and brain extracellular fluid. Its simulated target attainment cannot be relabeled as observed clinical efficacy or used to equate CSF with brain exposure.
- **Absorption:** the adult default remains F=0.545 from labeling. Soul-Lawton’s 0.542 is a separate estimate. Yang 2013 (10.1124/dmd.113.052597) is mouse PepT1 evidence and does not establish human dose saturation; Weller is the relevant human dose-escalation source.

## Duplicate and cohort audit

`sun2025.pdf` / `sun2025-2.pdf` and `dagate2024.pdf` / `dagate2024-2.pdf` are byte-identical duplicate pairs. `dkaf070.pdf` and `kably2025.pdf` have matching extracted text. The two Laskin PDFs have different titles/DOIs; retain both bibliographic records while flagging likely cohort overlap with Krasny. D’Agate reuses earlier neonatal trial data, and Sun reuses published PK observations; paper count must not be mistaken for independent validation-cohort count.

## Sources and permitted uses

- Zeng L, et al. (2009). [Population pharmacokinetics of acyclovir in children and young people with malignancy after administration of intravenous acyclovir or oral valacyclovir](https://doi.org/10.1128/AAC.01138-08). 43 patients; final Table 3 supports a separate pediatric IV comparison. Counahan renal estimates and L/h/m² units differ from Abdalla’s historical Schwartz input.
- Soul-Lawton J, et al. (1995). [Absolute bioavailability and metabolic disposition of valaciclovir, the L-valyl ester of acyclovir, following oral administration to humans](https://doi.org/10.1128/aac.39.12.2759). Mean absolute bioavailability 54.2% in 12 healthy volunteers. AyFlux’s 54.5% default remains attributed to the product label, not this result.
- Weller S, et al. (1993). [Pharmacokinetics of the acyclovir pro-drug valaciclovir after escalating single- and multiple-dose administration to normal volunteers](https://doi.org/10.1038/clpt.1993.196). Human dose-escalation evidence for less-than-dose-proportional oral exposure; does not determine a universal saturation constant.
- Kably B, et al. (2025). [Population pharmacokinetics of aciclovir and its major metabolite 9-carboxymethoxymethylguanine and safety profile of valaciclovir in early liver transplant recipients](https://doi.org/10.1093/jac/dkaf070). 50 transplant recipients; only one participant had eGFR below 30. Joint model and simulations support renal-dependence research, not dialysis validation or a toxicity threshold.
- Stathoulopoulou F, et al. (2002). [Evaluation of Valaciclovir Dosage Reduction in Continuous Ambulatory Peritoneal Dialysis Patients](https://doi.org/10.1159/000057621). 12 participants after one 500 mg dose; only eight had three timed plasma samples. Apparent clearance is approximate; full AUC, bioavailability and dialysis clearance were not established.
- Stathoulopoulou F, et al. (1996). [Clinical Pharmacokinetics of Oral Acyclovir in Patients on Continuous Ambulatory Peritoneal Dialysis](https://doi.org/10.1159/000189332). Oral acyclovir in CAPD; do not transfer formulation-dependent apparent parameters directly to valacyclovir or IV dosing.
- Kacirova I, et al. (2022). [Therapeutic monitoring of serum concentrations of acyclovir and its metabolite 9-(carboxymethoxymethyl) guanine in routine clinical practice](https://doi.org/10.1016/j.biopha.2022.113852). 27 patients receiving IV acyclovir. Renal strata differed in dose and demographics; pooled troughs are observational comparators, not a controlled dose-response experiment.
- Funaki T, et al. (2015). [Therapeutic Drug Monitoring in Neonatal HSV Infection on Continuous Renal Replacement Therapy](https://doi.org/10.1542/peds.2014-3380). One neonate with changing CRRT and plasma exchange. Circuit and treatment timing prevent use as a general neonatal dialysis-clearance constant.
- D’Agate S, et al. (2024). [Population pharmacokinetics and dose rationale for aciclovir in term and pre-term neonates with herpes](https://doi.org/10.1002/prp2.1193). Final analysis: 83 samples from 28 infants. Reanalysis of earlier neonatal trial data; not an independent validation cohort for the original model.
- Sun M, et al. (2025). [Revisiting Acyclovir Dosing for Adult Viral Encephalitis Using a Full Bayesian LeiCNS PBPK Modeling Approach](https://doi.org/10.1007/s40262-025-01545-w). CNS PBPK analysis distinguishes CSF from brain extracellular fluid. Reuses published observations; model code is available on reasonable request, not supplied in this PDF.
- Laskin OL, et al. (1982). [Effect of Renal Failure on the Pharmacokinetics of Acyclovir](https://doi.org/10.1016/0002-9343(82)90090-0). Six anuric participants; likely overlapping with the other 1982 Laskin/Krasny reports. Treat as potentially shared evidence, not three independent cohorts.
- Krasny HC, et al. (1982). [Influence of Hemodialysis on Acyclovir Pharmacokinetics in Patients with Chronic Renal Failure](https://doi.org/10.1016/0002-9343(82)90091-2). Historical dialysis experiment. The reported concentration reduction is not the fraction of the initial dose removed; match timing and the amount denominator before comparison.

## Funaki neonatal CRRT and plasma exchange

Figure 1C provides nine serum acyclovir concentrations in a single full-term neonate. The y-axis is µg/mL, numerically equal to mg/L. Three labeled one-hour infusions began at 15:19, 23:15 and 06:33. The first and third peak markers, at 16:00 and 07:00, fall **during** those infusions. The 01:00 marker follows the end of the 23:15 infusion by 45 minutes. Pooling these as equal-time post-infusion peaks would mix different phases of the dose. [Funaki et al., Figure 1C and Table 1](https://doi.org/10.1542/peds.2014-3380)

| CRRT alone, clock time | Approximate serum acyclovir (mg/L) | Two-point apparent half-life (h) |
|---|---:|---:|
| 01:00 to 03:00 | 18.95 to 9.79 | 2.10 |
| 03:00 to 05:00 | 9.79 to 6.20 | 3.03 |
| 01:00 to 05:00 | 18.95 to 6.20 | 2.48 |

The four-hour decline reproduces the authors’ estimate of about two to three hours under CRRT. Moving each plotted ordinate by one rendering pixel gives 2.44–2.52 h for this interval. This quantifies digitization precision only. Other intervals include plasma exchange, an infusion or unexplained concentration changes. For example, between 18:00 and 23:00 the plotted concentration rises before the next labeled infusion. The figure/text label Qb 15, Qd 2000 and Qf 200 in mL/min. Effective effluent delivery, a timed filtrate concentration and residual renal clearance are unavailable. The observed serum decline includes distribution and all elimination pathways. It supplies no measured filter clearance or causal estimate of the dosing effect on viral decline. [Source coordinates and arithmetic](funaki-crrt-sampling.cjs)

## Neonatal plasma models from the same two trials

Sampson and colleagues estimated weight-normalized clearance as 0.305 × (PMA/31.3)^3.02 L/h/kg and volume as 2.8 L/kg. PMA is postmenstrual age in weeks. D’Agate reanalyzed the trial data. Their final Table 2 fixes the maturation midpoint at 50 weeks and uses the first power of PMA. For weight W in kg, total clearance in L/h is 0.748 × (W/1.37)^0.75 × PMA/(50 + PMA) plus **absolute** creatinine clearance in L/h. Base volume is 1.93 × W/1.37 L. The larger-volume group has 2.67 times this volume. The authors used study membership as a proxy for systemic infection because individual viral-load information was limited. [Sampson et al., final model](https://pmc.ncbi.nlm.nih.gov/articles/PMC3904301/) · [D’Agate et al., Methods and Table 2](https://doi.org/10.1002/prp2.1193)

The comparison assumes 20 mg/kg IV over one hour every eight hours to hold the input constant. The neonates below are illustrative combinations of age, length and weight. All rows use the reported median indexed CrCl of 15.8 mL/min/1.73 m². The calculation multiplies by Gehan–George BSA / 1.73 and by 0.06 to obtain L/h. D’Agate’s abstract uses 28 infants with 83 concentrations in the analysis; the baseline descriptors in Table 1 cover 32 enrolled infants. These typical-model outputs do not represent individual measured concentrations.

| Weight / length / PMA | Sampson interval AUC | D’Agate interval AUC, either volume | D’Agate base peak / trough | D’Agate larger-volume peak / trough |
|---|---:|---:|---:|---:|
| 0.80 kg / 33 cm / 26 weeks | 114.83 | 72.32 | 16.28 / 4.12 | 11.53 / 6.89 |
| 1.37 kg / 40 cm / 31.3 weeks | 65.57 | 76.13 | 16.71 / 4.53 | 12.00 / 7.36 |
| 3.20 kg / 49 cm / 40 weeks | 31.26 | 85.40 | 17.78 / 5.55 | 13.14 / 8.50 |

AUC is in mg·h/L and concentrations are steady-state mg/L. At 1.37 kg the renal term accounts for 20.0% of D’Agate’s typical total clearance. Varying the indexed input over the reported 9.4–40.0 mL/min/1.73 m² summary interval changes that share from 12.9% to 38.7% and interval AUC from 82.84 to 58.28 mg·h/L. A different volume changes peak and trough at fixed clearance, while interval AUC remains dose/clearance. The apparent agreement or difference between these equations is sensitive to age and renal input. No independent neonatal cohort, dialysis function or individual disease classification enters the comparison. The research runner uses the existing IV infusion solver with explicit model parameters and independently integrates each final interval to check the AUC identity. [Run the comparison](neonatal-model-comparison.cjs)

## Independent 1982 neonatal peak and trough summaries

Hintz et al. report mean peak/trough concentrations in neonates treated for herpesvirus infections. The historical Canadian monograph reproduces the same means and SDs for q8h administration. Using 0.22521 mg/L per µmol/L gives the values below. The nearby Yeager report describes nine neonates treated at 5–15 mg/kg q8h and shares an author. Overlap between the 1982 reports is uncertain. These data precede the Sampson and D’Agate trials. [Hintz et al.](https://pubmed.ncbi.nlm.nih.gov/6285713/) · [Monograph, Table 4](https://pdf.hres.ca/dpd_pm/00001146.PDF) · [Yeager](https://pubmed.ncbi.nlm.nih.gov/6285712/)

| Dose, mg/kg q8h | Observed mean peak / trough, mg/L | Predicted peak range, mg/L | Predicted trough range, mg/L |
|---|---:|---:|---:|
| 5 | 6.76 / 1.19 | 1.90–4.62 | 0.38–2.86 |
| 10 | 13.78 / 2.27 | 3.80–9.24 | 0.77–5.71 |
| 15 | 19.39 / 3.11 | 5.71–13.86 | 1.15–8.57 |

Predictions use the three age/size profiles, three indexed renal inputs and three fixed-effect model variants above. We assumed a one-hour infusion, steady state, an end-infusion peak and an immediately predose trough. Individual dose histories, maturational covariates and sample clocks are unavailable in the Hintz abstract. All three measured mean peaks exceed the tested range while the troughs fall inside it. For instance, at 10 mg/kg, 1.37 kg, 31.3 weeks and indexed CrCl 15.8, D’Agate’s base variant gives 8.36/2.26 mg/L. Matching that trough leaves a peak 39% below the measured mean. The comparison uses group means from a different cohort and cannot identify bias in an individual neonate.

Assuming seven hours between samples, the peak/trough means imply two-point half-lives of 2.80, 2.69 and 2.65 h. The primary source reports a mean terminal half-life of 3.78 h (SD 1.21). A ratio of group means and a mean fitted terminal slope summarize different quantities. [Source transcription and reproduction script](hintz-neonatal-sampling.cjs)

## Maximova pediatric oncology cohort at the measured sampling times

Maximova et al. measured acyclovir in 120 children on the first monitoring occasion after at least four treatment days. The infusions lasted one hour. Plasma was drawn 30 minutes after infusion end and ten minutes before the next dose. The measured post-infusion mean pooled both schedules, 7.6 mg/L (SD 5.4). The q6h and q8h predose means were 1.00 (SD 1.10) and 0.85 mg/L (SD 1.30). Children had a mixture of prophylaxis and treatment, and doses changed for some on later occasions. [Maximova et al., Methods, Results and Figure 2](https://doi.org/10.3389/fphar.2022.865871)

Using Abdalla at the reported median age of 9.5 years, weight 27.8 kg and indexed eGFR 209.4 mL/min/1.73 m² gives CL 9.61 L/h and V 30.02 L. With the reported median starting daily dose of 40.7 mg/kg/day, the predictions below compare the sampled times against the theoretical steady-state extremes. The groups’ actual interval-specific dose distributions are unavailable.

| Scenario | Dose (mg) | End infusion / +30 min (mg/L) | −10 min / predose (mg/L) |
|---|---:|---:|---:|
| q6h at median daily dose | 282.9 | 9.45 / 8.05 | 2.01 / 1.91 |
| q8h at median daily dose | 377.2 | 11.65 / 9.93 | 1.31 / 1.24 |
| q6h at median individual dose | 350 | 11.69 / 9.96 | 2.49 / 2.36 |
| q8h at median individual dose | 350 | 10.81 / 9.21 | 1.21 / 1.15 |

Matching the sampling clock lowers the model’s post-infusion concentration by 14.8%, and raises the predose value by 5.5% at these inputs. Both scenario conventions give higher troughs than the respective measured group means. At 350 mg the Abdalla interval AUC is 36.43 mg·h/L, compared with a median **fitted** AUC of 23.3 mg·h/L in Table 3. The tabulated fitted CL and V medians were 14.6 L/h and 26.1 L. This comparison combines separate marginal summaries and does not evaluate individual accuracy. The nominal eGFR is above the upper bound of 5.7 L/h/m² in the Zeng comparison, so extending that equation here would require extrapolation. [Source equations and time checks](maximova-timed-sampling.cjs)
