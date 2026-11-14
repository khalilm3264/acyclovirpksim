<p align="center">
  <img src="public/ayflux-logo.png" alt="AyFlux molecule logo" width="88">
</p>

<h1 align="center">AyFlux</h1>

<p align="center"><strong>Explore acyclovir pharmacokinetics across kidney function and dialysis.</strong></p>

<p align="center">
  An open-source, browser-based teaching and exploratory research simulator for IV acyclovir, oral valacyclovir, and the CMMG metabolite.
</p>

<p align="center">
  <a href="https://ayflux.org/"><strong>Open simulator</strong></a> ·
  <a href="https://ayflux.org/learn/">User guide</a> ·
  <a href="https://ayflux.org/references/">References</a> ·
  <a href="wiki/Roadmap.md">Development roadmap</a> ·
  <a href="CHANGELOG.md">Changelog</a> ·
  <a href="https://ayflux.org/cite/">Cite AyFlux</a>
</p>

<p align="center">
  <a href="https://github.com/khalilm3264/acyclovirpksim/actions/workflows/pages.yml"><img alt="Build and tests" src="https://github.com/khalilm3264/acyclovirpksim/actions/workflows/pages.yml/badge.svg"></a>
  <a href="LICENSE"><img alt="License: AGPL-3.0-only" src="https://img.shields.io/badge/license-AGPL--3.0--only-315f7b"></a>
  <a href="CHANGELOG.md"><img alt="Version 0.26.0 preview" src="https://img.shields.io/badge/version-0.26.0_preview-326f79"></a>
</p>

> [!IMPORTANT]
> **Educational simulation only.** AyFlux is **not** a validated clinical decision-support system. Modeled plasma, CSF and CMMG concentrations must not be used to prescribe medication, select dialysis prescriptions, determine treatment efficacy, diagnose neurotoxicity or make other patient-care decisions.

## Current status

The application and software citation identify **v0.27.0 preview**, released 2026-11-13 ([release notes](https://github.com/khalilm3264/acyclovirpksim/releases/tag/v0.27.0)). Use the release tag, or an exact commit for later work from main.

## What does AyFlux do?

AyFlux uses a simplified two-compartment acyclovir model with renal and nonrenal clearance, a CMMG formation/elimination compartment, oral valacyclovir absorption and exploratory CSF effect models. It lets you explore how hypothetical changes in dosing, renal function and dialysis schedules affect **predicted** concentration–time curves.

| Explore | Current tools |
| --- | --- |
| **Kidney function** | Constant CrCl or a user-drawn, piecewise-linear CrCl trajectory, with a kidney-injury example; independent renal clearance terms for acyclovir and CMMG |
| **Renal replacement therapy** | Intermittent hemodialysis, peritoneal dialysis, CRRT and custom sequential schedules; a dialysis comparison table across all modes; a hemodialysis timing explorer |
| **Drug administration** | IV acyclovir infusions and oral valacyclovir, with repeat or custom dose timelines and dose shown in mg/kg |
| **Model outputs** | Plasma/CSF acyclovir, plasma/CSF CMMG, dialysis transfer, clearance, AUC and peaks, in mg/L or µmol/L |
| **Descriptive statistics** | Time above a level you choose, accumulation ratio, and baseline → current comparison with percent change |
| **Exploratory statistics** | Monte Carlo uncertainty bands, user-supplied observation reweighting, sensitivity heatmaps and model consistency checks |
| **Teaching** | Guided scenarios with notes on what to look at, example schedules, and a grouped drug reference table with 40 sources |
| **Saving and sharing** | Shareable links, configuration JSON with undo and version history, detailed or tidy CSV, PK-Sim/MoBi **results** XLSX |
| **Research comparisons** | Optional **mrgsolve** and **OSPSuite-R** scripts, local PK-Sim/MoBi results CSV overlays, a pediatric model comparison and published benchmarks |
| **Reports and access** | Print-formatted PDF report, colorblind-friendly colors, keyboard-usable controls and offline caching where supported |

**What it does not do:** infer a reliable kidney recovery trajectory from serum creatinine, generate valid native PK-Sim/MoBi model files, establish clinical thresholds, or replace externally validated patient-level PK analyses.

## What's new in 0.27.0

Released and live at [ayflux.org](https://ayflux.org/). Simulated concentrations are unchanged from 0.26.0; drug-removed accounting is now exact within each solver step, and probenecid is a new option that is off by default. Full details are in the [changelog](CHANGELOG.md#unreleased).

- **Zoom like Plotly:** drag a box on any graph, double-click to reset; pan, zoom and download from the toolbar.
- **Shareable links:** send someone a scenario as a link. The settings live in the link; nothing is uploaded.
- **mg/L ↔ µmol/L:** switch units for graphs, summary and comparison table.
- **Guided scenarios:** three teaching presets with a note on what to look at.
- **Hemodialysis timing explorer:** see how the start time of one session changes drug removed.
- **Time above a level, accumulation ratio and a fuller baseline comparison.**
- **Undo and version history** for imports, links, guided scenarios and resets.
- **Expanded drug reference:** grouped by modality, with CRRT sources added.
- **Privacy:** the third-party measurement pixel is switched off.

## Research pages

- [Pediatric IV acyclovir](https://ayflux.org/research/pediatric/): separate Abdalla model with covariate and Zeng comparisons; [source-specific evidence review](https://ayflux.org/research/pediatric/evidence).
- [Sampling and parameter recovery](https://ayflux.org/research/sampling/): synthetic experiments with different plasma sampling schedules.
- [Visual explorer](https://ayflux.org/explore/): mass accounting, parameter grids, sensitivity and optional 3D surfaces.
- [Published-evidence comparisons](research/validation/): source-specific CAPD, HD, CRRT, serum and CSF reconstructions and their limitations.
- [Complete bibliography](https://ayflux.org/references/): stable source numbers, publication details, DOI links and evidence notes.

These resources evaluate different questions; pediatric, neonatal, CNS and dialysis applicability must be assessed against each source and model.

## Privacy

Simulations run in your browser. Configurations, measurements, CSV files and reports are not sent to a server. A shareable link carries its scenario after the `#`, a part of the address that browsers do not transmit, and never includes measured concentrations. The site's third-party measurement pixel is currently disabled. Do not enter identifiable patient data.

## AyFlux Lite — a compact, v2-inspired alternative

[**Open AyFlux Lite**](https://ayflux.org/lite/). Lite revisits the useful design of the original Renal PK Lab v2: a compact parameter sidebar, immediate scenario comparison, clear concentration charts, a summary table and straightforward CSV export. It is **not** a fixed demonstration or a separate, outdated PK model.

Its patient/medication controls cover body weight, residual CrCl, acyclovir IV or oral valacyclovir, dose, interval, and simulation duration. Dialysis controls cover HD start/duration/repeat and modeled clearance, CRRT effluent, and PD fill volume. **No dialysis, HD, CAPD, APD, and CRRT** are independently simulated using the current AyFlux engine. Changing any parameter recomputes all five curves using a deterministic single-draw configuration; the graph has simple on/off visibility and hover inspection.

Defaults resemble the legacy v2 example: 70 kg, CrCl 5 mL/min, 350 mg acyclovir IV every 24 hours over a 96-hour horizon, and HD beginning at hour 24. These values are **hypothetical educational inputs, not recommended dosing**.

Lite deliberately excludes Monte Carlo uncertainty, CSF forecasts, Kt/V, famciclovir, fit-to-assay tools, external PK-Sim comparisons and advanced dialysis prescription tables. It retains a reference link for scientific limitations and does not replace the full simulator.

Lite draws immediately with native Canvas while the interactive ECharts renderer loads. The Canvas view remains available offline.

The full simulator header links directly to the **User guide**. Lite is available from a collapsed alternative-interface note in the guide's **About AyFlux** section; the full site no longer displays a separate Lite button or slow-load pop-up.

## Comparing scenarios

- **Overlays:** tick dialysis modes on the Concentration tab to draw them as separate what-if curves.
- **Baseline:** choose **Save selected curve as baseline**, then change inputs. A dark dash-dot curve keeps the saved medians, **Changed settings** lists what differs, and the panel reports baseline → current values with percent change for peak plasma, AUC, peak CSF, peak CMMG and drug removed by dialysis. The baseline lasts for the page session and is not exported.
- **Dialysis comparison table:** the last panel on the Concentration tab lists the same outcomes for every mode. Opening it calculates all modes.
- **Guided scenarios:** Research tools has three presets that set this up for you.

Completed results for up to three configurations are reused in memory; new numerical inputs and fitting observations invalidate reuse. Charts below the visible area wait until you scroll near them. See [performance verification](docs/interface-performance.md) for the scope of the measurements.

## Get started

**Use it online:** [ayflux.org](https://ayflux.org/) — no sign-in or app download is needed.

**Run it locally** with Node.js 22+ and a local static server:

```bash
git clone https://github.com/khalilm3264/acyclovirpksim.git
cd acyclovirpksim
npm install --no-save --ignore-scripts --no-audit --no-fund echarts@6.1.0 echarts-gl@2.1.0 @fontsource/poppins@5.3.0 parse5@7.3.0
node scripts/stage-visualizations.cjs
node scripts/stage-poppins.cjs
npx --yes http-server@14.1.1 public -a 127.0.0.1 -p 8000
```

Open http://localhost:8000. The numerical heatmap table remains an accessible alternative to the visual grid. GitHub Actions stages the bundle automatically for its Pages and Cloudflare deployments. After staging the dependencies, run the regression suite with:

```bash
node --test tests/*.test.cjs
```

Charts share a self-hosted ECharts library. The explorer requests ECharts GL when a 3D surface is selected. Simulation calculations are performed in a Web Worker when available. A main-thread fallback exists where Workers are restricted.

## A guide to the interface

The sidebar holds the inputs; six tabs hold the results.

| Where | What you do there |
| --- | --- |
| **Sidebar** | Pick the dialysis scenario first, then body weight, kidney function, drug, dose and duration. Advanced settings holds model parameters, uncertainty options and graph colors. |
| **Concentration** | Read the scenario description and summary, choose units, overlay modes, freeze a baseline, and view plasma, CSF and CMMG curves. The dialysis comparison table is at the bottom. |
| **Clearance & sessions** | Kidney function over time, dialysis clearance and drug removal. |
| **Custom timeline** | Build a sequence of dialysis sessions, PD exchanges and individual doses. |
| **Model validation** | Enter measured concentrations to reweight the model and check held-out points. |
| **Research tools** | Guided scenarios, save/load/share, heatmaps, HD timing explorer, diagnostics, benchmarks and the PDF report. |
| **References & methods** | Drug reference table, model methods and the numbered bibliography. |

For deeper explanations, see [Dialysis](https://ayflux.org/learn/dialysis/), [Model methods and limits](https://ayflux.org/learn/model-methods/) and the [CSV/R/OSP exchange guide](docs/data-exchange.md).

## Reproducibility and project plans

AyFlux is a **teaching model with exploratory parameters**, not a fitted, externally validated population PK model. Agreement between two simulated curves is not independent clinical validation. Data exchange files include explicit time and concentration units; simulations remain subject to model assumptions and numerical limitations.

- [Version history](CHANGELOG.md) · [Software citation](CITATION.cff) · [Data-exchange schema](docs/data-exchange.md)
- [Independent mrgsolve/OSPSuite-R comparison workflows](docs/research-model-comparison.md) · [Visible implementation equations and parameter evidence](https://ayflux.org/learn/model-methods/#equations)
- [Roadmap and planned scientific work](wiki/Roadmap.md) · [Verification plan](wiki/Release-Plan.md)
- [Wiki-ready pages](wiki/Home.md) · [How to publish to the GitHub Wiki](docs/wiki-publishing.md)

The `wiki/` directory contains the version-controlled wiki source. GitHub stores the live Wiki separately; follow the [publishing instructions](docs/wiki-publishing.md) to synchronize it. See the [repository maintenance plan](docs/repository-maintenance.md) for PR dependencies and review priorities.

## Independent model comparisons

The repository now contains two complementary optional R research workflows under [`interop/`](interop/):

- **mrgsolve**: a C++ translation of AyFlux's deterministic IV acyclovir/CMMG ODEs, compared against committed browser-engine reference curves for constant and time-varying CrCl.
- **OSPSuite-R**: a unit-normalized plasma aciclovir CSV export from the official example `.pkml` model. Its regimen and individual are **not automatically matched** to AyFlux; only explicitly matched comparisons would be interpretable.

See the [step-by-step guide](docs/research-model-comparison.md) for prerequisites, scripts, units and limitations. These exercises are implementation checks or model comparisons, **not independent clinical validation**. Note especially the [unresolved CMMG CSF partition mismatch](https://ayflux.org/learn/model-methods/#source-notes) revealed by a small published plasma/CSF study.

## Contributing

Contributions are welcome, particularly reproducible bugs, accessibility improvements, model-unit checks, and literature-backed proposals. Before opening a pull request, read [CONTRIBUTING.md](CONTRIBUTING.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md), and [SECURITY.md](SECURITY.md).

Scientific changes should include the units, equations or assumptions changed, primary references, model uncertainty, and regression tests. Please **do not post identifiable patient data or secrets** in issues, examples, or pull requests.

## Repository map

| Location | Purpose |
| --- | --- |
| [`public/index.html`](public/index.html) | Responsive simulator interface |
| [`public/assets/pk-engine.js`](public/assets/pk-engine.js) | Model equations, dialysis state and numerical integration |
| [`public/assets/simulator-ui.js`](public/assets/simulator-ui.js) | Form validation, plots, scenarios, units, shareable links and configuration handling |
| [`public/assets/charts.js`](public/assets/charts.js) | Shared chart options, zoom controls and color palettes |
| [`public/explore/`](public/explore/) / [`public/research/`](public/research/) | Visual explorer and pediatric research module |
| [`research/`](research/) | Reproducible validation scripts and benchmark write-ups |
| [`public/assets/osp-import.js`](public/assets/osp-import.js) / [`ayflux-exchange.js`](public/assets/ayflux-exchange.js) | Unit-aware results import/export |
| [`public/assets/research-workspace.js`](public/assets/research-workspace.js) | Diagnostic, sensitivity and research comparison tools |
| [`src/index.js`](src/index.js) | Cloudflare Worker headers and static routing |
| [`public/assets/charts.js`](public/assets/charts.js) | Shared ECharts rendering and interaction layer |
| [`public/research/`](public/research/) / [`research/`](research/) | Research pages, source reviews and reproducible experiments |
| [`tests/`](tests/) | Regression and scientific consistency checks |
| [`wiki/`](wiki/) / [`docs/`](docs/) | Roadmap, model exchange, deployment and contributor documentation |

## License, citations and contact

© 2026 Muhammad Khalil. AyFlux's first-party source code is licensed under **GNU Affero General Public License v3.0 only** ([LICENSE](LICENSE)). Third-party packages retain their respective licenses ([notices](THIRD_PARTY_NOTICES.md)).

If you use AyFlux for teaching or research illustration, cite the software using [`CITATION.cff`](CITATION.cff) and cite the primary pharmacokinetic sources relevant to your analysis. A software citation does not imply clinical validation.

**Public project email:** [contact@ayflux.org](mailto:contact@ayflux.org) · **Website:** [ayflux.org](https://ayflux.org/) · **Release/deployment instructions:** [docs/deployment.md](docs/deployment.md).
