# Final baseline-HD sources: Gómez Campderá and MacDiarmaid-Gordon

Reviewed 2026-11-14 from the two supplied original PDFs after checking issue
#75 and open PRs for overlap. The printed Table 1 on Gómez Campderá p.228 and
MacDiarmaid-Gordon p.281 were rendered and independently checked. These resolve
the last two previously listed baseline-HD source-access gaps. They do not
establish precise rebound kinetics or justify pooled parameter estimates. No
engine, bibliography numbering, benchmark count or public PDF is changed.

## Original identities

| Kenzaka case | Source and location | DOI / PMID | Supplied PDF SHA-256 |
| --- | --- | --- | --- |
| 16 | Gómez Campderá FJ, Verde E, Vozmediano MC, Valderrábano F. More about acyclovir neurotoxicity in patients on haemodialysis. Nephron. 1998;78(2):228–229; p.228/Table 1 | [10.1159/000044919](https://doi.org/10.1159/000044919); [9496746](https://pubmed.ncbi.nlm.nih.gov/9496746/) | `79f8f03fea3c304402d1f92ac28e105a1d220c796939ed1cf764266ebd8d9ce9` |
| 40 = primary case 4 | MacDiarmaid-Gordon AR, O'Connor M, Beaman M, Ackrill P. Neurotoxicity associated with oral acyclovir in patients undergoing dialysis. Nephron. 1992;62(3):280–283; p.281/Table 1 and case 4 | [10.1159/000187059](https://doi.org/10.1159/000187059); [1436338](https://pubmed.ncbi.nlm.nih.gov/1436338/) | `22cdff64adbbbbaf244bf143dbb820896e56fc271a110ada6235bba27dad2223` |

The supplied filenames are `10.1159@000044919.pdf` (two pages) and
`macdiarmaid-gordon1992.pdf` (four pages). The original documents remain private.

## Case 16 — Gómez Campderá: a day-labeled post-HD to predialysis decline

The 59-year-old woman had been on HD for six years for chronic interstitial
nephropathy. Oral ACV 200 mg every 24 hours was followed by additional
ophthalmic ACV cream, one application every six hours. After approximately one
week she developed confusion, dysarthria and hallucinations. The drug was
stopped on suspicion of neurotoxicity (p.228). This is combined oral and
ophthalmic exposure; the topical absorbed dose is not measured.

Table 1 on p.228 specifies **serum ACV in µmol/L**, with an LCR (CSF) column:

| Source label | Serum ACV, µmol/L | CSF ACV, µmol/L |
| --- | --- | --- |
| Day 1, pre-HD | 44.95 | 6.72 |
| Day 1, post-HD | 22.54 | Not supplied |
| Day 2, post-HD | 3.25 | Not supplied |
| Day 3, pre-HD | 1.07 | Not supplied |
| Day 3, post-HD | 0.97 | Not supplied |

The narrative calls the assayed blood compartment plasma whereas the table
labels it serum. Preserve the table's label and that wording ambiguity; do not
assume a verified matrix-conversion factor. The CSF result is not a second
serum sample or a rebound measurement.

The initial treatment combined **an HD session and a hemoperfusion session**;
a new HD session occurred during the following 24 hours, with recovery after a
third HD described as 48 hours later (p.228). The precise reference for that
48-hour phrase and its relation to the table's day labels do not supply actual
draw clocks. Do not convert the Day 2→Day 3 row sequence into a fixed elapsed
interval. Session durations, flows, prescription, exact HD end times and delays
from disconnect to the post-HD samples are not reported. The first fall is not
an HD-only removal endpoint because hemoperfusion also intervened.

The **Day 2 post-HD 3.25→Day 3 pre-HD 1.07 µmol/L** sequence is a same-patient,
day-labeled **net decline** after drug withdrawal (calculated change −2.18
µmol/L, −67.1%). It gives no evidence of a net rise between these endpoints,
but cannot exclude an intervening transient increase and decrease. The table
places the later sample before the next reported treatment; exact elapsed hours
and the earlier disconnect-to-draw lag remain unknown. Oral/ophthalmic ACV
withdrawal precedes the treatment course and no new administration is reported.
No clearance constant, early rebound amplitude or kinetic half-life is inferred.

## Case 40 — MacDiarmaid-Gordon: two postdialysis rows with unresolved pairing

Primary case 4 is a 56-year-old man on HD for 12 months, corresponding to
Kenzaka case 40 by age, sex and modality (p.281). Oral ACV was prescribed at
400 mg five times daily. The narrative reports **18 doses of 400 mg over five
days** at presentation (7200 mg by arithmetic), whereas Table 2 prints a total
15,200 mg for this case. Preserve that internal dose-history discrepancy rather
than selecting an unverified reconstruction. ACV was stopped; the discussion
states that ACV was the only drug stopped during these episodes (pp.281–282).

Table 1 on p.281 gives **serum ACV in µmol/L**:

| Exact row context | Serum ACV, µmol/L |
| --- | --- |
| Day 1, presentation | 14.55 |
| Day 2, pre-dialysis | 5.08 |
| Day 3, post-dialysis | 2.18 |
| Day 4, post-dialysis | 0.18 |

Both last rows are labeled **post-dialysis**. The source does not establish
whether those draws relate to the same session, whether another session
intervened, or their delays from individual disconnects. The Day 2 pre-dialysis
and Day 3 post-dialysis rows likewise do not establish a precisely paired
single-session extraction fraction. Do not silently relabel Day 4 as predialysis
or turn its day label into an exact 24-hour drug-free interval.

The narrative describes the usual protocol for HD cases 2–4 as eight hours,
three times weekly; case 4 used a Gambro Lundia 3N dialyzer and bicarbonate
buffer (p.281). A usual prescription is not a session/draw timestamp. Blood and
dialysate flows and actual start/end clocks are unreported. Symptoms improved
the day after admission and further after dialysis, with discharge after four
days. Clinical improvement does not resolve the missing session identities.
Thus the measured concentrations decline across the reported course, but **no
single-session end-HD to delayed rebound pair is established**.

Only case 4 supplied numeric ACV measurements in this four-case report
(pp.281–282). Do not count the other three patients as independent concentration
profiles or use the unmeasured CAPD addendum as another assay series.

## Three distinct directional patterns, without pooling

| Pattern | Same-patient observations | Timing qualification / source |
| --- | --- | --- |
| Rise | Davenport case 2: 5→8 and 3→5 µmol/L | Two between-session intervals in **one patient** after drug cessation; precise postdisconnect delays and elapsed hours unknown. [Existing source transcription](RESULTS.md#davenport-1992-washout-during-rapid-cycle-pd), [runner](davenport-dialysis-washout.cjs) |
| Fall | Gómez Campderá: 3.25→1.07 µmol/L | Day 2 post-HD→Day 3 pre-HD; earlier sample's disconnect lag and elapsed hours unknown; first treatment also involved hemoperfusion. p.228/Table 1 above |
| Flat at printed precision | Krieble: 5.6→5.6 µg/mL | Immediate post-four-hour-HD→ten hours later, after ACV withdrawal. [Primary audit](KRIEBLE-REBOUND.md) |

These entries differ in units, matrices, treatment context and timing certainty.
They are not exchangeable observations for an average rebound fraction or a
pooled clearance/redistribution estimate. None records a continuous interval
trajectory. The rise, net fall and flat paired endpoints must be retained
separately; absence of sampled intervening peaks does not prove their absence.
MacDiarmaid-Gordon's unresolved postdialysis rows remain outside that paired
comparison. No calibration or parameter change follows from this sparse audit.

The [five-source secondary queue](SECONDARY-QUEUE-REBOUND.md) was separately
completed with Chevret. The current two reports close the remaining named
baseline-HD retrieval tasks, not a claim that every one of Kenzaka's 43 rows has
been independently validated or that the literature lacks rebound.
