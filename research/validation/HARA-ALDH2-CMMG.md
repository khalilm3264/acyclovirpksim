# Hara CMMG and the proposed ALDH2 equations

The specified ALDH2 model reproduces its supplied implementation targets but underpredicts Hara's mean serum CMMG at 24 hours. At 44–48 hours, the largest discrepancy is in the heterozygous group. These comparisons support further model investigation before adoption. The source has six participants per genotype group and substantial interindividual variation. Its descriptive group means alone cannot resolve the underlying enzyme mechanism. [Hara 2008, pp. 307–310, Figure 3 and Tables 1–3](https://doi.org/10.2133/dmpk.23.306)

Run `node research/validation/hara-aldh2-cmmg.cjs` to print the comparison and generate [the overlay](hara-aldh2-overlay.svg). This standalone research calculation uses the proposed equations. The adult AyFlux engine blob at review was `17971df66e0a97b4d382572a582d35c444a3c83f`.

## Source and comparison conditions

Hara administered 1,000 mg oral valacyclovir to 18 fasting participants receiving maintenance hemodialysis. Blood was collected before dosing and at 1, 2, 3, 4, 6, 8, 12, 24, 44 and 48 hours. The next dialysis began after the 48-hour sample. CMMG was measured in serum and parent acyclovir in plasma. Mean measured residual CrCl was 0.93, 0.72 and 1.14 mL/min across the three groups. [Methods and Table 1](https://doi.org/10.2133/dmpk.23.306)

The proposal is `idea_report_4080292048723247105.pdf`, supplied to the project on 14 November 2026. Pages 4–6 define the equations and constants used here. The calculation assumes the proposal's 55 kg reference fat-free mass and zero renal and dialysis clearance throughout 48 hours. Hara did not report individual fat-free masses. These assumptions limit the match to each group.

| Parameter | Value |
| --- | --- |
| Valacyclovir molar mass | 324.34 g/mol |
| Oral bioavailability and absorption rate | 0.545 and 0.95/h |
| Parent central/peripheral volumes and exchange clearance | 14.5 L, 28.5 L and 18 L/h |
| CMMG central/peripheral volumes and exchange clearance | 15 L, 30 L and 15 L/h |
| Parent other clearance and CMMG nonrenal clearance | 0.05 and 0.12 L/h |
| Forward and reverse aldehyde rates | 0.1203/h and 0.1965/h |
| Redundant aldehyde oxidation rate | 0.2962/h |
| Genotype-specific ALDH2 rates, *1/*1, *1/*2, *2/*2 | 4.0049/h, 0.4005/h, 0.0400/h |

The proposed model has a gut amount and five concentrations, representing central/peripheral parent, an intermediate aldehyde and central/peripheral CMMG. Formation and mass accounting use molar units. The intermediate's apparent volume equals the parent central volume.

## Reading Figure 3

The nine late mean markers were independently re-read from the original J-STAGE PDF, printed p. 309. Values below are rounded to 0.1 µg/mL. Allow ±0.1 µg/mL for this manual reading. This allowance describes extraction precision. The clinical SD bars are much wider.

The audit rendered the figure at four pixels per PDF point, clipping PDF coordinates (300, 170)–(550, 342). In that 1,000 × 688 image, the zero and 14 µg/mL ticks lie near y=625 and y=64, giving about 40 pixels per µg/mL. The 24, 44 and 48 hour markers lie near x=573, 887 and 950, with small offsets between group markers. Approximate y centers were 340/361/365 for closed circles, 312/284/278 for open circles and 385/388/388 for triangles. This documents the reading scale and locations.

Several early means in the initial extraction could not be reproduced. They are omitted from the numerical dataset and overlay. Upper SD endpoints also require further extraction before reuse. The script retains the full source sampling grid for model evaluation.

## Conditional model predictions

Each observed value is a digitized group mean. CMMG molar mass is 239.19 g/mol, so 1 µg/mL equals approximately 4.1808 µmol/L.

| Hour | Genotype | Mean read from figure, µg/mL | Model, µg/mL | Model, µmol/L | Predicted/observed |
| --- | --- | ---: | ---: | ---: | ---: |
| 24 | *1/*1 | 7.1 | 5.15 | 21.54 | 0.73 |
| 24 | *1/*2 | 7.8 | 4.42 | 18.47 | 0.57 |
| 24 | *2/*2 | 6.0 | 3.69 | 15.43 | 0.62 |
| 44 | *1/*1 | 6.6 | 6.59 | 27.56 | 1.00 |
| 44 | *1/*2 | 8.5 | 6.00 | 25.10 | 0.71 |
| 44 | *2/*2 | 5.9 | 5.31 | 22.21 | 0.90 |
| 48 | *1/*1 | 6.5 | 6.74 | 28.18 | 1.04 |
| 48 | *1/*2 | 8.7 | 6.19 | 25.88 | 0.71 |
| 48 | *2/*2 | 5.9 | 5.53 | 23.11 | 0.94 |

At these times, the nominal model orders CMMG as *1/*1 > *1/*2 > *2/*2. The observed means place *1/*2 highest. The reference calculation uses identical volumes, bioavailability and residual clearance across groups. It omits the between-person variation present in Hara's samples. Group means and overlapping SDs provide insufficient evidence for a categorical rejection of the biochemical pathway.

Hara's Table 2 reports mean individual CMMG peaks of 7.44 ± 2.79, 8.75 ± 4.31 and 6.22 ± 2.29 µg/mL. The authors report no apparent genotype relationship for CMMG. Table 3's formal tests concern parent acyclovir. A lack of an apparent CMMG relationship provides limited evidence about differences and cannot establish exposure equivalence. Hara reports no CMMG AUC in Table 2. [Results](https://doi.org/10.2133/dmpk.23.306)

## Implementation and endpoint checks

The proposal claims that 48-hour CMMG AUC agrees within 15% across genotypes. Direct integration of its equations gives the following values. These targets were supplied for implementation checking, so reproducing them establishes equation agreement.

| Genotype | Supplied target, µmol·h/L | Independent matrix exponential, µmol·h/L |
| --- | ---: | ---: |
| *1/*1 | 928.5 | 928.50776 |
| *1/*2 | 800.4 | 800.36045 |
| *2/*2 | 675.4 | 675.39113 |

The *2/*2 48-hour AUC is 27.3% below *1/*1, exceeding the proposal's 15% criterion. Finite-time exposure and eventual metabolite formation are distinct endpoints. Extending these equations indefinitely without dialysis gives CMMG AUCs of approximately 13,595, 13,506 and 13,394 µmol·h/L. Eventual formation is approximately 1,631, 1,621 and 1,607 µmol, respectively. The small differences arise because the proposal includes competing parent clearance. Thus its claim of exactly identical eventual formation also requires qualification. These infinite-time calculations assume no intervening dialysis and cannot describe Hara's treatment after 48 hours.

The script uses explicit Euler integration with 0.0005-hour steps and trapezoidal CMMG AUC accumulation. It checks AUC convergence at 0.00025-hour steps, sample completeness, finite nonnegative states and molar conservation. Independent SciPy matrix exponentiation agrees with each late concentration within 0.003 µmol/L and supplies the AUC values above. The independent calculation uses the linear coefficient matrix of the same six equations, with an additional AUC state. The infinite-time integral solves the corresponding stable linear system.

The initial review conflated a measured pre/post-dialysis concentration reduction with permanent removal of all remaining parent drug. Estimating that amount requires a dialysis model with ongoing distribution and formation. This 0–48-hour comparison ends before dialysis.

The current evidence supports the narrower finding that the specified reference model misses the late heterozygote mean and the proposal's finite-AUC criterion. Further assessment needs group covariates, verified early markers and subject-level data. Any claim about structural identifiability requires a separate mathematical analysis.
