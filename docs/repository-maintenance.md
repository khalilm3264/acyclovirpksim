# Repository maintenance and integration plan

Reviewed 2026-11-13. This is a dated review snapshot; live PR and issue state takes precedence. Current release metadata remains v0.26.0 preview; v0.27.0 is planned.

## Open work

| PR | Work | Base branch | Integration note |
| --- | --- | --- | --- |
| [#60](https://github.com/khalilm3264/acyclovirpksim/pull/60) | Dialysis studies in the scorecard, predicted-vs-observed figure and CSV | `study-overlay-scorecard` | After #58; compare scorecard/study changes with #57. |
| [#59](https://github.com/khalilm3264/acyclovirpksim/pull/59) | Add experimental tab and neonatal acyclovir explorer | `main` | Separate experimental neonatal work; source/model review before release. |
| [#58](https://github.com/khalilm3264/acyclovirpksim/pull/58) | Published-study overlay, evidence scorecard and CMMG/acyclovir AUC ratio | `hd-timing-guided-scenarios` | After #44; parent of #57 and #60. |
| [#57](https://github.com/khalilm3264/acyclovirpksim/pull/57) | Add replayable literature cases and background research sweeps | `study-overlay-scorecard` | After #58; reconcile overlap with #60 before merging. |
| [#45](https://github.com/khalilm3264/acyclovirpksim/pull/45) | chore: scaffold githubclip config and personas | `main` | Optional GitHubclip scaffold; requires an explicit decision to adopt it. |
| [#44](https://github.com/khalilm3264/acyclovirpksim/pull/44) | Guided scenarios, HD timing explorer, scenario summary; changelog and README overhaul | `main` | Review guided scenarios and HD timing first; parent of #58. |
| [#29](https://github.com/khalilm3264/acyclovirpksim/pull/29) | Update dialysis and CSF pharmacokinetic references | `main` | Reconcile bibliography changes with current sources and the metadata maintenance update. |
| [#28](https://github.com/khalilm3264/acyclovirpksim/pull/28) | Add Ito adult CHDF case figure to Research tools | `main` | Check overlap with the newer published-study overlays. |
| [#27](https://github.com/khalilm3264/acyclovirpksim/pull/27) | Plot the Laskin anuric acyclovir benchmark with optional calibration overlay | `main` | Check overlap with the newer published-study overlays. |
| [#18](https://github.com/khalilm3264/acyclovirpksim/pull/18) | Benchmark plasma concentration chart rendering in Chromium | `main` | Historical renderer benchmark; reassess relevance after ECharts migration. |
| [#14](https://github.com/khalilm3264/acyclovirpksim/pull/14) | Research: external CAPD validation, CMMG renal cohorts and BBB evidence audit | `main` | Review science notes for material absent from current evidence pages. |
| [#12](https://github.com/khalilm3264/acyclovirpksim/pull/12) | Research draft: AyFlux dialysis PK benchmarks, ablations and journal strategy | `main` | Research draft; preserve useful methods/strategy notes without replacing the manuscript. |
| [#10](https://github.com/khalilm3264/acyclovirpksim/pull/10) | Expand AyFlux wiki with practical user and research guides | `main` | Review older wiki expansion against the refreshed wiki source; salvage useful guidance. |

## Dependency order

Review #44 → #58 first. Both #60 and #57 branch from #58; reconcile their overlapping study/scorecard work, then rebase and run the combined tests. A correct dependency order does not establish that each PR is ready. Check changed results, source provenance, units, model assumptions, export behavior and browser checks before each merge.

## Closed unmerged work to preserve for review

- [#37](https://github.com/khalilm3264/acyclovirpksim/pull/37): Compare the CRRT clearance component with Collignon measurements.
- [#36](https://github.com/khalilm3264/acyclovirpksim/pull/36): Present benchmark results and model architecture on the Methods page.
- [#35](https://github.com/khalilm3264/acyclovirpksim/pull/35): Consolidate benchmarks and compare clearance-volume sensitivity across studies.
- [#34](https://github.com/khalilm3264/acyclovirpksim/pull/34): Compare serum and CSF predictions with the Bataille hemodialysis case.
- [#33](https://github.com/khalilm3264/acyclovirpksim/pull/33): Benchmark measured acyclovir and CMMG at two sampling times.
- [#31](https://github.com/khalilm3264/acyclovirpksim/pull/31): Compare timed CAPD and urinary recovery after oral valacyclovir.
- [#30](https://github.com/khalilm3264/acyclovirpksim/pull/30): Benchmark acyclovir recovery against an intermittent hemodialysis case.

Closed status does not prove work is obsolete. Compare each branch's unique changes with main and the newer evidence implementation before deleting it.

## Branch housekeeping

The audit found 29 branch heads unchanged since their PRs were merged. Before cleanup, recheck the exact head SHA, confirm no open PR uses the branch as a head or base, and preserve a mapping to the merged PR/commit. `readable-code-review` has unique commits and should remain for review. This documentation update does not delete branches or close research PRs.

## Repository identity

Suggested About description: **Browser-based acyclovir and valacyclovir pharmacokinetics simulator for kidney function and dialysis, teaching and exploratory research.** Homepage: https://ayflux.org/. Topics: `pharmacokinetics`, `acyclovir`, `valacyclovir`, `dialysis`, `hemodialysis`, `peritoneal-dialysis`, `crrt`, `simulation`, `echarts`, `educational`.

Issue #56 tracks About metadata. Issue #55 tracks the next release. Keep draft feature work out of released-feature claims, and identify an exact commit for manuscript reproducibility (#48). The wiki source and live Wiki should be synchronized after approved documentation changes.
