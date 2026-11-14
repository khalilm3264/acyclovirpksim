# Gorlitsky and Beales original-source rebound audit

Reviewed 2026-11-14 from the two supplied original PDFs, using text extraction and
visual confirmation of Gorlitsky PDF page 2/Table 1 and Beales printed page 362.
These resolve prior full-text availability gaps for Kenzaka Table 4 case 7 and
cases 32/33. None supplies a same-patient immediate end-HD concentration followed
by a delayed pre-dose/pre-next-HD concentration. Missing observations establish
that rebound is unassessable in these reports, not that rebound did not occur.
The three patients remain separate; the two Beales admission values are not a
within-patient change. No engine, parameters or benchmark counts are changed.

## Source identity and provenance

| Source | DOI / PMID | Reviewed location | SHA-256 of supplied PDF |
| --- | --- | --- | --- |
| Gorlitsky BR, Herion JT. Hemodial Int. 2017;21(3):E58–E62 | [10.1111/hdi.12534](https://doi.org/10.1111/hdi.12534); [28067468](https://pubmed.ncbi.nlm.nih.gov/28067468/) | Early-online PDF internally paginated 1–5; p.2 Table 1, Methods and Results; p.3 first paragraph | `701e2849c5e0f72fdd122d1373ba144b11e91e1a639430de492a97b9bc52acbe` |
| Beales P, Almond MK, Kwan JTC. Nephron. 1994;66(3):362–363 | [10.1159/000187841](https://doi.org/10.1159/000187841); [8190194](https://pubmed.ncbi.nlm.nih.gov/8190194/) | Printed p.362, patients 1 and 2; p.363 discussion | `c4d21cb40a7cc939c95dc6bc220fb7e7b7801da61f5e774ee3d7fd01efbf9231` |

The supplied Gorlitsky copy has provisional journal pagination (00:00–00);
final volume/issue/pages are verified by the publisher and PubMed. Source PDFs
are not included in the public repository. Bibliography anchors are
[59](../../public/index.html#ref59) and [60](../../public/index.html#ref60).

## Patient-level extraction

| Field | Kenzaka case 7: Gorlitsky | Kenzaka case 32: Beales patient 1 | Kenzaka case 33: Beales patient 2 |
| --- | --- | --- | --- |
| Patient / baseline modality | 60-year-old man, thrice-weekly in-center HD for approximately 8 years | 51-year-old man, IgA nephropathy, home HD | 56-year-old woman, home HD; prior recurrent CAPD peritonitis is history, not current treatment |
| Drug history | Prescribed **acyclovir PO 400 mg twice daily**; refill during preceding week. On day 4 patient reported taking eight 400 mg tablets (3200 mg) at once for pain. Exact ingestion clock and complete adherence history unreported | Oral ACV 400 mg four times daily; 2.4 g total reported. Pain began 4 days before presentation; symptoms after 2 days. Do not infer an exact dosing course from those relative dates | Oral ACV 800 mg twice daily; 14.4 g total reported. Rash began 9 days before presentation, confusion 8 days later |
| Prior HD | Last routine HD 3 days before presentation | Last routine HD timing unreported | Last routine HD 48 h before presentation |
| Acute HD | First 4-hour HD between day-1 and day-2 samples. Revaclear dialyzer; blood flow 500 mL/min, dialysate flow 800 mL/min, delivered online Kt/V 1.25. No HD on day 2; second 4-hour session on day 3, same parameters, before day 4 | Five-hour rescue HD, with immediate complete clinical recovery | Six-hour rescue HD and ACV stopped, with rapid complete clinical recovery |
| First concentration | Day 1 random pre-HD 8.9 µg/mL | Presentation serum ACV 10 µmol/L, 24 h after last dose | Admission serum ACV 35 µmol/L, 12 h after last dose |
| Later concentration | Day 2 after one HD: 3.0 µg/mL. Absolute difference −5.9 µg/mL, relative fall 66.3% across the **sample interval**, not a measured dialysis extraction fraction | None reported | None reported |
| Matrix | Index-patient assay matrix not explicitly specified in Table 1/Methods/Results; preserve as “ACV level,” do not assume serum/plasma equivalence | Serum explicitly reported | Serum explicitly reported |
| Immediate end-HD level | Unknown; day-2 value has unknown lag from disconnect | Unknown | Unknown |
| Delayed pre-dose/pre-next-HD level | No separate later value after day 2. Table 1 has no ACV level on days 3/4; text says no final ACV level obtained | None | None |
| Intervening dose documentation | In-hospital dosing/cessation clock not explicitly reported; do not assume a documented drug-free interval | Last dose 24 h before admission sample; subsequent dosing history not explicitly described | Drug stopped with rescue HD; no post-HD sample to pair |
| Rebound classification | Unassessable: pre-HD→next-day fall only; missing immediate end-HD anchor and later paired sample | Unassessable: one admission sample only | Unassessable: one admission sample only |

## Interpretation and secondary-source corrections

Gorlitsky's original reports oral **acyclovir**, not oral valacyclovir as labeled
in Kenzaka Table 4. The total daily prescribed dose (800 mg/day) is distinct from
the later-reported single ingestion (3200 mg). A prescription described as renal
adjusted does not establish actual adherence. The day-2 level cannot be entered
as an immediate disconnect sample, and neurological recovery after the second HD
cannot supply an unmeasured final concentration.

Beales reports two distinct patients. The five- and six-hour session lengths are
known, but the papers provide no post-HD ACV values, flow settings, measured
clearance or draw clocks. Clinical recovery is not a numerical concentration
endpoint. Generic discussion of clearance, therapeutic ranges and pharmacokinetic
models on p.363 is not a measurement in these two patients. The source's dosing
suggestions are historical author recommendations, not new AyFlux clinical advice.

These three resolved full texts add **zero assessable rebound pairs**. They do
not alter the separately documented Davenport case-2 post-treatment→next-pre-HD
rises, whose precise postdisconnect sampling delays remain unknown. This is a
three-patient source audit, not a completed primary review of all 43 Kenzaka rows
or evidence that rebound is absent from the literature. Remaining previously
listed full-text gaps were unaffected by these two uploads. The subsequent
[Adair primary audit](ADAIR-REBOUND.md) resolves cases 12/13 using recovered
scanned originals and corrects the secondary serum-assay assignment; it adds
no rebound pair. The [Krieble primary audit](KRIEBLE-REBOUND.md) resolves case
34 and verifies a flat immediate-post-HD to ten-hour pair. Gómez Campderá 16
and MacDiarmaid-Gordon 40 remain separate retrieval tasks.
