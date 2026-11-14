# CMMG evidence check (#46)

**Written before the #46 model change** (non-kidney CMMG clearance 0.25 → 0.5 L/h; see `MODEL-CHANGE-46.md`). Sections 1–2 are recomputed with the current engine; the conclusions are unchanged. This note records what the available data can and cannot say about CMMG formation, kidney clearance, dialysis removal and accumulation with no kidney function. Reproduce with `node research/validation/cmmg-evidence.cjs`. The results are in `cmmg-evidence-results.json`.

## Sources

- **Hara 2008** ([doi 10.2133/dmpk.23.306](https://doi.org/10.2133/dmpk.23.306)): 18 HD patients (CrCl 0.93 mL/min), one 1,000 mg valacyclovir dose, HD at 48–52 h. Over the session, plasma acyclovir fell 69.4% and serum CMMG 77.6%. This is already the `hara-hd.cjs` benchmark.
- **Helldén 2010 thesis** (Karolinska Institutet; [open copy](https://core.ac.uk/download/70338802.pdf)):
  - Paper V (preliminary, single dose; 6 healthy, 6 CKD and 4 HD patients): one HD session lowered serum acyclovir by 56% and CMMG by 73%. The dose was 50 mg IV; session timing and dialyzer are not given. The linear fit of CMMG kidney clearance against measured CrCl has slope 3.7474 (R² 0.854); the acyclovir fit has slope 1.5392.
  - Paper I: 7 of 49 patients with neuropsychiatric symptoms had serum CMMG above 40 µmol/L, at most 158 µmol/L (about 38 mg/L).
  - The thesis reports **no** CMMG non-kidney clearance and no CMMG half-life between or during dialysis.

## 1. Dialysis removal of CMMG: no change supported

#46 compared Hara's 77.6% CMMG decline with AyFlux's 58.8% (59.8% after the change) and asked whether CMMG dialysis removal is too low. AyFlux also underpredicts Hara's **acyclovir** decline (51.9% vs 69.4%), so most of the gap is the dialyzer clearance assumption. The default 81.8 mL/min comes from Laskin 1982.

| Reconstruction | HD clearance (mL/min) | Acyclovir decline, predicted / observed | CMMG decline, predicted / observed |
|---|---:|---|---|
| Hara, default dialyzer | 81.8 | 51.9% / 69.4% | 59.8% / 77.6% |
| Hara, dialyzer matched to acyclovir | 159 | 69.3% / 69.4% | **82.2% / 77.6%** |
| Helldén Paper V, dialyzer matched to acyclovir* | 96 | 56.0% / 56% | **65.4% / 73%** |

\* Approximation: this uses the Hara reconstruction with the dialyzer tuned to Paper V's acyclovir decline, because Paper V's session timing is not reported.

Once the dialyzer matches each study's acyclovir data, the unchanged CMMG dialysis term (`metDial` 1) overpredicts Hara by 5 points and underpredicts Helldén by 8. The two independent sources bracket the current value, so raising `metDial` (1.5 would match Hara at the old dialyzer) would fix the wrong parameter. The Hara reconstruction's dialyzer clearance is an assumption; individual hdCl is not reported.

## 2. Kidney clearance of CMMG: sources conflict

AyFlux uses CMMG kidney clearance ≈ 2.0 × CrCl and acyclovir ≈ 3.37 × CrCl (mL/min). Helldén's Paper V fits 3.75 × CrCl and 1.54 × CrCl. Raising the CMMG coefficient would lower the CMMG/acyclovir exposure ratio. The Kably population model predicts higher median CMMG/acyclovir AUC ratios than the illustrative AyFlux scenarios. Kably reports simulated exposure by indexed eGFR category. AyFlux uses absolute CrCl. Paper V is small, preliminary and uses a 50 mg dose, and Kably's population is liver-transplant recipients on oral valacyclovir. Neither is strong enough to override the other, so no change.

Run `node research/validation/kably-auc-comparison.cjs` to compare both analytes at day 11 (2000 mg valacyclovir every eight hours). At absolute CrCl 104 mL/min, AyFlux predicts acyclovir and CMMG AUCs of 99.84 and 13.08 mg·h/L. Kably’s simulated medians for indexed eGFR above 90 are 44.8 and 13.3 mg·h/L. At CrCl 25, AyFlux gives 335.33 and 162.84 mg·h/L, compared with 88.7 and 103.1 for Kably’s below-30 stratum. A lower metabolite/parent ratio can coexist with similar or higher absolute metabolite exposure. These model comparisons do not isolate formation or elimination.

### Paper V figure check

The preliminary crossover study included six healthy participants, six with chronic kidney disease and four receiving HD. For the IV arm, the healthy group received 100 mg and the other groups 50 mg. Figure 8 plots measured CrCl in absolute mL/min. We read the vector marker centers and refit the two renal-clearance slopes through zero, as drawn. Total acyclovir clearance was fitted with a free intercept. Six nonzero markers fall near 23–62 mL/min and six near 115–191 mL/min. Plotting precision limits the recovered values. [Helldén thesis, printed pp. 20–21](https://files01.core.ac.uk/download/pdf/70338802.pdf) · [Reproduction script](hellden-renal-clearance.cjs)

| Renal clearance divided by CrCl | Printed slope | Digitized slope | Six lower CrCl values | Six higher CrCl values | Omit one marker |
| --- | ---: | ---: | ---: | ---: | ---: |
| Acyclovir | 1.539 | 1.548 | 1.456 | 1.557 | 1.475–1.581 |
| CMMG | 3.747 | 3.748 | 4.048 | 3.721 | 3.559–3.949 |

The upper six markers supply about 92% of the sum of squared CrCl in both origin-constrained fits, so they dominate the pooled slopes. The lower six still give a steeper CMMG slope than the nominal AyFlux value of 2.0 at 70 kg. At 50–90 kg the model slope ranges from 1.55 to 2.41 because clearance also scales with weight. Individual weights and raw assay data are unavailable here. Total parent clearance gives a digitized slope of 2.04 and intercept of 41.9 mL/min, compared with 2.04 and 40.2 in the figure. These are parent-drug quantities. They cannot identify nonrenal CMMG clearance. This check reuses Paper V and supplies no independent cohort.

## 3. CrCl 0 accumulation: not identifiable from the data in hand at the time

With no kidney function, CMMG leaves only through the non-kidney term (0.25 L/h before the change, volume 0.4 L/kg): a nominal half-life of 77.6 h at 70 kg, 38.8 h at the current 0.5 L/h. Single-dose data fit: the Hara CMMG peak is predicted at 8.57 vs 7.47 mg/L observed. Without repeated-dose data with known dosing and no dialysis in between, the half-life cannot be tested. The guided "no kidney function" scenario (700 mg IV every 8 h, about 162 mg/L CMMG by 96 h) uses a regimen many times the labeled anuric dose, far outside any observed data. Its interface note now says the CMMG height is an untested extrapolation and gives the highest measured symptomatic level (about 38 mg/L).

**Resolved by the next source (2026-11-13):** Helldén's case 1 ([45]) is reconstructed in `HELLDEN-COTARD.md`. With almost no kidney function, measured CMMG fell from 21.1 to 8.9 µmol/L between sessions, an apparent half-life of about 35 h, and the former 0.25 L/h left day-6 CMMG 2.6–3 times too high. Hara, as the independent check, also fits better at 0.5 L/h. The #46 model change raised the non-kidney CMMG clearance to 0.5 L/h (`MODEL-CHANGE-46.md`).

## Urinary recovery after a single radiolabeled IV dose

De Miranda and colleagues measured dose recovery in five adults with advanced malignancy. They gave 0.5 or 2.5 mg/kg acyclovir IV over one hour and collected urine through 120 hours. HPLC distinguished urinary parent drug from CMMG. Table IV spans printed pages 670–671. A 1982 report with the same doses, population and recovery figures is counted once. [1981 primary paper](https://doi.org/10.1038/clpt.1981.218) · [1982 report](https://pubmed.ncbi.nlm.nih.gov/7102704/)

| Source row | Estimated CrCl, mL/min/1.73 m² | Urinary acyclovir, observed / modeled % dose | Urinary CMMG, observed / modeled % dose |
| --- | ---: | ---: | ---: |
| VMB | 84 | 68.1 / 90.8 | 9.3 / 8.2 |
| EJH | 52 | 62.1 / 85.9 | 9.4 / 12.1 |
| MAM | 71 | 85.4 / 89.3 | 9.3 / 9.4 |
| RFR | 66 | 75.5 / 88.6 | 14.1 / 10.0 |
| GSS | 125 | 91.0 / 93.6 | 8.5 / 5.7 |
| Mean | | 76.4 / 89.6 | 10.1 / 9.1 |

Run `node research/validation/de-miranda-iv-recovery.cjs`. The comparison assumes 70 kg and BSA 1.73 m² because individual sizes are unavailable. Absolute CrCl equals indexed CrCl multiplied by BSA / 1.73. Varying assumed BSA from 1.50 to 2.10 m² gives mean CMMG recovery of 10.2% to 7.7%. The paper reports weights of 57–102 kg. In this linear model, common allometric clearance scaling cancels in the eventual recovery fractions at fixed absolute CrCl. At 120 hours the nominal fractions agree with their infinite-time limits within 0.005 percentage points. The script converts metabolite mass to parent molar equivalents and checks recovery against integrated urinary CMMG flux.

The authors suspected incomplete collections in the first two participants. VMB also had an uncertain administered dose and lower parent recovery by radioimmunoassay after sample storage. Substituting their measured indexed CrCl values of 66 and 28 gives predicted urinary CMMG of 10.0% and 18.9%. Total urinary radioactivity and analyte-specific measurements have separate assay error. Among the other three participants, the mean measured and modeled parent recoveries were 84.0% and 90.5%, and CMMG recoveries were 10.6% and 8.4%. These urine measurements constrain the product of parent conversion and metabolite renal recovery at the studied renal function. Formation in anuric patients remains undetermined.
