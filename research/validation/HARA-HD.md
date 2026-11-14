# Hara oral valacyclovir and HD benchmark

Addresses #50. Hara K, Suyama K, Itoh H, Nagashima S. *Drug Metab Pharmacokinet.* 2008;23:306–312. [DOI 10.2133/dmpk.23.306](https://doi.org/10.2133/dmpk.23.306). [Full text](https://www.jstage.jst.go.jp/article/dmpk/23/5/23_5_306/_pdf).

Table 1 gives 18 participants, mean weight 56.2 kg and measured CrCl 0.93 mL/min. A single 1,000-mg valacyclovir dose precedes HD at 48–52 h, following the 48-h sample. Table 2 supplies plasma acyclovir peak and AUC₀–₁₂, and serum CMMG peak. Page 310 reports pre/post-HD concentration declines of 69.4% and 77.6% respectively.

Run `node research/validation/hara-hd.cjs`. The stored JSON records all inputs and endpoints, plus residual-CrCl sensitivity. Default oral absorption and HD clearance remain assumptions. No genotype effect is implemented. A nominal curve represents no individual participant. Group means of individual peaks differ from the peak of a group curve. Serum CMMG is compared with the model's systemic concentration. Concentration decline includes ongoing disposition and formation and cannot be interpreted as recovered dose fraction.

The earlier teaching-demo assumptions of HD at 44–48 h and CrCl 1.47 differ from this source reconstruction.

## Pre-dialysis terminal disposition by ALDH2 genotype

Hara reported six participants per group. Table 1 supplies mean body weight and measured CrCl, Table 2 supplies mean individual PK estimates, and Table 3 reports a genotype association with the terminal acyclovir half-life. Each row below uses the same 1,000 mg oral dose and frozen engine, with weight and CrCl set to that group's means. Model AUC uses the study sampling times through 48 h and extrapolates the pre-HD terminal slope. Values are in hours and mg·h/L (equivalent to µg·h/mL).

| ALDH2 group | Weight (kg) | CrCl (mL/min) | Observed half-life ± SD | Model half-life | Observed AUC∞ | Model AUC∞ |
|---|---:|---:|---:|---:|---:|---:|
| *1/*1 | 55.7 | 0.93 | 18.1 ± 4.1 | 17.53 | 197.62 | 232.51 |
| *1/*2 | 53.7 | 0.72 | 21.9 ± 3.2 | 17.74 | 270.43 | 244.45 |
| *2/*2 | 59.2 | 1.14 | 26.7 ± 4.0 | 17.43 | 280.23 | 217.27 |

The observed mean half-life increased by 8.6 h from the first to the third group. The frozen model predicts a 0.10 h decrease at the respective group means. Using the rounded means, SDs and counts gives F(2,15) = 7.77, p = 0.00484 and R² = 0.509, reproducing Table 3 to rounding. The authors reported p = 0.350 for AUC∞. Their results establish a group association with the parent drug's half-life. They give insufficient evidence to assign genotype-specific CMMG formation clearances.

The primary model fit uses the 24, 44 and 48 h samples. Adding 12 h changes the model half-lives by less than 0.001 h. Individual terminal-fit windows, individual covariate pairs and genotype-specific bioavailability were unavailable. A curve at group-mean inputs cannot estimate individual variability or the genotype effect after adjustment. All rows belong to the same 18-person cohort used above. [Primary source, pp. 307–310](https://doi.org/10.2133/dmpk.23.306) · [Reproduction script](hara-genotype-terminal.cjs)
