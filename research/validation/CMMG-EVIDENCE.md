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

## Unita 2023 plasma sampling around three HD sessions

A 96-year-old woman with renal dysfunction received oral valacyclovir followed by IV acyclovir before admission. Treatment stopped and she received three four-hour HD sessions. Admission plasma was 55 mg/L acyclovir and 42 mg/L CMMG. CSF drawn an hour later was 11 and 0.50 mg/L, respectively. The resulting concentration ratios are 0.20 and 0.012. This single CSF sample provides no dosing-interval AUC. The admission CMMG of 42 mg/L exceeds the approximately 38 mg/L maximum cited above from the earlier Helldén cohort. [Unita et al., p. 1069 and Figure 1](https://doi.org/10.1016/j.jiac.2023.07.001)

| Session | Plasma sampling interval after admission | Approximate start of HD | Acyclovir decline over sampling interval | CMMG decline over sampling interval |
| --- | --- | ---: | ---: | ---: |
| 1 | 12–24 h | 20 h | 70% | 76% |
| 2 | 36–42.6 h | 38.6 h | 78% | 76% |
| 3 | 60–66 h | 62 h | 77% | >87% |

The text gives the final acyclovir as 0.36 mg/L and CMMG as detectable below 0.1 mg/L. The other follow-up concentrations are approximate figure readings. They use a logarithmic concentration axis, and the two 12-hour markers partly overlap. A vertical reading sensitivity of ±3 pixels gives first-interval CMMG declines of 73–78%. All three blood sampling intervals contain time off dialysis before the four-hour session begins. Between the end of the second session and the 60-hour sample, plasma acyclovir rises by approximately 46% while CMMG falls by approximately 15%. There is no dialysate drug mass or immediate predialyzer sample at the three starts. These measurements therefore cannot determine dialyzer clearance, whole-body recovery or a clinical CMMG cutoff. [Reproduction script](unita-hd-sampling.cjs)

## Oral radiolabel recovery in healthy volunteers

Soul-Lawton’s metabolic-disposition arm enrolled four fasting volunteers (mean weight 74 kg) given one oral 1,000 mg dose of labelled valacyclovir. The 12-person oral/IV crossover reported in the same paper was a separate experiment. Methods specify urine collection through 96 h and stool through 168 h. Parent acyclovir in urine averaged 40.4% of the administered tracer (SD 10.8 percentage points). Total urinary radioactivity averaged 45.6% and fecal radioactivity 47.1%.

At assumed absolute CrCl 90–120 mL/min, AyFlux predicts 49.8–50.9% of the oral dose recovered in urine as parent and 3.25–4.19% as CMMG. The two modeled analytes alone account for 54.0–54.1%, above the mean total recovered urinary label. This comparison depends on the assigned oral bioavailability (0.545), unreported individual CrCl and the completeness of recovery. AyFlux has no fecal excretion measurement. The model's unavailable oral fraction is not a prediction of label measured in stool.

In high-activity urine collections through 8 h, HPLC identified acyclovir (84.39%), CMMG (13.78%) and 8-OH-acyclovir (1.46%) as mean percentages of recovered radioactivity. The composition analysis used three participants and selected collections containing more than 10% of the administered radioactivity. The ratio of the reported mean CMMG and parent-plus-CMMG percentages is 14.04%. The model predicts a CMMG share of 5.60–6.79% across the whole 0–8 h collection, versus 14.04–16.38% during 4–8 h alone. Individual interval recoveries and selection weights are unavailable. The reported 13.78% cannot be compared directly to a percentage of the oral dose or used to estimate an anuric formation fraction. [Primary source, pp. 2760–2763](https://doi.org/10.1128/AAC.39.12.2759) · [Reproduction script](soul-lawton-radiolabel.cjs)

## Applying the Paper V kidney-clearance slope to Smith 2010

Smith et al. measured systemic acyclovir and CMMG over the fifth oral dosing interval in six adults with normal kidney function (2,000 mg every 6 h) and three with CKD (1,500 mg every 12 h). This calculation uses the source sampling times and linear trapezoids over each dosing interval. It compares Table 1 means with predicted AUCs in µmol·h/L. The two scenarios differ only in CMMG renal clearance. The second imposes Paper V's absolute slope of 3.7474 mL/min per mL/min CrCl. All rows below assume a 70 kg body weight.

| Group and CrCl input (mL/min) | Source ACV / CMMG | Default ACV / CMMG | Paper V slope ACV / CMMG |
|---|---:|---:|---:|
| Normal, group mean 111 | 137 / 17 | 135.5 / 16.2 | 135.5 / 8.8 |
| CKD, group mean 26 | 577 / 148 | 360.2 / 158.8 | 360.2 / 91.0 |
| Same CKD group, mean of simulations at 17, 30 and 31 | 577 / 148 | 374.5 / 181.7 | 374.5 / 106.1 |

Using the three CKD clearances increases predicted mean CMMG AUC by 14% over the default calculation at their mean CrCl. The cohort's measured CMMG-to-parent ratio of group means is 0.257. Imposing the higher slope changes the modeled ratio from 0.485 to 0.283, while absolute CMMG AUC moves from 23% above to 28% below the observed mean. The parent prediction remains 35% low. In the normal group the higher slope leaves CMMG 48% low. Matching a ratio with an underpredicted parent concentration cannot establish a renal clearance coefficient.

Subject weights and matched individual AUCs were unavailable for this calculation. Weight sensitivities (50/70/90 kg), nominal oral bioavailability 0.545, the estimated CrCl inputs and the extrapolation of a preliminary 50 mg IV clearance fit to repeated oral doses limit inference. The prior exploratory grid in draft #14 used the same CKD clearances. Here the comparison uses the published normal-group mean, current engine, source sampling grid and the Paper V coefficient specifically. The Smith CSF ratio informed the model's existing CSF calibration. These systemic comparisons reuse those participants. [Smith 2010, Table 1 and Methods](https://doi.org/10.1128/AAC.00729-09) · [Paper V, Figure 8](https://files01.core.ac.uk/download/pdf/70338802.pdf) · [Reproduction script](smith-systemic-exposure.cjs)

## Paper V slope against Kably’s day-11 transplant simulations

Kably et al. collected 255 plasma samples from 50 early liver-transplant recipients. Of those, 33, 13, 3 and 1 fell in the four indexed eGFR strata from highest to lowest. Tables 3–5 report simulations in 1,000 virtual recipients per regimen (684, 236, 60 and 20 in the respective strata). The two most frequent observed regimens were 2,000 mg valacyclovir every 12 h (24 recipients) and every 8 h (17). Both are evaluated here with the nominal AyFlux model at 70 kg, varying only absolute CrCl and the CMMG renal clearance slope. Absolute CrCl is a scenario input, not a conversion from CKD-EPI eGFR. [Kably, methods and Tables 1, 3–5](https://doi.org/10.1093/jac/dkaf070)

| 2,000 mg q8h, day 11 | Parent AUC | CMMG AUC | Parent predose | CMMG predose | CMMG/parent AUC |
|---|---:|---:|---:|---:|---:|
| Kably simulation, eGFR >90 | 44.8 | 13.3 | 1.0 | 0.5 | 30.4% |
| AyFlux, CrCl 104, default slope 2 | 99.9 | 13.1 | 0.67 | 0.21 | 13.1% |
| AyFlux, CrCl 104, Paper V slope 3.7474 | 99.9 | 7.1 | 0.67 | 0.07 | 7.1% |
| Kably simulation, eGFR <30 | 88.7 | 103.1 | 3.7 | 3.8 | 129.9% |
| AyFlux, CrCl 25, default slope 2 | 335.4 | 162.8 | 7.25 | 6.10 | 48.6% |
| AyFlux, CrCl 25, Paper V slope 3.7474 | 335.4 | 93.1 | 7.25 | 3.22 | 27.8% |
| AyFlux, CrCl 15, default slope 2 | 478.0 | 353.2 | 12.49 | 13.99 | 73.9% |
| AyFlux, CrCl 15, Paper V slope 3.7474 | 478.0 | 209.7 | 12.49 | 8.03 | 43.9% |

AUC units are mg·h/L and concentrations are mg/L. Kably reports simulated median troughs and the median **individual** AUC ratio. Dividing 103.1 by 88.7 gives 116.2%, the ratio of the low-stratum AUC medians, whereas Table 5 gives 129.9%. The two summaries have different denominators. AyFlux reports central plasma at hour 264 just before a hypothetical next dose, plus the minimum over hours 240–264 in the script output.

At CrCl 25 the higher slope brings both absolute CMMG endpoints closer to the low-stratum medians despite taking the ratio farther away. At CrCl 104 the higher slope makes CMMG AUC and trough both lower than Kably’s normal-stratum medians. With 2,000 mg q12h the low-stratum CMMG AUC and trough medians were 68.8 and 2.3. At CrCl 25 AyFlux gives 108.6 and 3.62 with the default slope, or 62.1 and 1.77 with Paper V. A renal metabolite coefficient cannot correct the several-fold difference in parent exposure in the low stratum. The source provides no dialysis cases or measured anuric formation fraction. [Reproduction script with all strata and both regimens](kably-renal-slope.cjs)

## Yang 2007 course across three HD sessions

A 70-year-old man on chronic HD received 250 mg IV acyclovir at 0, 12 and 24 h, then stopped treatment. Figure 1 places the first blood draw after the third dose and before HD on day 2. The authors measured 1.6 mg/L acyclovir and 5 mg/L CMMG. The next blood draw followed four-hour HD sessions on days 2, 3 and 4. Serum acyclovir was below 0.5 mg/L and CMMG was undetectable. The paper gives no CMMG detection limit. These two assays span the entire treatment sequence. [Yang et al., pp. 883–884 and Figure 1](https://doi.org/10.1111/j.1365-4632.2007.03269.x)

The reconstruction infers 64.9 kg from the reported 500 mg/day and 7.7 mg/kg/day. It assumes one-hour infusions, starts HD at hours 48, 72 and 96, and represents serum with the nominal plasma compartments. ESRD and thrice-weekly HD are reported, but measured residual CrCl, dialyzer clearance and exact draw times are unavailable. The table uses an illustrative draw at hour 42 and a second just after the third four-hour session. Neither sample initializes the model.

| CrCl (mL/min) | HD clearance (mL/min) | ACV / CMMG before HD, mg/L | ACV / CMMG after third HD, mg/L |
|---:|---:|---:|---:|
| Source | Unknown | 1.60 / 5.00 | <0.50 / undetectable |
| 0 | 81.8 | 5.78 / 13.00 | 0.232 / 1.249 |
| 5 | 81.8 | 3.37 / 6.75 | 0.049 / 0.214 |
| 10 | 81.8 | 2.08 / 3.69 | 0.012 / 0.040 |
| 0 | 159 | 5.78 / 13.00 | 0.092 / 0.229 |

At assumed CrCl 0, moving the first draw between 36 and 48 h gives parent concentrations from 7.10 to 4.70 mg/L and CMMG from 11.99 to 13.49 mg/L. Both exceed the observed pair throughout the tested range. Assuming residual CrCl narrows the parent gap but at 10 mL/min CMMG falls below the observation. The 159 mL/min alternative comes from the separate Hara sensitivity, not a measurement in Yang. Across all six CrCl/HD combinations and draws 0, 6 or 12 h after the third session, parent stays below the reported limit. This bound cannot distinguish those clearances. A numerical error for final CMMG cannot be calculated. [Scenario runner](yang-three-hd.cjs)
