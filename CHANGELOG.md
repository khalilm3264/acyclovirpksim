# AyFlux changelog

This changelog distinguishes the application version from the configuration schema and AGPL license.

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

[0.21.0]: https://github.com/khalilm3264/acyclovirpksim/blob/main/CHANGELOG.md
[0.20.0]: https://github.com/khalilm3264/acyclovirpksim/blob/main/CHANGELOG.md
