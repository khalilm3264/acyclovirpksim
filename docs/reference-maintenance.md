# Reference maintenance

Reviewed 2026-11-13 against main at `33f8a0108427e8a15e1a882b21a5e7461e192307`.

## Bibliography source

The numbered bibliography remains in `public/index.html`. `node scripts/references.cjs` generates `public/references/index.html` from those entries and the citation page shell. CI runs the script with `--check` to detect drift. Edit the source entries, regenerate the page and update the sitemap when routes change. Reference anchors remain stable; existing study and in-page citation links keep their numbers.

## Metadata verified in this update

Publisher or PubMed records were checked for journal, volume, issue and pages/article number for references 24 and 26–37. The existing titles, DOI identities and evidence limitations are retained. Adding publication metadata does not imply a new full-text review.

| References | Primary bibliographic records |
| --- | --- |
| 24 | https://academic.oup.com/jac/issue/74/6 |
| 26 | https://pubmed.ncbi.nlm.nih.gov/19414579/ |
| 27 | https://pubmed.ncbi.nlm.nih.gov/8593015/ |
| 28 | https://pubmed.ncbi.nlm.nih.gov/8275615/ |
| 29 | https://academic.oup.com/jac/issue/80/5 |
| 30 | https://pubmed.ncbi.nlm.nih.gov/12021536/ |
| 31 | https://pubmed.ncbi.nlm.nih.gov/8893152/ |
| 32 | https://doi.org/10.1016/j.biopha.2022.113852 |
| 33 | https://pubmed.ncbi.nlm.nih.gov/26101355/ |
| 34 | https://pubmed.ncbi.nlm.nih.gov/38775304/ |
| 35 | https://pubmed.ncbi.nlm.nih.gov/40652445/ |
| 36 | https://pubmed.ncbi.nlm.nih.gov/7102702/ |
| 37 | https://pubmed.ncbi.nlm.nih.gov/7102703/ |

## Publication status correction

Reference 22 previously described only the 2024 Vasquez Vasquez preprint. The final case is published in *British Journal of Clinical Pharmacology* 2025;91(8):2469–2473, DOI https://doi.org/10.1002/bcp.70138, PubMed https://pubmed.ncbi.nlm.nih.gov/40511631/. The existing `research/validation/VASQUEZ-HD.md` already cites that final article. The bibliography now leads with the final publication and retains the preprint as publication history. These are one case, not independent cohorts. No numerical reconstruction or benchmark output is changed.

## Added 2026-11-13

[45] Helldén 2007, *BMJ* 335:1305, checked against the full text (printed page 1305). [46] Helldén 2010 thesis, checked against the open-access copy at core.ac.uk: title, year and ISBN 978-91-7409-994-2 from the title page. Both support the CMMG benchmarks; neither is used to fit a parameter.

## Evidence boundaries

References 38–39 retain abstract-only labels. Full-text collection remains tracked in issue #53. Cohort overlap, source-author fitted values, model assumptions and limited pediatric/dialysis applicability remain explicit. Do not introduce fixed clinical toxicity or efficacy thresholds from model-only analyses.

Manuscript alignment is tracked in issue #49. Match DOI identities and publication versions rather than assuming manuscript numbering equals website numbering.

## Added 2026-11-14

References 52–56 preserve five sources from the older reference PR after comparison
with the current bibliography. Existing anchors remain stable. Publisher/PubMed
identities and supplied full-text PDFs were checked for the stated scope.

| Reference | Source | Scope constraint |
| --- | --- | --- |
| 52 | Davenport 1992, DOI 10.1016/S0272-6386(12)70234-2 | Case trajectories and concentration changes around HD |
| 53 | Strong 1997, DOI 10.1007/s004670050379 | Pediatric pre/post-dose samples after HD |
| 54 | Berry 2014, DOI 10.1016/j.jcv.2014.09.001 | CSF day 5 and serum day 8 with intervening changes |
| 55 | Yang 2007, DOI 10.1111/j.1365-4632.2007.03269.x | Limited serum sampling over three HD sessions |
| 56 | Ueno 2025, DOI 10.7759/cureus.92365 | Whole blood sampled 5 h 40 min apart around four-hour HDF |

These entries add source coverage. Benchmark point counts and fitted model
parameters are separate records. HTML and BibTeX are regenerated together.
