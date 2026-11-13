# Lindström 2019: CSF CMMG with intact and disrupted blood–brain barrier (#47)

Lindström J, Helldén A, Lycke J, Grahn A, Studahl M. *J Antimicrob Chemother.* 2019;74:3565–3572. [doi:10.1093/jac/dkz357](https://doi.org/10.1093/jac/dkz357), reference [4]. Table 1 gives paired serum and CSF acyclovir and CMMG for 34 samples from 21 patients treated for herpesvirus CNS infection, with each sample's CSF:serum albumin ratio, a marker of blood–brain barrier damage.

**Since the #47 model change, AyFlux's default is 0.025** (see `MODEL-CHANGE-47.md`); this benchmark was written before it and compares candidate values explicitly. Reproduce with `node research/validation/lindstrom-csf.cjs`; the table is in `data/lindstrom2019-table1.csv` and the results in `lindstrom-csf-results.json`. The study was not used to set any AyFlux parameter, so it is an independent check of the CSF CMMG partition (`csfMetRatio`, default 0.25) and of the alternative 0.025 that Smith 2010 informed.

## Reconstruction

Each sample is simulated at its weight, dose, estimated CrCl and time since the last dose:
- IV doses as 1-hour infusions every 8 h (20b every 12 h); oral valaciclovir 1,000 mg every 8 h for patients 3 and 14.
- Constant CrCl for the whole course, at the value reported for the sample.
- Courses longer than 13 days are simulated as 13 days (the engine's 336-hour limit); every sample is at steady state well before that.

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

## Other sources

- **Smith 2010** ([doi:10.1128/AAC.00729-09](https://doi.org/10.1128/AAC.00729-09)): CSF:plasma CMMG AUC ratio about 0.025 in healthy volunteers and 0.026 in chronic kidney disease, neither with CNS infection. This is the calibration source for 0.025.
- **Unita 2023** (case report, J Infect Chemother; [doi:10.1016/j.jiac.2023.07.001](https://doi.org/10.1016/j.jiac.2023.07.001)): before dialysis, CSF CMMG was about 1% of plasma.
- **Helldén 2006** (J Antimicrob Chemother 57:945) reported a CSF/serum CMMG ratio of 0.065 ± 0.037 in patients with neuropsychiatric symptoms; barrier status was not reported.

## Serum, as a by-product

Serum CMMG does not depend on the partition. With the 0.5 L/h non-kidney CMMG clearance from #85, it is unbiased across 32 samples at CrCl 30–184 mL/min (GMR 0.96, 22/32 within twofold). That is independent support for #85 in moderate kidney function. Serum acyclovir is underpredicted (GMR 0.64), consistent with the low-trough finding elsewhere, and CSF acyclovir likewise (GMR 0.57).

## Implication for #47

The data support 0.025 for patients with an intact blood–brain barrier. They also show that CNS infection with barrier damage raises CSF CMMG several-fold, an effect AyFlux does not represent. The #47 change adopts 0.025 and adds that warning to the CSF CMMG chart.
