# Mechanistic follow-up: CAPD trough bias and CMMG/CSF barrier (2026-11-09)

**Status:** Investigative sensitivity experiments run through the unchanged AyFlux v0.26.0 canonical JavaScript engine. **Not independent predictive validation, not approved for patient care.** Neither the production model nor published defaults have been changed.

## I. Source-grounded interpretation

**Boelaert et al. (1987), J Antimicrob Chemother. 20:69–76.** DOI: https://doi.org/10.1093/jac/20.1.69

The three-compartment structure in the study is **plasma, peripheral systemic tissue and peritoneal dialysate**. Thus it is NOT accurate to claim AyFlux's two systemic compartments lack a third systemic compartment. The comparison involves differences in parameterization, return transport and elimination.

- Table I lists author-**fitted** day-1/day-5 plasma concentrations derived from simultaneous fits of measured plasma and dialysate data. They are **not held-out** observed concentrations.
- Table II supplies individual V1, K10, K13 and K31 values.
- The nominal AyFlux transfer PS at 6 mL/min = 0.36 L/h. For a 2 L dialysate volume its approximate diffusive back-transfer constant is 0.18 /h. Boelaert's fitted K31 values for subjects 1, 4, 5 were 0.434, 0.647 and 0.421 /h. Differences are suggestive, but AyFlux's convection, fluid changes and exchange equation make these imperfectly matched parameter definitions.
- Boelaert K10×V1 implies nonperitoneal clearances of approximately 1.591, 2.792, and 2.192 L/h for subjects 1, 4 and 5, versus nominal AyFlux weight-scaled non-PD clearance of 1.266, 1.513, and 1.296 L/h. **This is a concrete explanation for trough accumulation under nominal parameters**, but K10 was fitted to the same source observations.

### Mechanistic results

| Subject | Source fitted day-5 trough (mg/L) | Frozen model (mg/L) | Model with only source-fitted K10 clearance (mg/L) | Published PD recovery (%) | Frozen PD recovery (%) | Recovery after source-fitted K10 match (%) |
|---|---:|---:|---:|---:|---:|---:|
| 1 | 1.419 | 1.744 | 1.254 | 10.6 | 12.90 | 11.02 |
| 4 | 0.676 | 2.002 | 0.763 | 13.6 | 10.85 | 6.94 |
| 5 | 0.653 | 1.906 | 0.838 | 12.3 | 12.61 | 8.64 |

**Important result:** Changing K10-related clearance can greatly reduce the plasma error but makes predicted PD recovery worse in subjects 4 and 5. A fit that focuses on plasma alone would be misleading. Both plasma and dialysate must be fit/tested jointly, with independent held-out data.

Increasing the notional PD PS from 0.36 to 1.002 L/h (pdCl: 6 to 16.7 mL/min) changes subject 4's trough only from 2.002 to 1.884 mg/L and increases its predicted dialysate recovery from 10.85% to 15.51%. Changing the dialysate transport coefficient alone cannot explain the high trough.

A source-assisted combined variant (K10, V1, higher PS) produced subject-4 day-5 peak 4.959 mg/L against source-fitted 4.955 mg/L, yet trough remained 0.880 vs 0.676 mg/L and predicted recovery was 9.85% vs observed 13.6%. This illustrates **partial fit and non-identifiability**, not validation.

## II. Smith 2010: CSF CMMG partition and kinetics

Smith et al. (2010), *Antimicrob Agents Chemother.* 54:1146–1151. DOI: https://doi.org/10.1128/AAC.00729-09

Smith measured average steady-state AUC values for six participants with normal renal function and three with chronic renal impairment, with dense CSF sampling. The study’s CMMG CSF-to-plasma AUC ratios were ~0.025 (normal: 0.42/17=0.0247; CKD: 3.8/148=0.0257), whereas AyFlux v0.26 has an exploratory `csfMetRatio: 0.25` default (10x higher).

Test: run the same fifth-dose nominal oral valacyclovir experiments through AyFlux (`normal: 2g every 6h x5, CrCl=100 mL/min`; `CKD: 1.5g every 12h x5, CrCl=20 mL/min`; 70 kg; all other unchanged v0.26 defaults). These are **nominal representatives** rather than the nine measured individuals.

| Group | Observed CMMG plasma AUC (mg h/L) | AyFlux plasma AUC | Observed CSF CMMG AUC (mg h/L) | AyFlux original 0.25 | AyFlux hypothetical 0.025 |
|---|---:|---:|---:|---:|---:|
| Normal renal function | 4.066 | 4.786 | 0.1005 | 1.171 | 0.117 |
| CKD | 35.400 | 62.067 | 0.909 | 15.260 | 1.526 |

The 0.025 hypothetical coefficient reduces ~10-fold CSF CMMG overprediction. **It does not fix the CKD plasma CMMG overprediction (+75%).**

At CSF partition 0.025, testing formation factor 0.5 yields CKD plasma CMMG AUC 35.80 and CSF CMMG AUC 0.877, close to published means; however, the identical reduction in the normal-function scenario yields plasma CMMG AUC 2.48 versus a published 4.07. This **disqualifies simply halving formation globally as a validated correction**. Age, true body size, individual CrCl, dosing history, CMMG metabolism and renal elimination remain incompletely identified.

Varying lag at fixed CSF partition 0.025 from 2 h to 24 h shifted CKD CSF CMMG AUC from 1.546 to 1.230 mg h/L. Both partition coefficient and equilibration rate must be assessed, but neither can be fully identified from aggregate means.

## III. Lindström 2019 and the blood-CSF/blood-brain barrier

Lindström et al. (2019), *J Antimicrob Chemother.* 74:3565–3572. DOI: https://doi.org/10.1093/jac/dkz357

The investigators observed 21 people receiving acyclovir/valacyclovir for herpesvirus CNS infection (34 CSF samples). Increased CSF:serum **albumin quotient** (a marker of barrier dysfunction) was *associated with* increased CSF ACV and CMMG after adjustment.

Table 2 reports +0.388 µmol/L CMMG in CSF and +1.499 µmol/L ACV in CSF per 10-unit increase in the albumin quotient (the albumin variable is expressed in units of 10^-3), with covariates including dose, weight, and kidney function. These are statistical associations in infected patients, not causal permeability multipliers that can be inserted directly into an ODE.

**Distinguish three ideas:**
- Smith studied **CSF penetration without documented CNS infection**, showing ~0.025 CMMG ratio and little CKD-related variation in this ratio.
- Lindström studied **active CNS infection with varying barrier dysfunction**, finding CMMG/ACV CSF concentrations associated with albumin quotient.
- CSF samples do **not** directly measure brain parenchymal or intracellular drug exposure. The blood-brain and blood-CSF barriers are related but different physical interfaces. Data do not prove CMMG causes neurotoxicity.

## IV. Proposed next research steps (not released)

1. **Separate plasma parent and metabolite calibration** from CNS distribution: require plasma ACV and CMMG agreement in normal and CKD cohorts before interpreting CSF.
2. **Use a clearly-labeled hypothesis for CSF partition near 0.025**, and vary the CSF equilibration lag; retain archived original 0.25 outputs. Changes require PI review and versioned model documentation.
3. **Develop an optional research-only barrier sensitivity parameter**, not a patient-specific BBB adjustment from albumin quotient unless prospectively calibrated and validated.
4. **Jointly evaluate plasma and PD dialysate measurements**, and compare resulting net removals with drug drainage. Do not “fix” a trough by borrowing the fitted study K10 as though it were external evidence.
5. Keep any neurotoxicity values as *observational associations*, not diagnostic thresholds, clinical alerts or dose rules; hold off on personalized toxicodynamic predictions.

### Reproducibility

Run from repository root:
```bash
node research/validation/mechanism-sensitivity.cjs mechanism-study.json
```

The isolated research script uses the same `public/assets/pk-engine.js` as the live app, with **no changes to production pharmacokinetic equations or defaults**. GitHub Actions research job provides all detailed per-patient sensitivity results.

Study script: `mechanism-sensitivity.cjs`. Branch: `research/capd-cmmg-mechanisms-20261109`. **Do not merge findings as validated release behavior without scientific review.**
