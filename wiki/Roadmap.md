# Development roadmap

Reviewed 2026-11-14 against main and the combined release candidate. Current release metadata is **v0.29.0 preview**, released 2026-11-17. This page describes priorities rather than promised release dates.

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

## Development and releases

Use the repository’s open issues and pull requests for current development status. The [release plan](Release-Plan) describes versioning and checks. Historical review branches remain separate from released code.

## Quality and research follow-up

- Continue conservation, dose/treatment-boundary and time-step checks, including interrupted PD dwells.
- Extend the independent mrgsolve comparison across repeated dosing, oral absorption and dialysis transitions.
- Match subject, route, renal function, time origin and output definition before interpreting OSP comparisons.
- Measure browser interaction and cold-load performance separately from numerical compute benchmarks.
- Keep accessible numeric outputs and desktop/mobile checks as visualizations evolve.
- Assess identifiability and data adequacy before adding fitted or machine-learning components.

A matched model comparison, synthetic recovery experiment or case reconstruction does not by itself establish clinical predictive validity.
