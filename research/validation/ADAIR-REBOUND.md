# Adair 1994 original-source case mapping and rebound audit

Reviewed 2026-11-14 from the user's supplied scanned original, after checking
issue #75 and open PRs for overlap. This resolves the prior Adair full-text gap
and corrects the secondary-source case assignment. No concentration-time model,
parameter, clinical threshold or benchmark count is changed. No PDF is included
in this public repository.

## Source identity and retrieval

Adair JC, Gold M, Bond RE. **Acyclovir neurotoxicity: clinical experience and
review of the literature.** South Med J. 1994 Dec;87(12):1227–1231.
[DOI 10.1097/00007611-199412000-00006](https://doi.org/10.1097/00007611-199412000-00006);
[PMID 7973922](https://pubmed.ncbi.nlm.nih.gov/7973922/).

The source bundle's exclusion list names `adair1994.pdf` and
`adair1994 - Copy.pdf`. Both original files were recovered from the user's
retained files and inspected, rather than identifying them from filenames.
They are byte-identical copies of the correct five-page original article:
472,657 bytes each, SHA-256
`e00c648774de49175ab9de5d12e9670490564d27525bc6d8143ff36cfb116ed1`.
PDF pages 1–5 correspond to printed pages 1227–1231. They are image scans;
ordinary text extraction returns no article text. Rendering and OCR, followed by
visual checks of printed pp.1227–1229, establish identity and the measurements
below. Blank text extraction is not evidence that the original is unrelated or
absent. The official publisher's public page supplies only the abstract and a
member/purchase gate; the extraction here uses the user's existing copies.

## Primary patient timelines

| Field | Primary case 1 = Kenzaka Table 4 case 12 | Primary case 2 = Kenzaka Table 4 case 13 |
| --- | --- | --- |
| Identity | 70-year-old woman, dialysis-dependent renal failure due to Wegener's granulomatosis, thoracic varicella-zoster dermatitis (p.1227) | 64-year-old woman, irreversible renal failure after hemolytic-uremic syndrome, requiring HD (p.1228) |
| Exposure | Seven oral 200-mg ACV doses over two days before abrupt mental-status change: **1400 mg total**, not a verified 1400 mg/day prescription (p.1227) | Oral ACV 200 mg three times daily, initiated on hospital day 2 for vesicular lip lesions suggestive of HSV; lethargy and disorientation the following day (p.1228) |
| Earlier dialysis | Laboratory comparison refers to predialysis values two days earlier (p.1227); no detailed preceding prescription | An admission HD session relieved uremic symptoms before ACV began; admission BUN 106 mg/dL and creatinine 8.8 mg/dL (p.1228) |
| Withdrawal / intervention | ACV discontinued on admission, observed overnight without appreciable neurologic change; routine dialysis next morning, recovery within hours, discharge the following day (p.1228, first paragraph) | Dialysis after neurologic evaluation, plus plasma exchange for concern about thrombotic thrombocytopenic purpura; neurologic function returned to baseline the following day (p.1228) |
| Numeric ACV concentration | **No numeric ACV concentration reported in this case narrative** | **Serum ACV 9.0 µg/mL before dialysis, 12 hours after last dose** (p.1228, case 2 closing paragraph). Equivalent to 9.0 mg/L, not 9.0 µmol/L |
| HD end / duration | Not reported | Not reported |
| Immediate end-HD concentration | Not reported | Not reported |
| Delayed post-HD / pre-next-HD concentration | Not reported | Not reported |
| Intervening doses | Explicit cessation before the next-morning dialysis; exact last-dose clock not given | Predialysis sample anchored 12 h after last dose; subsequent dose/cessation clock not explicit. No post-HD sample to pair regardless |
| Rebound assessment | Unassessable: no numerical paired concentration sequence | Unassessable: one pre-HD concentration; no end-HD or delayed post-HD values |

Clinical recovery is distinct from a measured concentration endpoint. Plasma
exchange in primary case 2 is an additional intervention, not an ACV assay or a
documented HD-only removal fraction. No mathematical fall or rise can be
calculated from these patients' concentration data.

## Secondary-source reconciliation

Kenzaka's [2021 original Table 4](https://doi.org/10.1097/MD.0000000000026147),
printed p.5, identifies case 12 as the 70-year-old woman and case 13 as the
64-year-old woman, both citing Adair as reference 3. That patient mapping is
consistent with the primary narratives. However, Kenzaka marks serum ACV
measurement **Yes for case 12 and No for case 13**. The independently verified
numeric result is instead in Adair **case 2 / Kenzaka case 13**. Preserve the
published flags in any secondary inventory, but flag the conflict; do not
transfer 9.0 µg/mL to the 70-year-old patient. Absence of a reported result for
case 1 does not prove that an assay was never performed.

Kenzaka's case-12 dosage field is 1400 mg/day. Primary p.1227 describes seven
200-mg doses during two days, establishing a total 1400 mg exposure, without
establishing that daily dose. The primary's own Table 1 (p.1229) lists both index
cases but has no concentration column. Its case-2 indication is VZV, whereas the
case narrative on p.1228 describes suspected HSV lip lesions; preserve that
internal discrepancy rather than silently treating the table as a different
patient.

The article also reviews earlier cases. Aggregate serum ranges and recovery
times on pp.1228–1229, and literature-derived HD removal statements on p.1230,
are not additional measurements in the two index patients and must not be
recounted as independent new observations. This review adds **zero assessable
post-HD rebound pairs**, while resolving the retrieval blocker and correcting
which index patient has the documented predialysis assay. It does not change
Davenport's separately documented between-session rises or establish absence
of rebound from the literature.
