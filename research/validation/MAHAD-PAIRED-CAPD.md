# Mahad 2005: paired ACV/CMMG observations during CAPD

## Primary observations and units

Mahad DJ, et al. *Aciclovir induced posterior leucoencephalopathy*. J Neurol Neurosurg Psychiatry. 2005;76:1308–1309. [DOI10.1136/jnnp.2004.059824](https://doi.org/10.1136/jnnp.2004.059824), [PMID16107379](https://pubmed.ncbi.nlm.nih.gov/16107379/), [PMC1739775 primary report](https://pmc.ncbi.nlm.nih.gov/articles/PMC1739775/). The printed right column on p.1308 was visually checked: concentrations are **μmol/L**, despite extraction losing the μ glyph. Source PDF SHA-256 `dcb5b84a17e426f1321c11aa6e8bbd2d40a8ea346c5a24cc245df84d45e8d32a`.

A 47-year-old woman with end-stage renal failure on CAPD received IV ACV **250 mg three times daily** for zoster. ACV was discontinued after eight days; CAPD continued. No rescue intermittent HD is reported. Weight, measured residual renal clearance, infusion durations, exact administrations and draw clocks, exchange volumes/times, delivered UF and dialysate concentrations are not supplied. Serum creatinine is not a measured CrCl.

| Day after ACV initiation | Specimen | ACV, μmol/L | CMMG, μmol/L | ACV, mg/L | CMMG, mg/L | CMMG:ACV molar ratio |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 4 | CSF | 5.99 | 2.25 | 1.3490 | 0.5382 | 0.3756 |
| 5 | Serum | 34.9 | 91.7 | 7.8598 | 21.9337 | 2.6275 |
| 6 | Serum | 35.4 | 148.5 | 7.9724 | 35.5197 | 4.1949 |
| 7 | Serum | 17.2 | 141 | 3.8736 | 33.7258 | 8.1977 |

Conversions use ACV225.21 and CMMG239.19 g/mol. These are paired analytes in each reported specimen; they are not four contemporaneous serum/CSF pairs. **No simultaneous CSF:serum ratio can be calculated.** The prose labels days6/7 “post-aciclovir” after explicitly identifying day5 as post-initiation; the eight-day course supports a treatment-day reading, not days after withdrawal. No exact last-dose offset is recovered.

## Provenance and duplicate check

Current research files and PR identifiers were checked before adding this comparison. The Newcastle Mahad case is treated separately from [Helldén2006, DOI10.1093/jac/dkl067](https://doi.org/10.1093/jac/dkl067): its Table1 symptomatic subjects13–21 include women aged63 and59; the47-year-old is male receiving oral ACV, unlike this47-year-old woman receiving IV ACV on CAPD. That report describes Swedish/Israeli sites. [Helldén2003, PMID12748346](https://pubmed.ncbi.nlm.nih.gov/12748346/) concerns Swedish hospital referrals during1991–mid1999. The2006 methods identify previously reported serum results apart from subjects20/21; those reused observations must not be counted as new independent serum evidence. Shared authors or an assay laboratory alone do not establish that the Newcastle case belongs to either cohort. No pooled cohort count is changed here.

## Frozen-engine comparison

Run `node research/validation/mahad-paired-capd.cjs`. This is a separate research source comparison, included in the source-comparison CI artifact. Engine blob is `17971df66e0a97b4d382572a582d35c444a3c83f`; no parameters are changed or fitted to the observations. The existing adult engine exposes plasma ACV/CMMG and lagged CSF ACV/CMMG outputs. Serum observations are compared with its plasma compartment, preserving that matrix mapping assumption. An IV course and manual CAPD are supported; this patient's actual exchange/dose history is not reconstructable.

The nominal illustration assumes 70kg, CrCl0mL/min, 250mg IV every8h over1h, 24 doses beginning at t0, with CAPD four2L exchanges/day, six-hour dwells, and all other PD/transport/CMMG/CSF defaults retained. Dosing continues through eight days; no normalization, state reset, extra clearance, missed dose or empiric withdrawal is inserted to match a draw. Sampling at day×24h is a reference clock assumption, not an observed predose clock.

| Observation | Nominal modeled ACV/CMMG, mg/L at a common time | Observed ACV/CMMG, mg/L |
| --- | ---: | ---: |
| Day4 CSF, t96h | 4.3792 / 0.6570 | 1.3490 / 0.5382 |
| Day5 serum, t120h | 13.1012 / 28.9951 | 7.8598 / 21.9337 |
| Day6 serum, t144h | 13.1842 / 30.1538 | 7.9724 / 35.5197 |
| Day7 serum, t168h | 13.2176 / 30.7611 | 3.8736 / 33.7258 |

Step halving from0.125h to0.0625h changes these nominal outputs by at most0.00185mg/L. This numerical check does not validate the clinical assumptions or every nuisance-grid point.

## Shared-time sensitivity, not separate-analyte matching

A predefined illustrative grid uses weight50/70/90kg, constant CrCl0/5mL/min, CAPD3/4/6 exchanges/day with dwells24/exchanges hours and2L fills, and IV infusion0.5/1h: **36 continuous trajectories**. These are selected sensitivities, not measured patient covariates or defensible patient-specific uncertainty bounds. PD clearance/transport, glucose2.5%, CMMG formation/removal and CSF parameters retain production defaults.

Unknown clocks are explored on a0.25h grid. Two day-label conventions are kept separate: a calendar-day window [(day−1)×24, day×24]h and an elapsed-day window [day×24,(day+1)×24]h. Endpoints are included as boundary sensitivities. The report does not establish that either convention describes the original draws. One convention applies to the whole trajectory; the analytes of every specimen always share **one identical model time**. Neither ACV nor CMMG gets an independently selected matching phase.

The program reports marginal ranges for context but evaluates a pair by its worse multiplicative discrepancy, max(predicted/observed,observed/predicted) across both analytes at that common time. It also reports the most favorable serum-course scenario using a single weight/CrCl/CAPD/infusion/convention for days5–7, while allowing the unknown draw phase to differ by day. This retrospective nuisance-time search is an optimistic descriptive sensitivity, not a fitted dosing recommendation or a prespecified external-validation score.

| Day/specimen | Modeled ACV marginal range, mg/L | Modeled CMMG marginal range, mg/L | Modeled paired molar-ratio range | Observed molar ratio |
| --- | ---: | ---: | ---: | ---: |
| Day4 CSF | 2.3105–6.3931 | 0.2299–0.8553 | 0.0750–0.1594 | 0.3756 |
| Day5 serum | 6.4919–29.7617 | 10.0138–35.5866 | 0.5754–2.2833 | 2.6275 |
| Day6 serum | 6.5220–29.7976 | 10.2802–36.0424 | 0.5807–2.3400 | 4.1949 |
| Day7 serum | 6.5304–29.8109 | 10.3790–36.2481 | 0.5822–2.3725 | 8.1977 |

Marginal extrema cannot be combined into a hypothetical simultaneous pair. In particular, day7 measured CMMG lies inside its marginal range, but measured ACV is below the tested parent range and the observed paired molar ratio8.20 is well above the modeled maximum2.37. Allowing both analytes their own clock would conceal this mismatch.

The best common serum-course scenario in this selected grid is50kg, CrCl5, four exchanges/day and0.5h infusions with the calendar-day convention. Its optimistically selected common draw times116.5/139/152h give ACV/CMMG11.847/14.536,13.496/14.673 and9.460/14.006mg/L, respectively; its worst pair discrepancy is2.442-fold. This is **not** a supported estimate of this patient's weight, renal function or sampling times. CSF is evaluated separately; its most favorable paired discrepancy is2.012-fold and does not justify changing the default CSF partition.

## What the engine supports

The frozen model supports a reproducible comparison of ongoing IV parent/metabolite trajectories with day-labeled paired observations, retaining timing ambiguity and a separate CSF assessment. It does **not** reproduce all these paired values within the selected assumptions. Unknown dose/exchange delivery, distribution, residual clearance, metabolite kinetics and CSF transport prevent identifying a causal parameter from the mismatch. No CAPD extraction fraction, individual circuit clearance, rebound fraction, toxicity threshold or clinical accuracy claim is inferred. No cohort/endpoint is added to the pooled scorecard, and no model parameter is tuned. The source-level duplicate check above keeps this Newcastle case separate while preserving the documented reuse within the Helldén reports.
