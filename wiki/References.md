# References and source maintenance

The [complete numbered bibliography](https://ayflux.org/references/) is available without opening the simulator. [Cite AyFlux](https://ayflux.org/cite/) provides software citation and BibTeX; [Model methods](https://ayflux.org/learn/model-methods/) explains which assumptions sources can support.

## Source and publication versions

- Bibliographic metadata verification does not mean the full text has been reviewed.
- Retain stable reference numbers and DOI links when metadata is corrected.
- Keep abstract-only sources labeled. Do not infer numerical model parameters from an abstract without adequate methods and units.
- Separate case reports, population models, guidelines, commentaries and preprints.
- Do not count a preprint and its final publication, or overlapping cohort reports, as independent studies.
- Identify the version actually used for a reconstruction. Vasquez Vasquez's 2024 preprint has a 2025 journal publication ([10.1002/bcp.70138](https://doi.org/10.1002/bcp.70138)). The current HD reconstruction already cites the final article; the older bibliography entry is updated to match.

The bibliography page is generated from the simulator source using `node scripts/references.cjs`; `--check` detects drift. See [reference maintenance](https://github.com/khalilm3264/acyclovirpksim/blob/main/docs/reference-maintenance.md) for this update's verification record. Track unavailable papers in [#53](https://github.com/khalilm3264/acyclovirpksim/issues/53) and manuscript alignment in [#49](https://github.com/khalilm3264/acyclovirpksim/issues/49).

## Oral valacyclovir with paired acyclovir and CMMG during HD

Hara et al. (2008), [doi:10.2133/dmpk.23.306](https://doi.org/10.2133/dmpk.23.306), is implemented in [the Hara benchmark](https://github.com/khalilm3264/acyclovirpksim/blob/main/research/validation/HARA-HD.md). Run `node research/validation/hara-hd.cjs` for the source comparison and documented assumptions.

## Bibliography export

The integration candidate adds a complete UTF-8 `.bib` catalogue containing the software citation, the numbered source entries and the additional Hara benchmark. It preserves evidence limitations in notes and omits unavailable metadata; it does not select references by scenario. Generate both the HTML and BibTeX outputs with `node scripts/references.cjs` and verify with `node scripts/references.cjs --check`. Use BibLaTeX/Biber for Unicode metadata.
