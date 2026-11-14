# Hara oral valacyclovir and HD benchmark

Addresses #50. Hara K, Suyama K, Itoh H, Nagashima S. *Drug Metab Pharmacokinet.* 2008;23:306–312. [DOI 10.2133/dmpk.23.306](https://doi.org/10.2133/dmpk.23.306). [Full text](https://www.jstage.jst.go.jp/article/dmpk/23/5/23_5_306/_pdf).

Table 1 gives 18 participants, mean weight 56.2 kg and measured CrCl 0.93 mL/min. A single 1,000-mg valacyclovir dose precedes HD at 48–52 h, following the 48-h sample. Table 2 supplies plasma acyclovir peak and AUC₀–₁₂, and serum CMMG peak. Page 310 reports pre/post-HD concentration declines of 69.4% and 77.6% respectively.

Run `node research/validation/hara-hd.cjs`. The stored JSON records all inputs and endpoints, plus residual-CrCl sensitivity. Default oral absorption and HD clearance remain assumptions. No genotype effect is implemented. A nominal curve represents no individual participant. Group means of individual peaks differ from the peak of a group curve. Serum CMMG is compared with the model's systemic concentration. Concentration decline includes ongoing disposition and formation and cannot be interpreted as recovered dose fraction.

The earlier teaching-demo assumptions of HD at 44–48 h and CrCl 1.47 differ from this source reconstruction.
