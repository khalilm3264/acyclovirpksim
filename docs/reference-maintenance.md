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

## Evidence boundaries

References 38–39 retain abstract-only labels. Full-text collection remains tracked in issue #53. Cohort overlap, source-author fitted values, model assumptions and limited pediatric/dialysis applicability remain explicit. Do not introduce fixed clinical toxicity or efficacy thresholds from model-only analyses.

Manuscript alignment is tracked in issue #49. Match DOI identities and publication versions rather than assuming manuscript numbering equals website numbering.
