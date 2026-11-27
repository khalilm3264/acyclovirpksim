# New literature evidence: dialysis, CSF exposure, CMMG neurotoxicity and treatment-claim boundaries

**Literature received 2026-11-09; research-only evidence review.** Applies to the **unchanged** AyFlux v0.26.0 JavaScript engine and the draft mechanism research branch. No changes to production PK constants, dashboards, warnings, or the journal manuscript.

## Eight uploaded studies — role in AyFlux research

| Study | Study type and measured evidence | Research use | Limitations / avoid |
|---|---|---|---|
| **Vasquez Vasquez et al. 2024**, *Neurotoxicity from Inordinate Valacyclovir Dosage...*, [preprint DOI](https://doi.org/10.22541/au.173382487.72578057/v1) | Non-peer-reviewed case report: 69-y female, 49.9 kg, stage-5 CKD, oral valacyclovir 1 g three times daily before presentation; two HD sessions (2h and 2.5h), dialysate blood flows 500/250 mL/min; blood acyclovir 8.8 to 3.2 mg/L after first HD; **66.6 mg estimated from collected dialysate time-concentration curve during second HD**; urinary recovery 17.7 mg across 30h | **High-value external HD mass-removal constraint** and fluid-vs-native renal balance; can inspect post-HD rebound/initial body burden assumptions | Single-patient case and **preprint**. Its estimated body burden 580.3 mg uses an assumed Vd=1.32 L/kg, not independently measured tissue content. Separate manuscript Table 1/figure supplements are linked but not embedded in the supplied PDF. Need actual timing and supplemental serial values for rigorous prospective simulation |
| **Bodilsen, Nielsen & Whitley 2019**, *Valaciclovir therapy for herpes encephalitis: caution advised*, [DOI](https://doi.org/10.1093/jac/dky568) | Expert commentary reviewing CSF concentrations and dose/exposure examples | Corrective citation for interpreting what drug concentrations **do not prove** | Opinion/critical review, **not** a new PK cohort. Do not infer valacyclovir is interchangeable with IV acyclovir for HSV encephalitis or that CSF concentration >in vitro IC50 establishes efficacy |
| **Pouplin et al. 2011**, *Valacyclovir for herpes simplex encephalitis*, [DOI](https://doi.org/10.1128/AAC.01023-10) | Nine enrolled, treated oral valacyclovir **1 g every 8h**; 2-h-after-dose mean plasma acyclovir **23.7, 28.1, 29.1, 29.5 µM** and CSF **3.6, 6.5, 4.2, 3.5 µM** on days 0, 2, 10, 20. Albumin quotient vs CSF ACV correlation r=0.53 (p=.02) | Distinguishes **longitudinal CNS-infection course** from fixed CSF partition; tests 2-h samples on days 0/2/10 against unchanged AyFlux | Small, changing sample set with deaths/withdrawals. CSF ratio is a **single-timepoint** quotient, not steady-state AUC ratio. Its high CSF exposure and virologic outcomes do not validate comparative clinical efficacy. Day-20 exceeds model horizon and is therefore **not simulated** |
| **Helldén et al. 2006**, *The aciclovir metabolite CMMG is detectable in the CSF...*, [DOI](https://doi.org/10.1093/jac/dkl067) | Retrospective: **9 symptomatic vs 12 asymptomatic** subjects. CSF CMMG detectable **0.6–7.0 µmol/L** in symptomatic group, below **0.5 µmol/L** quantification in asymptomatic group | Supports CMMG-CSF relevance, distinguishing systemic production, CNS access and observed symptoms | Observational selected case series, very different renal statuses, doses and sampling times. Not proof CMMG causes neurotoxicity; NOT a validated universal diagnostic or toxicity threshold. **Unit verification:** PDF's body text extraction occasionally shows `mmol/L` for CMMG due to font encoding; **Figure 2 axis and LOQ use µmol/L** |
| **Lycke, Malmström & Ståhle 2003**, *Acyclovir levels in serum and cerebrospinal fluid after oral administration of valacyclovir*, [DOI](https://doi.org/10.1128/AAC.47.8.2438-2441.2003) | 10 people with MS and **no documented damaged blood–CSF barrier**, oral valacyclovir **1000 mg every 8h for 6 days**. Serum peak **27.1±5.6 µM**, serum 2h **23.5±5.7 µM**, 8h **3.1±1.1 µM**; CSF 2h **2.5±0.9 µM**, CSF 8h **2.3±0.7 µM**. **CSF:serum AUC ratio 19±3%** | **Best added direct model benchmark for steady-state oral valacyclovir/acyclovir CSF**. Tests simultaneous plasma PK and near-flat CSF over the same dosing interval | Partial observation schedule (two CSF draws in interval); mean covariates, not matched individuals. AUC ratio ~19% differs from point ratios 11% at 2h and 74% at 8h: do not equate these statistics |
| **Lycke et al. 1989**, *Acyclovir concentrations in serum and cerebrospinal fluid at steady state*, JAC 24:947–954 | **Oral acyclovir**, 800 mg TID, monthly longitudinal samples in MS and two intensive 8-h profiles; reported mean CSF ~**0.83 µM** despite fluctuating serum and no evidence of progressive CSF accumulation | Qualitative support for slow CSF equilibration and prolonged oral dosing without CNS accumulation | **Not an AyFlux supported route**: cannot call 800 mg oral acyclovir an equivalent oral valacyclovir dose; do not label as direct simulator validation |
| **Sadjadi, Regmi & Chau 2018**, *Acyclovir neurotoxicity in a peritoneal dialysis patient...*, [DOI](https://doi.org/10.12659/AJCR.911520) | Clinical case of ESRD on PD with neuropsychiatric symptoms during acyclovir treatment, switched to **two 4-h hemodialysis sessions** with improvement; includes laboratory notes and literature review | Motivates **dialysis modality switching** and safety context | Case report, limited temporally anchored plasma/drained dialysate observations; cannot use symptoms as model-derived toxicity thresholds or prove drug causal mechanism |
| **Almond et al. 1995**, *Avoiding acyclovir neurotoxicity in chronic renal failure undergoing haemodialysis*, *Nephron* 69:428–432 | **7 oliguric HD patients**, each given **one 800-mg oral acyclovir tablet** after HD; mean peak **12.54±1.76 µM at 3h**, elimination half-life **20.2±4.6 h**, **51±11.5%** of drug remaining at 48h removed by HD | Measured HD exposure/removal reference with subject-level concentrations; valuable if an explicit oral-acyclovir route is added in future | **Oral acyclovir is not equivalent to oral valacyclovir** and is not currently simulated. The study's apparent PK parameters are not corrected for bioavailability; dose proposals and legacy “therapeutic” concentration thresholds are not present-day clinical validation evidence |

## Direct uncalibrated JS-engine source experiments

Script: [`csf-acyclovir-cohorts.cjs`](csf-acyclovir-cohorts.cjs); CI artifact `csf-acyclovir-cohort-results.json`.

The nominal comparison uses the same frozen AyFlux engine, 69-kg body weight, age 31, manually entered CrCl 110 mL/min, oral **valacyclovir** 1 g q8h, and one deterministic parameter draw. Lycke 2003 reports study **means**, not a single such subject.

| Lycke steady-state checkpoint | Published (µM) | AyFlux current CSF K=0.3, lag 4h (µM) | AyFlux lag 8h (µM) |
|---|---:|---:|---:|
| Plasma acyclovir 2h | 23.5 | **13.59** | 13.59 |
| Plasma acyclovir 8h | 3.1 | **1.34** | 1.34 |
| CSF acyclovir 2h | 2.5 | **3.62** | 3.09 |
| CSF acyclovir 8h | 2.3 | **1.49** | 2.01 |
| CSF 2h – 8h amplitude | 0.2 | **2.13** | 1.08 |
| CSF:plasma AUC ratio | 0.19 | 0.30 | 0.30 |

**Implication:** We cannot infer that matching a steady-state AUC partition alone establishes CSF *time-course* validity. Increasing equilibration lag makes modeled CSF flatter but does not fix systemic plasma concentration mismatch. Adjusting CSF permeability before systemic PK is validated could mask errors.

The Pouplin 2011 comparison uses the same nominal settings, with source 2-hour-after-dose observations on day 0, 2 and 10 (day 20 beyond the model's current **336h maximum horizon**).

| Encephalitis course | Published day 2 | Published day 10 | Frozen AyFlux day 2 | Frozen AyFlux day 10 |
|---|---:|---:|---:|---:|
| 2h plasma acyclovir (µM) | 28.1 | 29.1 | **13.59** | **13.59** |
| 2h CSF acyclovir (µM) | **6.5** | **4.2** | **3.62** | **3.62** |
| Day2-to-day10 CSF change | **−35.4%** | — | **≈0%** | — |

**Implication:** A constant CNS partition and equilibration parameter cannot reproduce the observed longitudinal decrease **under a fixed stable plasma scenario**. However, the reported mean change may reflect changing participants and disease physiology, and is *not* proof of barrier healing or an identified transport law.

### Mechanistic hypothesis to evaluate without deploying

At minimum, future source-based tests can consider: (a) a constant-barrier negative-control, (b) a bounded gradual decline in an **exploratory** CSF partition coefficient after an infection-related peak, and (c) separate sensitivity of systemic oral exposure and CSF equilibration rate. Report all assumptions rather than selecting coefficients to match only these observations. Add no automatic infection or toxicity patient classification.

## Clinical and research boundary

- **The blood–brain barrier and blood–CSF barrier are not identical.** CSF is a measured *proxy*; AyFlux does not model brain parenchymal drug concentrations.
- Time-varying CSF levels in small infectious cohorts support a **new scientific question**, not a licensed oral route alternative or a dose calculator for encephalitis.
- Helldén 2006 and Vasquez 2024 address observed neurotoxicity, but they do **not** provide validated universal thresholds for serum or CSF acyclovir/CMMG.
- The 2024 Vasquez manuscript is explicitly a **preprint**; the link-only supplemental figure and table should be obtained before patient-matched extraction or claims about serial drug removal.
- Do not silently introduce oral acyclovir or other excluded medications; new research validations must use supported routes.
- The **manuscript is deliberately unchanged**, pending later review with Dr. Hammouda.

### Immediate next research tasks

1. Check systemic valacyclovir absorption and availability at 1 g before interpreting the Lycke/Pouplin CSF mismatch.
2. Analyze CSF lag/partition **jointly** across the healthy and encephalitis datasets, without treating group means as patient-level calibration.
3. Extract Vasquez's **supplemental Table 1** to obtain real dialysate measurements and check dialytic mass removal independently of fitted body distribution volume.
4. Compare Almond 1995 only after implementing and validating oral acyclovir in a separate, explicitly reviewed future scope—**do not substitute valacyclovir**.
5. Combine the normal/CKD CMMG cohort (Smith 2010), barrier dysfunction associations (Lindström 2019), and symptomatic CMMG observations (Helldén 2006) as *separate evidence layers*, not a single direct toxicity predictor.

This addendum complements [the research notebook](RESEARCH_NOTEBOOK_2026-11-09.md) and [parameter audit](PARAMETER_PROVENANCE_AUDIT.md).
