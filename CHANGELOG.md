# Changelog

All notable changes to AyFlux are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/) with a `preview` label while the project is pre-1.0.

Three things are versioned separately:

- **Application version** (this file, `public/assets/ayflux-version.js`, `CITATION.cff`).
- **Configuration schema** for saved JSON files, currently **2**. It changes only when saved files would stop loading.
- **License**, AGPL-3.0-only.

Every entry states whether pharmacokinetic equations, parameters or defaults changed. If an entry does not say so, they did not.

## [Unreleased]

### Security and privacy

- The third-party measurement pixel is removed. It was disabled in #43 but every page still loaded `measurement-pixel.js`, and the Worker's Content Security Policy still allowed its two external hosts. The script, its tag on each page and those policy entries are gone, so the policy now allows same-origin scripts and connections only.
- The Cloudflare deploy action is pinned to a commit instead of a moving tag, because that step receives the Cloudflare API token.

## [0.27.0] - 2026-11-13 (preview)

Everything merged to `main` since 0.26.0 ([full comparison](https://github.com/khalilm3264/acyclovirpksim/compare/b928978...v0.27.0)).

**Model and data, checked against 0.26.0 before release.**
- **Concentrations unchanged.** Simulated plasma, CSF and CMMG concentrations are identical to 0.26.0 for the same settings in every dialysis mode, including runs that end partway through a PD dwell.
- **Drug-removed accounting.** Drug removed by dialysis and the mass-balance check are now integrated within the same RK4 step as the concentrations, and PD drains are recorded when each dwell ends. Reported amounts removed change by at most about 0.05% in the default scenarios, and the mass-balance error is now zero instead of up to 0.17 mg.
- **Two new optional inputs.** Probenecid (off by default; multiplies renal acyclovir clearance by 0.68, from Laskin 1982 [41]) and the body surface area used only by the label kidney-adjustment comparison.
- **Configuration schema stays 2.** Files saved by 0.26.0 load unchanged; the new fields default to off and not provided.

### Documentation (#61)

- Refreshed README and wiki source around the merged interface and research features.
- Added a synchronized standalone bibliography, linked from the guide, citation page and simulator; completed journal metadata and recorded the final Vasquez Vasquez case publication while preserving the reconstruction's preprint provenance.
- Added reference maintenance and repository dependency notes. Scientific coefficients and simulation results are unchanged.

### Added

- Replayable Laskin and Smith literature cases with DOI provenance, published endpoints, importable scenario JSON and a CMMG CSF coefficient comparison. Heatmaps and HD timing sweeps now run in a dedicated worker and report elapsed time. PD interruption tests verify cavity retention and drainage accounting.


- **Graph navigation.** Click and drag zooms into a box by default with a mouse or trackpad; double-click resets. The toolbar adds pan, zoom in/out, undo and image download, and Shift + scroll zooms the time axis. Touch screens keep page scrolling and use the toolbar. (#40)
- **Version history for imports.** Every JSON import, shared link, guided scenario and reset first stores the settings it replaces. *Undo last import* and a 10-entry history restore them. History lives only in the open tab. (#40, #42, #44)
- **Shareable links.** *Copy shareable link* puts the scenario into the link itself after `#s=`. Nothing is uploaded; opening a link runs the same validation as a JSON import and removes the scenario from the address bar. Links never contain measured concentrations. Format documented in `docs/data-exchange.md`. (#42)
- **Concentration units.** A *Units* selector switches graphs, the summary and the dialysis comparison table between mg/L and µmol/L (acyclovir 225.21 g/mol, CMMG 239.19 g/mol). The simulation, exports, saved files, Model validation and Research tools stay in mg/L. (#42)
- **Time above a level.** Hours the selected scenario's median plasma curve is above a level you enter. No default level is offered; it is a descriptive statistic, not a target. (#43)
- **Accumulation ratio.** Plasma peak after the last dose relative to the peak after the first, for the median curve. (#44)
- **Scenario description.** A one-line plain-language summary of the selected scenario above the summary tiles, including dose in mg/kg for repeat dosing. (#44)
- **Guided scenarios.** Three teaching presets on Research tools that load a scenario, open the Concentration tab and show a dismissible note on what to look at. The regimens are deliberately unadjusted illustrations, not recommendations. (#44)
- **Hemodialysis timing explorer.** Moves one HD session hourly across the first 96 hours and reruns the scenario with nominal parameters each time, plotting drug removed and plasma AUC against session start time. The simulation keeps its full duration, kidney-function trajectory and dose schedule. (#44)
- **Kidney injury example** for the custom CrCl trajectory editor: steady to the halfway point, a fall to one fifth by three quarters, then steady. Illustrative only. (#43)
- **Compare with a published study.** A selector above the plasma graph loads a published regimen (Laskin 1982 normal kidney function [41], Laskin 1982 anuric [1], or the US label 5 and 10 mg/kg q8h means [10]) and draws the published group means as dots. The points hide, with a note, as soon as the settings no longer match the study. The previous settings go to version history. Overlay state is not saved in files or links.
- **Evidence scorecard** on References & methods. For each published study above: predicted/observed geometric mean ratio of the nominal curve, and how many published means fall inside the 90% model interval from 400 draws. Calculated in the browser when the tab opens and recalculated if calibration multipliers change. No study is used to fit anything.
- **What did the study report?** Loading a published case shows each input needed to reproduce it, marked Reported, Calculated, Assumed or Unknown, with the source or reason. Recorded so far for the Vasquez Vasquez HD case and the three Boelaert CAPD subjects; the scorecard gains a column with the counts per study and says "Not yet recorded" for the rest. Each input now shows what the paper reports alongside what AyFlux uses, and the panel states the source checks still pending (the final Br J Clin Pharmacol 2025 version of Vasquez Vasquez; the original Boelaert 1987 paper). From #68: readers can vary the one unreported assumption for each case (Vasquez last-dose-to-admission gap, 0–24 h; Boelaert residual CrCl, 0–30 mL/min). Exploring saves the original reconstruction as a regimen when there is room, leaves the published values unchanged, hides the measured points because the settings no longer match, and can be undone.
- **Prediction exercise** in Compare regimens. With two or more saved regimens, hide results, ask which has the highest trough, peak, acyclovir AUC or CMMG AUC, record a prediction, then reveal. While hidden, the concentration graphs, summary values and comparison table are covered and the table shows each regimen's dose and dialysis timeline instead of its numbers.
- **Compare regimens** on the Concentration tab. Save up to four named regimens; each keeps a frozen copy of its inputs and median curves, so later edits leave it unchanged. The table compares them with the current settings over one common window (0 to the shortest simulation): plasma acyclovir AUC (mg·h/L), peak, trough (plasma acyclovir at the start of the last dose before the window ends, with its hour), plasma CMMG AUC (mg·h/L) and peak CMMG. Saved curves are drawn dashed on the plasma acyclovir and CMMG graphs.
- **Dose timing around hemodialysis.** Previews, then applies on request, the label rule for intermittent HD: IV acyclovir adds one dose at the end of each session and keeps scheduled doses [10]; oral valacyclovir moves that day's scheduled dose to the end of the session [8]. Current and proposed dose times are shown side by side, with flags for a dose that would overlap another, fall outside the simulation, or have no session match. A moved valacyclovir dose landing within an hour of the next one blocks applying. Not offered for peritoneal dialysis, where the acyclovir injection label says no supplemental dose appears necessary. Doses that would start within 1 hour of each other are flagged under an AyFlux interface rule (not a label rule; the labels set no minimum spacing): the flag only asks for review when the IV label requires the added dose, and blocks applying when a valacyclovir move would crowd the next dose.
- **Errors by sample type and time since dose** on References & methods: predicted/observed for every published value against hours since the most recent dose, with a line at 1, twofold lines, and markers for peak, trough, post-infusion, HD-inlet and serial samples as each source reports them. A table under the figure gives each study's median predicted ÷ observed, range, direction (all below 1, all above 1, or mixed) and its reported peak and trough ratios, marking author-fitted values from the study's recorded provenance, so readers can see which studies share the pattern and which differ (from #71).
- **Label kidney adjustment** in the Medication controls. For a repeating every-8-hour IV acyclovir regimen at a constant CrCl, one button applies the US injection label band (100% every 12 h at >25–50 mL/min/1.73 m², every 24 h at >10–25, 50% every 24 h at ≤10) [10]. Body surface area must be entered to convert absolute CrCl to the label's indexed units. The previous curve is kept as the baseline and the previous settings go to version history. Oral valacyclovir is not adjusted automatically because its label bands depend on indication. Teaching comparison only.
- **Probenecid option.** Lowers renal acyclovir clearance by 32% in every parameter draw, as measured by Laskin et al. in three adults [41]; CMMG clearance is unchanged. Off by default, so default outputs and every validation result are unchanged.
- **Dialysis and single-patient studies** in the study comparison and scorecard: Boelaert 1987 CAPD patients 1, 4 and 5 (author-fitted peaks and troughs) [6], Vasquez 2025 intermittent HD (4-hour admission gap assumed) [22], and Kacirova 2022 with paired acyclovir and CMMG levels, shown on the CMMG graph too [42]. Each reproduces its `research/validation` reconstruction, and tests check that.
- **Predicted-versus-observed figure and scorecard CSV.** A log-scale plot of every published point against the AyFlux nominal prediction, with lines for perfect agreement and twofold error, plus a CSV with one row per point (observed, predicted, interval, inside or not, calibration multipliers). The caption gives the overall ratio and the counts within twofold and inside the interval.
- **CMMG/acyclovir AUC ratio** in the simulation summary, over the last 24 simulated hours of the median curves, shown next to Kably 2025 population-model values (≈30% at eGFR above 90, ≈130% below 30 mL/min/1.73 m²) [29]. With default parameters AyFlux gives lower ratios than Kably at normal kidney function; see issue #46.
- **Reference [41]**, Laskin 1982 *Antimicrob Agents Chemother* (probenecid study, normal-function serial plasma means).
- **Reset to defaults** on Research tools, undoable through version history. (#44)
- **Colorblind-friendly graph colors** (Okabe–Ito curves, viridis heatmaps), shared between the simulator and the visual explorer. (#40, #41)
- **CRRT evidence.** Drug reference rows and references [38]–[40]: Boulieu 1997 (adult CVVHD), Bleyzac 1999 (CRRT variability), Collignon 2023 (pediatric CVVHDF). The first two are cited at abstract level and say so. (#40)
- **Pediatric research module.** An isolated Abdalla (2020) IV pediatric model with weight/eGFR comparisons, conditional variability bands, accessible numeric results and CSV export; a source-audited Abdalla/Zeng comparison with nine reproducible covariate scenarios and 12 bibliography entries; equation verification with independent RK4 and exposure checks. Population target-attainment and clinical validation remain unperformed.

### Changed

- **Layout.** The primary dialysis mode is the first sidebar control. Research tools is the second tab from the right. Drug references and Methods and References are one **References & methods** tab with jump links. (#40)
- **Dialysis comparison table** is the last panel on the Concentration tab instead of its own tab; all scenarios are still calculated only while it is open. (#40, #41)
- **Baseline comparison** lists baseline → current values and percent change for peak plasma, plasma AUC, peak CSF, peak CMMG and drug removed by dialysis. It previously showed peak plasma only. (#43)
- **Drug reference table** is grouped by kidney function and modality: normal, intermittent HD, PD, CRRT, CNS/metabolite. (#40)
- **Heatmaps** use multi-hue colors with value labels; cell text is chosen to keep at least 4.5:1 contrast. (#40)
- Shorter top notice with the same warnings and limitations link. Example schedules load from compact chips. The "Why upper uncertainty bands can be wide" note is a collapsed panel. (#40)
- Graph colors are chosen under **Advanced settings → Graph colors** and on the visual explorer's Scenario card, not in the page header. (#41)
- The published-study reference library is the last item on Research tools, styled as a source list. (#40)
- Import validation lives in one function used by file imports and shared links. File import behavior is unchanged. (#42)
- Reference [22] (Vasquez Vasquez et al.) cites the peer-reviewed article, Br J Clin Pharmacol 2025;91(8):2469–2473, and keeps the preprint as a secondary link. (#44)

### Search indexing

- Every page in the sitemap now has a description, a canonical URL and matching social-preview tags. The home page, Experimental, AyFlux Neonatal, CAPD mass recovery, pediatric evidence and plasma sampling pages were missing some of these.
- The home page carries structured data (schema.org WebSite and SoftwareApplication: a free educational web app, AGPL-licensed, by Muhammad Khalil). No clinical claims.
- Deploys add `<lastmod>` dates to the sitemap from git history: the last commit touching each page or its own files (for the home page, also `public/assets/`). The committed sitemap stays URL-only; `scripts/sitemap.cjs --write --lastmod` refuses to run on a shallow clone.
- The script-markup check allows `application/ld+json` data blocks only when they are valid JSON; all other inline scripts are still rejected.

### Fixed

- The HD timing explorer cancels an in-progress sweep when its source settings or selected scenario change, clearing the previous output. (#44)

- The two-parameter sensitivity heatmap no longer shortens the simulation to 96 hours, which made it fail for custom dose schedules with later doses. (#44)
- Visual explorer heatmap axis labels and tooltips are rounded; they previously showed values such as 46.666666666666664. (#40)
- The event timeline strip stays in step with the plasma chart when zooming with the new controls. (#40)

### Security and privacy

- The third-party measurement pixel is disabled (`ENABLED = false` in `public/assets/measurement-pixel.js`). Pages load the file but it requests nothing from other servers. (#43)

## [0.26.0] - 2026-11-09 (preview)

- Added **Boelaert 1987 CAPD full-engine verification** via a reproducible research script and CI artifact for three prespecified patients, including actual exchange timing, model/drain mass accounting, ablation, and time-step checks.
- Added scientific boundaries distinguishing author-fitted plasma estimates from original observed samples and descriptive concordance from independent clinical validation. The previous CAPD surrogate was not used for the full-engine results.
- Preserved every pharmacokinetic parameter, dialysis equation, UI behavior, and saved configuration schema (2). CMMG CSF parameter uncertainty remains unresolved rather than being silently adjusted.
- Continued the preceding unreleased cache/performance improvements under this release.

- Added a session-only frozen baseline for the selected scenario on all four concentration charts, with a changed-settings list and peak plasma comparison. Current dose markers, shading and uncertainty bands remain explicitly identified.
- Reuse up to three completed result configurations, retain previously calculated scenarios, suppress duplicate numeric input/change calculations and cancel obsolete Worker jobs when replacement inputs validate.
- Defer off-screen concentration and clearance charts until they approach the viewport, while retaining a fallback for browsers without IntersectionObserver.
- Added cache, baseline and rendering regression coverage and desktop/mobile browser checks. No PK equations or saved configuration schema changed.

## [0.25.0] - 2026-11-08 (preview)

- Added a dedicated visual explorer, accessible from Research tools with the current simulation settings.
- Added an optional mass-accounting Sankey with a time slider, remaining compartment amounts, cumulative elimination and acyclovir-equivalent CMMG formation. CSF estimates remain outside the mass balance.
- Added configurable two-input heatmaps, selectable cells with linked concentration curves, grid CSV export, and an on-demand rotatable 3D response surface.
- Added PK-Sim / MoBi XLSX concentration-data export with numeric time/concentration columns, explicit units, simulated-data labels, and separate scenario/analyte sheets. This is comparison data, not a runnable PKML model.
- Replaced shared header logos with a transparent vector molecular mark and typeset Model Methods equations with native MathML and TeX annotations.
- Verified mass conservation, unchanged concentration predictions with optional accounting, workbook readback, and desktop/mobile browser interactions in automated checks.
- Updated release labels, citations, JSON export metadata and offline cache. Configuration schema remains 2.

## [0.24.2] - 2026-11-08 (preview)

- UI polish: in custom medication schedules, show infusion duration only for IV acyclovir rows. The full-site header now links directly to the User guide; Lite is linked within a collapsed guide section instead of a header menu or automatic loading prompt. No model or configuration schema changes.
- Rebuilt **AyFlux Lite** around the original Renal PK Lab v2 interactive workflow: compact sidebar sliders, repeat-dose inputs, adjustable simulation duration, HD session timing/clearance, CRRT intensity, PD fill volume, and interactive comparison of **no dialysis, HD, CAPD, APD and CRRT**.
- Added a route selector for IV acyclovir or oral valacyclovir, alongside one-draw nominal plasma acyclovir/CMMG curves, summary metrics, scenario visibility, cursor inspection, optional clearance chart and local CSV export.
- Kept the **current canonical AyFlux PK engine** and its peritoneal membrane-transfer approximation, rather than reverting to the older simplified v2 PD clearance model. Removed v2's famciclovir, urea Kt/V and embedded multi-megabyte Plotly bundle. No Monte Carlo, external-model tools or custom dialysis prescription editor in Lite.
- Retained the full-site More menu and slow-load Lite fallback. Default Lite controls resemble the former v2 educational values but remain nonclinical illustration only.
- Added regression tests for source-model parity, CAPD/APD schedule distinction, oral dose conversion path, CSV data integrity, the size budget and extended user inputs.
- Configuration schema stays at 2; this is a small incremental release within v0.24, not a new model major version.

## [0.24.1] - 2026-11-08 (preview)

- Reduced AyFlux Lite visual prominence with a smaller, light header and removed its introductory heading and paragraph.
- Made Lite minimally interactive: change **body weight, residual CrCl, or a single illustrative IV dose**, and update the same four dialysis scenarios in the existing PK engine with a short debounce. All dialysis settings, model parameters, and simulation horizon remain fixed, and Monte Carlo sampling remains disabled.
- Nested Lite beneath a **More** header menu on the full simulator. The independently loaded slow-start link remains available when needed and now clears only after the first full chart successfully renders.
- Removed the blocking Plotly Basic script from the full page. A small shared loader requests it when the first graph actually needs to render, and Research CSV overlays, Cartesian heatmaps and printable reports await that same loader.
- Moved Plotly Basic out of the service worker's initial precache; it is cached after first use instead. Existing downloaded offline Lite assets remain cached.
- Preserved all underlying pharmacokinetic equations and configuration **schema 2**. This is a patch release of the v0.24 series, not a feature-major release.

## [0.24.0] - 2026-11-08 (preview)

- Created **AyFlux Lite** at `/lite/`: fixed no-dialysis, intermittent HD, CAPD and CRRT example curves for plasma acyclovir and CMMG, rendered using native Canvas without Plotly.
- Reused the canonical PK engine with one deterministic nominal parameter set, fixed one-hour 700-mg IV demonstration, 70-kg adult and CrCl 0 mL/min over 48 hours. No dose, patient or dialysis customization, Monte Carlo, research tools or external charting libraries in the Lite page.
- Added an always-visible **Lite** header link in the full simulator and an independent, dismissible **slow-load alternative** offered after ~9.5 seconds if the full simulator has not produced its first successful result. The fallback never redirects automatically.
- Added accessible summary results, stated assumptions and scientific limitations, performance-focused regression tests and offline app-shell caching for Lite assets.
- Preserved the full PK modeling equations and saved configuration schema 2. **Lite is an educational comparison, not clinical advice.**

## [0.23.0] - 2026-11-08 (preview)

- Added two documented **optional R research workflows**: mrgsolve/C++ deterministic IV acyclovir/CMMG ODE parity checks and an OSPSuite-R example aciclovir PBPK results export for AyFlux curve overlays. Included frozen AyFlux reference fixtures, tests, and a dedicated mrgsolve parity CI workflow.
- Published the **implemented AyFlux differential equations** for central/peripheral acyclovir, CMMG, oral absorption, PD flux/dialysate states and the separately updated CSF concentrations in the public model-methods guide, with explicit units, numerical method, and parameter evidence status.
- Expanded literature citations with Smith et al. (2010, PMID 20038622) and Shah et al. (1986, PMID 3717158). Flagged the unexplained difference between the exploratory CSF CMMG model partition (0.25) and Smith's observed CSF/plasma AUC ratio (~0.025) as a **scientific limitation requiring recalibration**. **No PK parameter was silently changed.**
- Applied a dual-weight Poppins ExtraBold/Light **AyFlux wordmark** and peach terminal x consistently across the simulator and informational pages, using first-party self-hosted font assets and license attribution.
- Reduced footer clutter: the GitHub cat icon now serves as the source link without redundant text; the existing paw-print Easter egg still points to the cats page.
- Preserved saved-configuration schema 2, current PK equations, and educational-use scope.

## [0.22.0] - 2026-11-07 (preview)

- Made CSV export a **single compact dropdown**: choose a format to download immediately, with no second button.
- Added a true, interactive 7 × 7 Plotly Cartesian heatmap, with hover values and a collapsible accessible numeric table. The larger bundled library is loaded on demand and falls back gracefully to the numeric table when absent.
- Rebuilt the research-report print output with chart images generated from the selected scenario, explicit page breaks, protected figure layout, and awaited image decoding before printing.
- GitHub Actions stages a pinned Plotly Cartesian v3.3.1 library for both GitHub Pages and Cloudflare deployment; normal time-series charts continue using Plotly Basic.
- Preserved the v2 saved-configuration schema, educational-use limitations, and scientific equations.

## [0.21.0] - 2026-11-07 (preview)

- Combined the two CSV export actions into a compact format selector plus a single Export CSV button.
- Added an optional user-entered, piecewise-linear CrCl trajectory. Residual acyclovir and CMMG renal clearances now respond to the selected kidney-function path during integration. Constant CrCl remains the default.
- Repurposed the static kidney-only clearance chart into an optional, dual-axis kidney function profile and renal clearance plot.
- Updated configuration loading so older schema 2 JSON files without profile fields still open; configuration schema stays at 2.
- Unified spacing between sidebar sections, input fields, buttons, cards and mobile content; anchored site footers at the bottom of short pages.
- Refreshed GitHub documentation and added version-controlled, Wiki-ready roadmap and release-plan pages.
- Added regression coverage for dynamic kidney function, unchanged constant-CrCl behavior, and export/UI integration.
- **Educational and exploratory only:** trajectories are user-specified, not validated models of kidney injury or recovery.

## [0.20.0] - 2026-11-07 (preview)

- Added an optional scientific comparison workspace for locally imported PK-Sim/MoBi results CSV files, including unit mapping, overlaid curves, and curve-to-curve differences.
- Added an exploratory two-parameter sensitivity heatmap (creatinine clearance and hemodialysis clearance).
- Added numerical integrity diagnostics and a mass-balance accounting estimate without changing the PK dosing equations.
- Added a print-ready research summary for saving with the browser's **Print → Save as PDF** option.
- Added a small, source-linked published-reference catalog; literature values are aggregate examples, not patient-level validation.
- Added offline caching and PWA metadata on the ayflux.org deployment, with a visible online/offline indicator.
- Added an explicit application release label without changing configuration **schema 2**.
- **No new clinical validation is claimed.** OSP CSV comparisons are not native PK-Sim/MoBi model imports.

## [0.19.x] - Prior experimental builds

- Original AyFlux dialysis, acyclovir/valacyclovir pharmacokinetics, CMMG, uncertainty, research and data-export tools.
- `appVersion: "19"` was the previous internal JSON export label.
- Configuration schema 2 was introduced in prior releases and remains supported.

[Unreleased]: https://github.com/khalilm3264/acyclovirpksim/compare/v0.27.0...main
[0.27.0]: https://github.com/khalilm3264/acyclovirpksim/compare/b928978...v0.27.0
[0.26.0]: https://github.com/khalilm3264/acyclovirpksim/blob/main/CHANGELOG.md#0260---2026-11-09-preview
[0.25.0]: https://github.com/khalilm3264/acyclovirpksim/blob/main/CHANGELOG.md#0250---2026-11-08-preview
[0.24.2]: https://github.com/khalilm3264/acyclovirpksim/blob/main/CHANGELOG.md#0242---2026-11-08-preview
[0.24.1]: https://github.com/khalilm3264/acyclovirpksim/blob/main/CHANGELOG.md#0241---2026-11-08-preview
[0.24.0]: https://github.com/khalilm3264/acyclovirpksim/blob/main/CHANGELOG.md#0240---2026-11-08-preview
[0.23.0]: https://github.com/khalilm3264/acyclovirpksim/blob/main/CHANGELOG.md#0230---2026-11-08-preview
[0.22.0]: https://github.com/khalilm3264/acyclovirpksim/blob/main/CHANGELOG.md#0220---2026-11-07-preview
[0.21.0]: https://github.com/khalilm3264/acyclovirpksim/blob/main/CHANGELOG.md#0210---2026-11-07-preview
[0.20.0]: https://github.com/khalilm3264/acyclovirpksim/blob/main/CHANGELOG.md#0200---2026-11-07-preview

### Study comparison review
- Corrected the paired Kacirova case citation to its source publication [42], distinct from cohort [32].
- Distinguished nine comparison scenarios from six reference sources and added error magnitude and separate dialysis, no-dialysis and CMMG summaries. Band inclusion is descriptive, not validated predictive coverage.
- Added Stathoulopoulou 2002 urinary/CAPD mass-recovery sensitivity results separately from concentration metrics, retaining both denominator interpretations.

