# Lindström 2019: CSF CMMG with intact and disrupted blood–brain barrier (#47)

Lindström J, Helldén A, Lycke J, Grahn A, Studahl M. *J Antimicrob Chemother.* 2019;74:3565–3572. [doi:10.1093/jac/dkz357](https://doi.org/10.1093/jac/dkz357), reference [4]. Table 1 gives paired serum and CSF acyclovir and CMMG for 34 samples from 21 patients treated for herpesvirus CNS infection, with each sample's CSF:serum albumin ratio, a marker of blood–brain barrier damage.

**Since the #47 model change, AyFlux's default is 0.025** (see `MODEL-CHANGE-47.md`); this benchmark was written before it and compares candidate values explicitly. Reproduce with `node research/validation/lindstrom-csf.cjs`; the table is in `data/lindstrom2019-table1.csv` and the results in `lindstrom-csf-results.json`. Lindström is an independent check of the intact-barrier value derived from Smith 2010. The disrupted-barrier subset was subsequently used to select the exploratory preset.

## Reconstruction

Each sample is simulated at its weight, dose, estimated CrCl and time since the last dose:
- IV doses as 1-hour infusions every 8 h (20b every 12 h); oral valaciclovir 1,000 mg every 8 h for patients 3 and 14.
- Constant CrCl for the whole course, at the value reported for the sample.
- Courses longer than 13 days are simulated as 13 days (the engine's 336-hour limit); every sample is at steady state well before that.

Patient 7’s supplementary case history records a switch to 12-hour dosing. A separate analysis reconstructs this change and the serial CrCl estimates. The cohort results below use the original Table 1 assumptions. [Patient 7 follow-up](LINDSTROM-PATIENT7-COURSE.md)

Patient 4’s supplementary case history records acute renal failure after 3 days followed by dose adjustments (10 mg/kg q12h on day 4, 12 mg/kg q8h on day 6). A separate analysis reconstructs these changes and the timing discrepancies. [Patient 4 follow-up](LINDSTROM-PATIENT4-COURSE.md)

**Barrier intact** means an albumin ratio at or below the paper's upper reference: 6.8 × 10⁻³ at 45 years or younger, 10.2 × 10⁻³ above 45. Values reported as below 0.15 µmol/L count as consistent when the prediction is at or below that limit.

## CSF CMMG

| CSF CMMG partition | Barrier intact (3 measured, 7 below limit) | Barrier disrupted (17 measured, 6 below limit) |
|---|---|---|
| 0.25 (default before #47) | GMR 5.85, within twofold 0/3, below-limit consistent 0/7 | GMR 2.21, within twofold 2/17, below-limit consistent 0/6 |
| 0.035 | GMR 0.82, within twofold 3/3, below-limit consistent 7/7 | GMR 0.31, within twofold 6/17, below-limit consistent 5/6 |
| **0.025 (Smith 2010; current default)** | **GMR 0.58, within twofold 3/3, below-limit consistent 7/7** | GMR 0.22, within twofold 4/17, below-limit consistent 6/6 |

GMR is the geometric mean of predicted/observed on measured values.

- **Intact barrier:** 0.25 is about six times too high, and it predicts measurable CSF CMMG in every sample that was below the limit. 0.025 fits every intact-barrier sample. 0.035 fits slightly better, but choosing it from these data would make this check no longer independent.
- **Disrupted barrier:** no single partition fits. CSF CMMG scales with the partition, so these samples imply roughly 0.11, more than four times Smith's value. It rises with the albumin ratio; patient 19, at 108–162 × 10⁻³, is above 0.7.

## Blood–brain barrier presets

The simulator's *Blood–brain barrier* setting (engine `CSF_BARRIER`) sets both CSF partitions at once:

| Preset | CSF acyclovir partition | CSF CMMG partition | Basis | Lindström fit (CSF GMR vs serum GMR) |
|---|---:|---:|---|---|
| Intact (default) | 0.30 | 0.025 | Unchanged default; Smith 2010 for CMMG | acyclovir 0.80 vs 0.70; CMMG 0.58 (3 values) vs 0.86 |
| Damaged (exploratory) | 0.37 | 0.11 | **Fitted** to the disrupted-barrier samples here | acyclovir 0.61 vs 0.61; CMMG 0.97 vs 0.97 |

The damaged preset was chosen by bringing the separate CSF and serum GMRs close together. The disrupted group contributes 23 CSF and 21 serum values for acyclovir, and 17 CSF and 21 serum values for CMMG. Different visits contribute to those summaries.

### Same-visit ratio check

For each visit with both measurements quantified, divide observed CSF/serum by predicted CSF/plasma and multiply by the preset partition. This gives the partition implied by that visit under the original dose, CrCl, sampling and lag assumptions. The collection-time concentrations are distinct from dosing-interval AUC ratios. For equal patient weighting, take the geometric mean within each patient and then across patients. The final column repeats this calculation omitting each patient in turn. Its range describes sensitivity to individual patients.

| Barrier and analyte | Quantified visits / patients | Preset | Visit-weighted partition | Patient-weighted partition | Omit-one-patient range |
| --- | ---: | ---: | ---: | ---: | ---: |
| Intact acyclovir | 10 / 8 | 0.30 | 0.261 | 0.287 | 0.238–0.353 |
| Intact CMMG | 3 / 3 | 0.025 | 0.030 | 0.030 | 0.022–0.039 |
| Disrupted acyclovir | 21 / 12 | 0.37 | 0.377 | 0.418 | 0.349–0.456 |
| Disrupted CMMG | 16 / 8 | 0.11 | 0.087 | 0.102 | 0.075–0.123 |

At the damaged preset of 0.11 the visit-weighted predicted/observed CMMG concentration-ratio GMR is **1.26**. The corresponding acyclovir GMR is **0.98**. For CSF CMMG below the assay limit, scale the predicted CSF/plasma ratio by the same visit's measured serum CMMG and compare with 0.15 µmol/L. Seven of seven intact and three of five disrupted pairs remain below the limit. This check uses no imputed concentrations. One additional disrupted below-limit CSF sample lacks serum. Patient weighting, censoring and barrier variability all affect interpretation. All of these estimates reuse the original cohort.

## Other sources

- **Smith 2010** ([doi:10.1128/AAC.00729-09](https://doi.org/10.1128/AAC.00729-09)): CSF:plasma CMMG AUC ratio about 0.025 in healthy volunteers and 0.026 in chronic kidney disease, neither with CNS infection. This is the calibration source for 0.025.
- **Unita 2023** (case report, J Infect Chemother; [doi:10.1016/j.jiac.2023.07.001](https://doi.org/10.1016/j.jiac.2023.07.001)): before dialysis, CSF CMMG was 0.50 mg/L one hour after plasma CMMG of 42 mg/L. The approximate concentration ratio was 0.012. [Sampling and HD follow-up](CMMG-EVIDENCE.md#unita-2023-plasma-sampling-around-three-hd-sessions)
- **Helldén 2006** ([J Antimicrob Chemother 57:945](https://doi.org/10.1093/jac/dkl067)) reports serum concentrations by subject in Table 1 and CSF concentrations by symptom group in Figure 2. The [author’s 2010 thesis](https://files01.core.ac.uk/download/pdf/70338802.pdf) reports a symptomatic CSF/serum CMMG concentration ratio of 0.065 ± 0.037 for this cohort (printed p. 16). Serum and CSF sampling times varied. The ratio describes sampled concentrations and does not establish a dosing-interval AUC ratio. Barrier status was unreported.

## Serum, as a by-product

Serum CMMG does not depend on the partition. With the 0.5 L/h non-kidney CMMG clearance from #85, it is unbiased across 32 samples at CrCl 30–184 mL/min (GMR 0.96, 22/32 within twofold). That is independent support for #85 in moderate kidney function. Serum acyclovir is underpredicted (GMR 0.64), consistent with the low-trough finding elsewhere, and CSF acyclovir likewise (GMR 0.57).

## Implication for #47

The data support 0.025 for patients with an intact blood–brain barrier. They also show that CNS infection with barrier damage raises CSF CMMG several-fold, an effect now represented by the exploratory damaged preset. The independent intact-barrier comparison and the in-sample damaged-preset comparison answer different questions.
