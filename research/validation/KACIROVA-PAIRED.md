# Paired acyclovir and CMMG concentrations during intravenous therapy

Kacířová, Uřinovská and Sagan report a 36-year-old man weighing 86 kg who received 750 mg IV acyclovir every eight hours for two days, followed by 850 mg every eight hours. Figure 1 identifies a trough and a sample taken 25 minutes after the infusion ended. Only the two measured points for each compound enter this comparison. The continuous curve in the figure is the authors’ pharmacokinetic reconstruction. [Original publication, Figure 1](https://www.klinickafarmakologie.cz/incpdfs/far-202204-0002_10_001.pdf)

Time zero is the first IV infusion. The simulation starts with zero drug and metabolite because the preceding oral acyclovir course lacks a measured baseline. The sample markers appear about eight dosing intervals after the first IV infusion. The reference reconstruction therefore samples the ninth IV dose (third 850 mg dose), assumes a one-hour infusion, and uses the last listed serum creatinine, 87 µmol/L, as a constant Cockcroft–Gault input. The figure gives no sampling-day creatinine or explicit infusion duration. The scenario range spans IV doses eight through ten, one- and two-hour infusions, and each listed creatinine (86, 87 and 102 µmol/L). It reflects these input choices only. The model uses its default coefficients with no fitting or dialysis.

All concentrations and differences are in mg/L. Reproduce with `node research/validation/kacirova-paired.cjs` from the repository root.

| Serum endpoint | Measured | Predicted | Predicted minus measured | Scenario range |
|---|---:|---:|---:|---:|
| Acyclovir trough | 1.7 | 0.45 | -1.25 | 0.43–0.71 |
| Acyclovir +25 min | 8.9 | 9.05 | 0.15 | 5.97–10.34 |
| CMMG trough | 0.27 | 0.11 | -0.16 | 0.11–0.22 |
| CMMG +25 min | 0.64 | 0.71 | 0.07 | 0.67–0.84 |

The model underpredicts both troughs throughout the tested scenarios. In the reference reconstruction both post-infusion predictions are within 0.15 mg/L of the measured values. The resulting trough-to-post-infusion increases exceed the observed increases for both compounds. Two sampling times in one patient cannot distinguish clearance, distribution, metabolite formation and baseline effects.
