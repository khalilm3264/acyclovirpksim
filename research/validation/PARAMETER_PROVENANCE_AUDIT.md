# AyFlux v0.26.0 parameter provenance and identifiability audit

**Research-only review of `public/assets/pk-engine.js`.** This table separates **literature anchors**, **exploratory assumptions**, and **unidentified parameters**. Merely citing a clinical study does not show that a particular code coefficient was calibrated to that study. The present model is not clinically validated and no values were changed in this audit.

| Parameter or model term | Current code (v0.26.0) | Evidence context | Scientific status and next requirement |
|---|---|---|---|
| Central acyclovir volume | `vc = 0.32 × weight × vcScale` L | Distribution volumes reported in Laskin 1982, Shah 1986 and Boelaert 1987 | **Exploratory population assumption.** Match individual distribution kinetics and dose timing; fitted source V1 is not an independent validation input |
| Peripheral acyclovir volume and intercompartment flow | `vp = 0.37 × weight` L, `q = 10 × (weight/70)^0.75` L/h | Two-compartment systemic model used in renal PK literature | **Illustrative.** Compartment labels alone do not establish equality of exchange coefficients between studies |
| Parent renal acyclovir elimination | `CL_renal = 0.202 × CrCl × (weight/70)^0.75` L/h | Acyclovir renal elimination involves filtration and secretion | **Hypothesis.** Check absolute CrCl scaling and no-kidney edge case; differentiate creatinine clearance from measured *acyclovir* renal clearance |
| Parent nonrenal / formation losses | `other = 0.12 × weightScale` and `form = 1.6 × formFactor × weightScale` L/h | Laskin/Shah/Boelaert indicate nonrenal elimination contributes substantially in ESRD | **High-priority source audit.** The formation clearance also controls circulating CMMG production and plasma parent loss; cannot tune one outcome independently |
| Oral valacyclovir systemic availability | `valF = 0.545` | Oral label-based acyclovir bioavailability after valacyclovir, anchored around 1-g dosing | **Partially anchored.** The Smith 2010 regimens use 1.5–2 g per dose; a constant-F extrapolation needs validation |
| Oral absorption rate | `valKa = 1.8 h^-1` | Source document does not supply a uniquely matched absorption parameter for this implementation | **Illustrative**, not subject-specific |
| Circulating CMMG distribution | `vm = 0.4 × weight` L | Relevant serum measurements in Smith 2010 and Helldén 2003 | **Not directly fitted to these cohorts.** Estimate/identify with serial metabolite profiles |
| CMMG renal / nonrenal elimination | `mr = 0.12 × CrCl × weightScale × metRenal`, `mn = 0.25 × weightScale` L/h | Kidney dysfunction strongly raises CMMG systemic exposure | **High-priority model identification.** Normal and CKD cohorts react differently to formation/renal-clearance changes |
| HD clearance | `hdCl = 81.8` mL/min | Laskin 1982 observed mean dialytic acyclovir clearance near 81.8 mL/min | **Evidence-anchored reference** but reusing the same source as a benchmark does not independently validate this default |
| PD transport input | `pdCl = 6` mL/min converted to `p.pd=0.36` L/h | PD mean *apparent clearance* is 4.4 mL/min in Shah 1986, 3.4 mL/min in Burgess 1990 | **Not the same estimand.** `p.pd` is an effective membrane transfer coefficient in a bidirectional flux equation, not net drug clearance in collected dialysate |
| PD convection, UF and return flux | `pdSmallPore=0.5`, `pdSigma=0.12`, `pdUfBase=120` mL/h, `pdAbsorb=20` mL/h and glucose-decay class `tau` | Physiological three-pore principles reviewed by Morelle et al. 2021 | **Exploratory**, not an experimentally fitted three-pore model. Distinguish actual patient effluent volume, peritoneal membrane class, and net small-solute transport |
| PD exchange prescription | Per-exchange dwell, fill volume, glucose, optional measured net UF | Studies report CAPD schedules; Shah's exact individual exchanges/effluent often unavailable | **User-entered physical protocol**; numerical agreement depends on faithful prescription matching |
| CMMG removal during PD | `(midPD ? p.pd : 0) × metDial × CMMG_plasma` | Very limited matched CMMG dialysate measurements in the provided studies | **Unvalidated shortcut.** Does not use a modeled CMMG dialysate concentration, gradient or drained metabolite mass. Do not interpret as measured CMMG removal |
| Acyclovir CSF partition | `csfRatio = 0.3` | Smith 2010 acyclovir CSF/plasma AUC ratios roughly 0.27 | **Approximately anchored in magnitude**, but K in a delayed concentration filter is not identical to empirical AUC ratio under all dosing conditions |
| Acyclovir CSF equilibration | `csfLag = 4` hours | Smith 2010 observed relatively flat CSF versus plasma profiles | **Illustrative**; time delay unidentifiable from summary AUC ratio alone |
| CMMG CSF partition | `csfMetRatio = 0.25` | Smith 2010 measured `AUC_CSF / AUC_plasma ≈ 0.025` for CMMG | **Priority P0 discrepancy (~10-fold).** Research-only 0.025 scenario reduces exposure discrepancy but plasma CMMG and parent acyclovir remain mismatched |
| CMMG CSF equilibration | `csfMetLag = 6` hours | Smith 2010 and Lindström 2019 report time profiles/CSF concentrations | **Illustrative**, joint lag/ratio identifiability remains unresolved |
| Barrier disruption | No explicit BBB or blood–CSF physiology, no observed QAlb covariate | Lindström 2019 associates higher CSF drug/metabolite levels with albumin quotient during CNS infection | **Research hypothesis only.** QAlb regression coefficients are associations, not rate constants or causal multipliers |
| CRRT | Effluent `25` mL/kg/h × sieving `0.95` × delivered `0.85` | Physical removal principles; not fully source-matched to individual acyclovir CRRT studies | **Exploratory**, unvalidated delivered/effluent model for the intended populations |
| Monte Carlo parameter uncertainty | `drawParams` uses illustrative lognormal CVs | Intended educational exploration | **Not a calibrated population PK posterior or guaranteed 90% clinical prediction interval** |

### Model-state and mass-accounting boundaries

- The model solves central and peripheral acyclovir amounts, systemic CMMG amount, oral depot and peritoneal dialysate acyclovir amount with an event-aware RK4 solver.
- CSF acyclovir and CSF CMMG are delayed concentration **outputs**, not physical compartments that exchange finite drug mass with the systemic states; no physiologically specified brain parenchyma.
- The `trackMassBalance` module audits acyclovir-equivalent flow via renal/nonrenal/formation/extracorporeal routes and PD-drained acyclovir; **it does not independently audit CMMG metabolite mass disposition**.
- Solving the ODE accurately cannot compensate for misspecified coefficients. Every proposed coefficient change must be subjected to the full frozen reference suite and new independent measurements.

### Highest-priority scientific checks

1. Estimate ACV formation/clearance and CMMG formation/clearance *jointly*, across at least two renal-function cohorts, with a prespecified statistical objective and uncertainty.
2. Confirm that 1.5–2 g oral valacyclovir dosing is not being extrapolated through inappropriate fixed-F bioavailability.
3. Evaluate apparent PD clearance `M_PD_drained/AUC_plasma` and exchange-specific effluent drug mass, not only `pdCl` input and 5-day cumulative recovery.
4. Distinguish CSF penetration in uninfected/CKD populations from the effect of active CNS infection and observed QAlb. Require new independent data before adding a research-only QAlb multiplier.
5. Build separate CMMG-PD kinetics if the scientific question requires **metabolite dialysate clearance**, otherwise label existing CMMG-dialysis output as exploratory.

**Primary source trail:** [Laskin 1982](https://pubmed.ncbi.nlm.nih.gov/7075109/) · [Shah 1986](https://doi.org/10.1016/S0272-6386(86)80193-7) · [Boelaert 1987](https://doi.org/10.1093/jac/20.1.69) · [Burgess & Gill 1990](https://doi.org/10.1002/j.1552-4604.1990.tb03585.x) · [Smith 2010](https://doi.org/10.1128/AAC.00729-09) · [Lindström 2019](https://doi.org/10.1093/jac/dkz357).

This document is a working parameter audit, not a claim that every default can be derived from a cited article. It is a research artifact to review with the supervising pharmacology team before altering the public simulator.
