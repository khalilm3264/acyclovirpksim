# Development roadmap

Reviewed 2026-11-14 against main and the combined release candidate. Current release metadata is **v0.27.0 preview**, released 2026-11-13. This page describes priorities rather than promised release dates.

## Already available

ECharts concentration and clearance charts, baseline comparison, unit switching, shared scenario links, import history, time-varying kidney input, an optional visual explorer, Lite, CSV/XLSX export, published-evidence comparison scripts, pediatric IV research and sampling experiments. See [Home](Home) and [Research modules](Research-Modules).

## Scientific priorities

| Priority | Work | Tracking and completion criteria |
| --- | --- | --- |
| P0 | Review CMMG formation and clearance at CrCl zero | [#46](https://github.com/khalilm3264/acyclovirpksim/issues/46); identify the mechanism, compare with measured evidence and retain mass/units checks |
| P0 | Recalibrate exploratory CSF CMMG partition | [#47](https://github.com/khalilm3264/acyclovirpksim/issues/47); Delivered in #88–#89: default 0.025 (Smith 2010), checked against Lindström 2019 with an intact barrier; exploratory damaged-barrier preset fitted to that study. Further work: evaluate the damaged preset on additional data |
| P0 | Freeze the manuscript model version | [#48](https://github.com/khalilm3264/acyclovirpksim/issues/48); record commit, settings, source versions, scripts and reproducible outputs |
| P1 | Align manuscript and website references | [#49](https://github.com/khalilm3264/acyclovirpksim/issues/49); stable DOI mapping and explicit case/cohort overlap |
| P1 | Extend dialysis evidence comparisons | [#50](https://github.com/khalilm3264/acyclovirpksim/issues/50), [#51](https://github.com/khalilm3264/acyclovirpksim/issues/51); Hara measurements and Laskin renal/nonrenal split with study-specific assumptions |
| P1 | Complete full-text review | [#53](https://github.com/khalilm3264/acyclovirpksim/issues/53); distinguish bibliographic verification, abstract review and reviewed full text |
| P1 | Replayable literature cases | [#54](https://github.com/khalilm3264/acyclovirpksim/issues/54); keep observed samples, author-fitted values and reconstructed inputs distinct |

## Current integration candidate

- Combine #101 benchmark/usability changes with main's #109 export/print and ECharts work.
- Retain #104's unique event table and teaching note; use #103's existing print preview.
- Include #107 academic exports and #110's unavailable-data corrections on top of #108.
- Check the combined export menu, mobile/desktop, clipboard fallback, single-page PDF and first-load offline cache installation.
- Re-run the immutable benchmark pins. UI changes must not alter either the manuscript snapshot or current engine blob.
- Review the combined candidate before merging; verify production and publish wiki sources after deployment.

## Planned release work

[v0.27.0 release tracking (#55)](https://github.com/khalilm3264/acyclovirpksim/issues/55) follows the [release checklist](Release-Plan). Release labels change only when the release is deliberately prepared. Documentation should describe pending functionality as pending.

Open PR dependencies and overlap are recorded in the repository's [maintenance plan](https://github.com/khalilm3264/acyclovirpksim/blob/main/docs/repository-maintenance.md). The live PR state takes precedence over that dated snapshot. Drafts and closed unmerged branches require review before their work is discarded or merged.

## Quality and research follow-up

- Continue conservation, dose/treatment-boundary and time-step checks, including interrupted PD dwells.
- Extend the independent mrgsolve comparison across repeated dosing, oral absorption and dialysis transitions.
- Match subject, route, renal function, time origin and output definition before interpreting OSP comparisons.
- Measure browser interaction and cold-load performance separately from numerical compute benchmarks.
- Keep accessible numeric outputs and desktop/mobile checks as visualizations evolve.
- Assess identifiability and data adequacy before adding fitted or machine-learning components.

A matched model comparison, synthetic recovery experiment or case reconstruction does not by itself establish clinical predictive validity.
