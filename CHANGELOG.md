# AyFlux changelog

This changelog distinguishes the application version from the configuration schema and AGPL license.

## [0.24.2] - 2026-11-08 (preview)

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
