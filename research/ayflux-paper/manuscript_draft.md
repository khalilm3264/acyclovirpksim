# AyFlux: An Open-Source Compartmental Pharmacokinetic Simulator for Acyclovir During Renal Impairment and Dialysis

**Working manuscript — not for submission without scientific review.**  
**Article type under consideration:** computational methods / software application note / nephrology model-evaluation study.  
**Authors, affiliations, funding, contributions, ethics review and corresponding author:** TO BE COMPLETED by the actual research team.  
**Status:** first nominal software experiments completed; patient-level external validation, independent solver verification and appropriate nephrology review remain outstanding.

## Abstract (working)

**Background:** Acyclovir disposition is strongly affected by kidney function and extracorporeal removal. Accessible tools for exploring how drug exposure varies across intermittent hemodialysis, peritoneal dialysis, continuous kidney replacement therapy and changes in residual kidney function could support pharmacokinetic education and methodological research.

**Methods:** We evaluated AyFlux, a browser-based open-source mechanistic simulator implementing compartmental ordinary differential equations and a fourth-order Runge–Kutta solver. Two published aggregate pharmacokinetic datasets were used as historical anchors: single-dose acyclovir in six anuric individuals undergoing hemodialysis, and five-day intravenous acyclovir treatment in six individuals receiving continuous ambulatory peritoneal dialysis. Published micromolar concentrations were converted to mg/L using acyclovir molecular weight 225.21 g/mol. We also performed parameter-component ablations.

**Results:** For a 70-kg nominal surrogate receiving a single 175-mg intravenous infusion, AyFlux predicted a 1-hour plasma peak of 6.24 mg/L versus the published mean of 8.45 mg/L; predicted 8- and 24-hour concentrations were 2.54 and 1.48 mg/L versus reported means of 2.32 and 1.44 mg/L. Simulated hemodialysis reduced the concentration from 0.655 to 0.282 mg/L over six hours. In the CAPD example, simulated troughs were higher than the published means. Ablation of metabolite formation caused a substantial increase in simulated parent-drug AUC.

**Conclusion:** These initial exercises illustrate the simulator's reproducibility and identify discrepancies and structural sensitivities requiring investigation. They do not establish patient-specific predictive accuracy or support clinical dosing recommendations.

## Introduction

Acyclovir is used for severe herpesvirus infections, and renal excretion is a major determinant of systemic exposure. In kidney failure, terminal elimination is prolonged and drug can accumulate. Intermittent hemodialysis can remove acyclovir from circulation, while peritoneal dialysis has a lower and exchange-dependent clearance. Drug-disposition questions also arise when renal function changes during a treatment course and when the prodrug valacyclovir is administered orally.

Published studies from the early development of acyclovir demonstrated biphasic disposition and described a two-compartment open model. Historic cohorts measured concentration changes in anuric patients receiving hemodialysis and in patients receiving CAPD. These measurements provide useful external anchors for simulation exercises, although their small sample sizes, limited public individual-level observations, and historically variable laboratory methods limit what can be inferred from aggregate comparisons.

AyFlux is a freely available browser-based educational environment for exploring acyclovir exposure. It offers parameterized dosing schedules, compartmental disposition, dialysis timing, an exploratory peritoneal exchange representation, and model-based plasma/CSF/CMMG outputs. This manuscript evaluates reproducibility and structural behavior; it does not introduce a clinically qualified precision-dosing algorithm.

## Methods

### Model type and implementation

The production pharmacokinetic code resides in `public/assets/pk-engine.js`. AyFlux represents acyclovir distribution through central and peripheral compartments with intercompartmental exchange, includes an optional oral valacyclovir-derived depot, and represents formation and removal of the metabolite CMMG. Intravenous infusion, metabolism, kidney-dependent clearance, hemodialysis, CRRT and membrane-transfer representations of PD contribute to time-dependent differential equations. CSF acyclovir and CMMG outputs are lagged partition proxies rather than anatomical CSF mass-balance compartments.

The software uses fourth-order Runge–Kutta numerical integration at a nominal 0.25-hour step, with event boundaries inserted in the simulation timeline. Its Monte Carlo mode samples lognormal parameter multipliers and summarizes ensemble quantiles. Optional observations are used for likelihood-based importance reweighting of the existing simulation ensemble; the calculation is exploratory and has not been established as a calibrated clinical population posterior. The software does **not** implement an independently trained supervised machine-learning model, and should not be described as AI-based dose optimization or a validated PBPK platform.

All quantitative outputs reported here use `draws=1` and `variability=0`, avoiding Monte Carlo variation for deterministic reproducibility. Numeric inputs are model assumptions unless otherwise stated.

### Case study 1: anuric adults receiving hemodialysis

We used aggregate plasma acyclovir measurements reported by Laskin et al. (1982), DOI:10.1038/clpt.1982.83. Six anuric patients received a single intravenous acyclovir infusion of 2.5 mg/kg over one hour. Hemodialysis began approximately 48 hours after the start of infusion and lasted six hours. Published mean concentrations at approximately 1, 8, 24, pre-HD, and post-HD were mapped to simulation hours 1, 8, 24, 48, and 54. A nominal model subject of 70 kg received 175 mg; actual patient covariates were not reconstructed. Acyclovir concentrations were converted from micromolar to mg/L by multiplying by 225.21/1000.

**Important dependency:** the production model's default hemodialysis clearance is 81.8 mL/min, itself based on the Laskin reference. Consequently the HD agreement is not independent validation.

### Case study 2: repeated intravenous dosing during CAPD

We used the six-patient cohort reported by Boelaert et al. (1987), DOI:10.1093/jac/20.1.69. Participants received a one-hour infusion of 2.5 mg/kg once daily and underwent continuous ambulatory peritoneal dialysis; the study reported a mean weight of 60 kg. AyFlux simulated five 150-mg daily doses, four six-hour exchanges per day, zero residual creatinine clearance and an illustrative PD transfer clearance input of 6 mL/min. Published approximate day-1 and day-5 mean peaks and troughs were converted from micromolar to mg/L. Because publication-level summaries omit individualized dwell histories and full timing information, these are illustrative comparisons and not individual-level fits. The original study found that a three-compartment model was needed to explain its profiles, an important structural difference.

### Structural ablations

With the nominal hemodialysis case held fixed, we evaluated: (i) removal of the HD session, (ii) setting central-peripheral exchange Q to zero, (iii) setting CMMG formation clearance to zero, and (iv) setting both CSF proxy partition coefficients to zero. These are controlled perturbations of the existing parameterization, **not re-estimated nested models**. In particular, eliminating CMMG formation also removes the parent-drug elimination associated with that pathway, so increases in acyclovir exposure are expected. No ablation was tested for superior predictive performance in an independent cohort.

### Independent model comparisons — not yet complete

The repository contains `interop/compare_mrgsolve.R` and `interop/compare_ospsuite.R`. The former is a separately implemented solver-comparison workflow using shared equations and parameters; successful agreement would test numerical implementation parity, not independently identify or validate PK parameters. The latter can export an Open Systems Pharmacology aciclovir example, but the default PBPK subject and regimen have not been matched to AyFlux, so a clinically interpretable RMSE cannot yet be reported. These comparisons should be executed, versioned, and inspected prior to submission.

## Results and Discussion

### Case study 1: hemodialysis

| Time from dose | Published mean (mg/L) | AyFlux nominal (mg/L) | Relative difference |
| --- | ---: | ---: | ---: |
| 1 h | 8.445 | 6.242 | −26.1% |
| 8 h | 2.320 | 2.543 | +9.6% |
| 24 h | 1.441 | 1.475 | +2.4% |
| ~48 h, pre-HD | 0.617 | 0.655 | +6.1% |
| ~54 h, post-HD | 0.250 | 0.282 | +12.7% |

AyFlux captured the approximate concentration decline and dialysis-associated change in this nominal example, but underestimated the infusion-end peak relative to the aggregate mean. The modeled concentration reduction across the HD window was 57.0%, versus approximately 59.5% when calculated from the reported pre/post study means. The published peak standard deviation was large, and group means should not be treated as individual patient trajectories. Moreover, the dialysis-clearance parameter was informed by the same study; apparent agreement during HD is therefore partly expected.

### Case study 2: CAPD

| Treatment day | Metric | Published mean (mg/L) | AyFlux nominal (mg/L) |
| --- | --- | ---: | ---: |
| 1 | Peak | 5.630 | 6.141 |
| 1 | Trough | 0.676 | 1.264 |
| 5 | Peak | 6.531 | 8.052 |
| 5 | Trough | 0.901 | 2.032 |

AyFlux simulated increasing exposures with repeated dosing, but predicted notably higher trough levels than those reported. Possible reasons include differing individual physiology, assumptions about dialysate clearance and exchange timing, protein/metabolite dispositions, and model structure. No single explanation can be identified without patient-level observations and a formal identification or calibration study. These findings are a prompt to scrutinize the current PD representation, not evidence to change clinical prescriptions.

### Ablation findings

For the hemodialysis scenario, full-model plasma AUC from 0 to 64 hours was 87.66 mg·h/L, and peak plasma concentration was 6.24 mg/L.

| Perturbation | AUC (mg·h/L) | Change vs full model | Peak (mg/L) |
| --- | ---: | ---: | ---: |
| Full model | 87.66 | 0% | 6.24 |
| Remove HD | 90.50 | +3.2% | 6.24 |
| Set Q=0 | 99.90 | +14.0% | 7.52 |
| Set CMMG formation=0 | 197.27 | +125.0% | 6.45 |
| Remove CSF proxy | 87.66 | 0% | 6.24 |

The small whole-window AUC effect of HD reflects that dialysis occurred late after a single dose; it should not be generalized to other regimens. Zeroing peripheral exchange changed both distribution and peak magnitude. Removing metabolite formation had a large effect on total modeled parent-drug clearance. By construction, removing the CSF proxy does not change plasma concentrations because there is no CSF-to-plasma feedback.

### Scientific limitations and future work

The datasets are small and aggregate; the cases do not reconstruct original patient-level covariates, exact sampling schedules, or all dialysis prescriptions. Model parameters are partly illustrative and not all derived from a fitted clinical population. The peritoneal mass-transfer framework is explicitly exploratory, not an empirically estimated three-pore or whole-body PBPK model. In addition, the repository has flagged a discrepancy between its exploratory CSF CMMG partition setting and published plasma-CSF metabolite exposure data. The non-kidney CMMG clearance (0.5 L/h at 70 kg) was calibrated on a single published hemodialysis case [5] and checked against an independent single-dose hemodialysis study [6]; CMMG predictions at low kidney function rest on that one calibration, and the CMMG/acyclovir exposure ratio remains below a published population estimate in moderate impairment [7]. CNS and toxicity claims must therefore be especially cautious.

Before submission the study should (1) freeze a software release and parameter table; (2) obtain individual time-concentration data if possible; (3) align exact HD/PD clinical settings and document all shared calibration sources; (4) execute independent mrgsolve and properly matched PK-Sim benchmarks; (5) quantify performance by renal subgroup, modality, and horizon with appropriate uncertainty; (6) add separate calibration and holdout data if parameters are modified; and (7) assess clinical relevance with nephrology/pharmacology coauthors. Human research approval or exemption requirements depend on whether original or identifiable patient-level data are used; public aggregate model comparisons are not equivalent to interventional human research.

## Conclusion

AyFlux offers an accessible environment for studying mechanistic acyclovir pharmacokinetics in changing kidney-function and dialysis scenarios. Initial comparisons demonstrate reproducible model behavior and expose limitations that further scientific work must address. The findings do not establish validated patient-specific exposure forecasts, toxicity thresholds, or clinical dosing recommendations.

## References

1. Laskin OL, Longstreth JA, Whelton A, et al. Acyclovir kinetics in end-stage renal disease. *Clin Pharmacol Ther.* 1982;31:594–601. https://doi.org/10.1038/clpt.1982.83
2. Boelaert J, Schurgers M, Daneels R, et al. Multiple dose pharmacokinetics of intravenous acyclovir in patients on continuous ambulatory peritoneal dialysis. *J Antimicrob Chemother.* 1987;20:69–76. https://doi.org/10.1093/jac/20.1.69
3. Burgess ED, Gill MJ. Intraperitoneal administration of acyclovir in patients receiving continuous ambulatory peritoneal dialysis. *J Clin Pharmacol.* 1990;30:997–1000. https://doi.org/10.1002/j.1552-4604.1990.tb03585.x
4. Smith JP, et al. Pharmacokinetics of acyclovir and its metabolites in cerebrospinal fluid and systemic circulation after administration of high-dose valacyclovir in subjects with normal and impaired renal function. *Antimicrob Agents Chemother.* 2010. https://doi.org/10.1128/AAC.00729-09
5. Helldén A, Odar-Cederlöf I, Larsson K, Fehrman-Ekholm I, Lindén T. Death delusion. *BMJ.* 2007;335:1305. https://doi.org/10.1136/bmj.39408.393137.BE
6. Hara K, Suyama K, Itoh H, Nagashima S. Influence of ALDH2 genetic polymorphisms on aciclovir pharmacokinetics following oral administration of valaciclovir in Japanese end-stage renal disease patients. *Drug Metab Pharmacokinet.* 2008;23:306–312. https://doi.org/10.2133/dmpk.23.306
7. Kably B, et al. Population pharmacokinetics of aciclovir and its major metabolite 9-carboxymethoxymethylguanine and safety profile of valaciclovir in early liver transplant recipients. *J Antimicrob Chemother.* 2025;80(5):1302–1308. https://doi.org/10.1093/jac/dkaf070
8. AyFlux source code, model methods, and release artifact: link to immutable tagged release and repository snapshot to be added before submission.

**Drafting disclosure:** This working text and benchmark-generation code were prepared with assistance from ChatGPT (GPT-6). Human authors must validate all calculations, interpretations, citations, originality, and compliance with the selected journal's AI disclosure policy before using any manuscript text.
