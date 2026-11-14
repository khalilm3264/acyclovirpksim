# Krieble 1993 original-source post-HD paired sampling audit

Reviewed 2026-11-14 from the supplied scanned original; printed pp.36–38 were
rendered and visually checked. This resolves the case-34 source-access gap and
provides **one assessable immediate-end-HD to delayed concentration pair** with
no net change at the reported precision. It does not establish the unobserved
trajectory between those two samples. No model or parameter changes follow.

## Identity and provenance

Krieble BF, Rudy DW, Glick MR, Clayman MD. **Case report: acyclovir neurotoxicity
and nephrotoxicity—the role for hemodialysis.** Am J Med Sci. 1993 Jan;305(1):36–39.
[DOI 10.1097/00000441-199301000-00007](https://doi.org/10.1097/00000441-199301000-00007);
[PMID 8416680](https://pubmed.ncbi.nlm.nih.gov/8416680/).

The user's `krieble1993.pdf` is a four-page image scan of this original, not an
unrelated file: 486,630 bytes, SHA-256
`5c31a7e10a7fac5507a92277e2aee6405d5b39fcd7a4f8f2a699b373b7b9b738`.
Blank ordinary text extraction does not identify or exclude a scanned paper.
The source PDF remains private; the public repository contains only this audit.

Kenzaka Table 4 case 34 cites this paper as reference 33 but lists a 77-year-old
woman with no comorbidity. Primary p.36 instead describes a **48-year-old man,
83 kg, with newly diagnosed AIDS**, disseminated herpes zoster and subsequent
acute renal failure. Preserve the published secondary row and flag the identity
conflict; do not treat its demographics as verified primary data or invent a
second patient in this single-case report.

## Dose, treatment and sampling sequence

| Event | Primary evidence and location |
| --- | --- |
| Initial exposure | IV ACV 1 g (12 mg/kg) infused over one hour every eight hours, begun the night of admission; total 5 g given before withdrawal on hospital day 3 (p.36) |
| Renal course | Creatinine 1.0 mg/dL initially, 5.0 on day 3, 8.4 on day 4; preceding 24-hour urine output 1500 mL on day 4. A measured residual CrCl is not supplied (p.36) |
| Acute HD | On hospital day 4, four hours using hollow-fiber CF Capillary Flow Dialyzer Model 15.11, Baxter; blood flow 350 mL/min, dialysate flow 400 mL/min (p.36) |
| Before HD | **Plasma** ACV 9.6 µg/mL, immediately before HD, **54 hours after last dose** (p.36 concentration; p.38 precise dose/draw interval) |
| At end of HD | Plasma ACV **5.6 µg/mL immediately after HD** (p.36 concentration; p.38 explicit immediate timing) |
| Delayed draw | Plasma ACV **5.6 µg/mL ten hours later** (pp.36 and 38). Context places this after the immediate post-HD value |
| Intervening dose / HD | ACV withdrawal precedes the session; no subsequent ACV dose reported during the measured interval. No further HD required (p.36). The report describes no intervening drug input or second session |
| Assay | Reversed-phase high-performance liquid chromatography with ultraviolet detection (p.36) |
| Clock limitations | Hospital day and relative sample times are given; calendar dates and exact wall-clock HD start/end are not. The first and delayed post-HD draws have an explicit ten-hour relative separation |

All three values are **plasma ACV**, in µg/mL (numerically equal to mg/L).
They are not serum, whole blood, µmol/L or CMMG. Figure 1 on p.37 shows urine
crystals, not a pharmacokinetic curve; there are no intermediate post-HD assay
points to digitize.

## Direct paired endpoints and limits

- Pre-HD to immediate post-HD: 9.6→5.6 µg/mL, a calculated 41.7% concentration
  fall, consistent with the authors' rounded 42%. This is a concentration
  reduction, not an independently measured fraction of total body drug removed.
- Immediate post-HD to ten hours later: **5.6→5.6 µg/mL**, calculated change
  0.0 µg/mL / 0% at the printed precision. This is a same-patient, no-new-dose
  paired interval with no observed net change, not evidence that there was no
  transient rise and fall during the intervening ten hours.
- The authors state an intradialytic half-life of **4.9 hours** (p.38). Using
  only their printed four-hour duration and rounded 9.6/5.6 endpoints gives
  `4 ln(2) / ln(9.6/5.6) = 5.14 hours`. Keep these separately labeled; the
  rounded endpoints do not exactly reproduce the author-stated half-life.

No assay imprecision, intermediate curve or simultaneous dialysate recovery is
provided. The unchanged delayed concentration cannot identify endogenous
clearance, redistribution or assay error separately. The author's interpretation
of little endogenous clearance is therefore distinct from the direct
observation of a flat two-point interval. This newly verified pair changes the
prior zero-verified-pair source screen; Adair's two cases remain unassessable and
Davenport's two between-session rises remain sequence-qualified with unknown
postdisconnect delays. Do not combine those different timing endpoints into a
single kinetic inference or conclude that rebound is universally absent.
