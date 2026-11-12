# AyFlux changelog

## Unreleased — pediatric research module
- Added a source-audited Abdalla/Zeng pediatric IV comparison, nine reproducible covariate scenarios, 12 bibliography entries, and explicit limitations for CAPD, CMMG, neonatal and CNS evidence.


- Add an isolated Abdalla (2020) IV pediatric model with weight/eGFR comparisons, conditional variability bands, accessible numeric results, and CSV export.
- Add equation verification, independent RK4 and exposure checks, and reproducible fixtures. Population target-attainment and clinical validation remain unperformed.
- Link the module from the guide and model methods; add reference [25].

This changelog distinguishes the application version from the configuration schema and AGPL license.

## Unreleased

- **Time above a level.** The simulation summary reports how many hours the selected scenario's median plasma curve is above a level you type in, in the current units. No default level is offered; it is a descriptive statistic, not a target.
- **Fuller baseline comparison.** With a frozen baseline, the panel now lists baseline → current values and percent change for peak plasma, plasma AUC, peak CSF, peak CMMG and drug removed by dialysis.
- **Kidney injury example.** The custom CrCl trajectory editor has a *Kidney injury mid-course* example: starting CrCl to the halfway point, a fall to one fifth by three quarters, then steady. It is illustrative and must be applied like any other edit.
- The third-party measurement pixel is disabled (`ENABLED = false` in `public/assets/measurement-pixel.js`). Pages load the file but it requests nothing from other servers.

- **Shareable links.** Research tools → Save / load → *Copy shareable link* puts the current scenario (settings that differ from the defaults, selected scenario, visible curves, colors and units) into the link itself, after `#s=`. Nothing is uploaded and browsers do not send that part of a link to servers. Opening a link runs the same full validation as a JSON import, removes the scenario from the address bar, and adds an entry to version history when it replaces existing settings. Links never contain measured concentrations.
- **Concentration units.** A *Units* selector on the Concentration tab switches graphs, the summary and the dialysis comparison table between mg/L and µmol/L (acyclovir 225.21 g/mol, CMMG 239.19 g/mol). The simulation, CSV/XLSX exports, saved JSON, Model validation and Research tools stay in mg/L.

- Graph colors moved out of the page header and into settings: **Advanced settings → Graph colors** in the simulator and a **Graph colors** setting on the visual explorer. The stored preference is unchanged and still shared between the two pages.
- The dialysis comparison table is now the last panel on the Concentration tab, titled **Dialysis comparison table** with a one-line description of its contents.

- Graph navigation: click and drag zooms into a box by default (mouse or trackpad), double-click resets, and the toolbar adds pan, zoom in/out, undo and image download. Touch screens keep page scrolling and use the toolbar. A short hint above the graphs explains the controls.
- Layout: the primary dialysis mode is now the first sidebar control; Research tools is the second tab from the right; Drug references and Methods and References are one **References & methods** tab; the comparison table is an on-demand panel under Concentration (all scenarios are still calculated only while it is open).
- Smaller top notice with the same warnings; the "Why upper uncertainty bands can be wide" note is a short collapsed panel; example schedules load from compact chips.
- Save / load: every JSON import first stores the settings it replaces. **Undo last import** and a 10-entry **Version history** restore earlier settings; history lives only in the open tab and is never written to storage.
- More colorful two-parameter heatmaps with value labels, and a **Colorblind-safe colors** toggle in the header (Okabe–Ito curves, viridis heatmaps). The preference is one browser flag shared with the visual explorer; the Advanced setting stays in step.
- The published-study reference library is the last item on Research tools, styled as a source list.
- Drug reference table regrouped by kidney function and modality (normal, intermittent HD, PD, CRRT, CNS/metabolite), with rows for oral valacyclovir bioavailability, oral acyclovir HD removal, CAPD peritoneal clearance and three CRRT studies. Added references [38]–[40] (Boulieu 1997, Bleyzac 1999, Collignon 2023).
- Visual explorer: colorblind-safe toggle (shared preference), multi-hue grid and heatmap colors with contrast-checked cell text, and rounded heatmap axis labels and tooltips (previously long decimals such as 46.666666666666664).
- No pharmacokinetic equation, parameter, export format or configuration schema (2) changed.

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

[0.24.2]: https://github.com/khalilm3264/acyclovirpksim/blob/main/CHANGELOG.md
[0.24.1]: https://github.com/khalilm3264/acyclovirpksim/blob/main/CHANGELOG.md
[0.24.0]: https://github.com/khalilm3264/acyclovirpksim/blob/main/CHANGELOG.md
[0.23.0]: https://github.com/khalilm3264/acyclovirpksim/blob/main/CHANGELOG.md
[0.22.0]: https://github.com/khalilm3264/acyclovirpksim/blob/main/CHANGELOG.md
[0.21.0]: https://github.com/khalilm3264/acyclovirpksim/blob/main/CHANGELOG.md
[0.20.0]: https://github.com/khalilm3264/acyclovirpksim/blob/main/CHANGELOG.md

[0.26.0]: https://github.com/khalilm3264/acyclovirpksim/blob/main/CHANGELOG.md
[0.25.0]: https://github.com/khalilm3264/acyclovirpksim/blob/main/CHANGELOG.md
