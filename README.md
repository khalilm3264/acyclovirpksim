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

The application and software citation identify **v0.26.0 preview**. Main also includes subsequent merged interface and research additions; **v0.27.0 is planned**, not yet released. Use an exact commit when reproducing work from main. See [release tracking #55](https://github.com/khalilm3264/acyclovirpksim/issues/55).

## What does AyFlux do?

AyFlux uses a simplified two-compartment acyclovir model with renal and nonrenal clearance, a CMMG formation/elimination compartment, oral valacyclovir absorption and exploratory CSF effect models. It lets you explore how hypothetical changes in dosing, renal function and dialysis schedules affect **predicted** concentration–time curves.

| Explore | Current tools |
| --- | --- |
| **Kidney function** | Constant CrCl or an optional user-drawn, piecewise-linear CrCl trajectory; independent renal clearance terms for acyclovir and CMMG |
| **Renal replacement therapy** | Intermittent hemodialysis, peritoneal dialysis, CRRT and custom sequential schedules |
| **Drug administration** | IV acyclovir infusions and oral valacyclovir, with repeat or custom dose timelines |
| **Model outputs** | Plasma/CSF acyclovir, plasma/CSF CMMG, dialysis transfer, clearance, AUC and estimated peaks |
| **Exploratory statistics** | Monte Carlo uncertainty bands, user-supplied observation reweighting, sensitivity and model consistency checks |
| **Data exchange** | Detailed or tidy CSV exports, configuration JSON, optional independent **mrgsolve** and **OSPSuite-R** comparison scripts, and local PK-Sim/MoBi **results** CSV overlays |
| **Session tools** | Shared scenario links (excluding observations), mg/L or µmol/L display, JSON import undo and session-only import history |
| **Reports and access** | Print-formatted PDF report with scenario-specific charts and page breaks, literature benchmark examples and offline static app caching where supported |

**What it does not do:** infer a reliable kidney recovery trajectory from serum creatinine, generate valid native PK-Sim/MoBi model files, establish clinical thresholds, or replace externally validated patient-level PK analyses.

## Research pages

- [Pediatric IV acyclovir](https://ayflux.org/research/pediatric/): separate Abdalla model with covariate and Zeng comparisons; [source-specific evidence review](https://ayflux.org/research/pediatric/evidence).
- [Sampling and parameter recovery](https://ayflux.org/research/sampling/): synthetic experiments with different plasma sampling schedules.
- [Visual explorer](https://ayflux.org/explore/): mass accounting, parameter grids, sensitivity and optional 3D surfaces.
- [Published-evidence comparisons](research/validation/): source-specific CAPD, HD, CRRT, serum and CSF reconstructions and their limitations.
- [Complete bibliography](https://ayflux.org/references/): stable source numbers, publication details, DOI links and evidence notes.

These resources evaluate different questions; pediatric, neonatal, CNS and dialysis applicability must be assessed against each source and model.

## AyFlux Lite — a compact, v2-inspired alternative

[**Open AyFlux Lite**](https://ayflux.org/lite/). Lite revisits the useful design of the original Renal PK Lab v2: a compact parameter sidebar, immediate scenario comparison, clear concentration charts, a summary table and straightforward CSV export. It is **not** a fixed demonstration or a separate, outdated PK model.

Its patient/medication controls cover body weight, residual CrCl, acyclovir IV or oral valacyclovir, dose, interval, and simulation duration. Dialysis controls cover HD start/duration/repeat and modeled clearance, CRRT effluent, and PD fill volume. **No dialysis, HD, CAPD, APD, and CRRT** are independently simulated using the current AyFlux engine. Changing any parameter recomputes all five curves using a deterministic single-draw configuration; the graph has simple on/off visibility and hover inspection.

Defaults resemble the legacy v2 example: 70 kg, CrCl 5 mL/min, 350 mg acyclovir IV every 24 hours over a 96-hour horizon, and HD beginning at hour 24. These values are **hypothetical educational inputs, not recommended dosing**.

Lite deliberately excludes Monte Carlo uncertainty, CSF forecasts, Kt/V, famciclovir, fit-to-assay tools, external PK-Sim comparisons and advanced dialysis prescription tables. It retains a reference link for scientific limitations and does not replace the full simulator.

Lite draws immediately with native Canvas while the interactive ECharts renderer loads. The Canvas view remains available offline.

The full simulator header links directly to the **User guide**. Lite is available from a collapsed alternative-interface note in the guide's **About AyFlux** section; the full site no longer displays a separate Lite button or slow-load pop-up.

## Baseline comparison

In the Concentration tab, choose **Save selected curve as baseline**, then change inputs. The frozen curve preserves the selected scenario’s median concentrations. Expand **Changed settings** to see the differences, or replace/clear the baseline. It is kept only for the current page session and is not included in configuration or data exports. Dose markers, shading and uncertainty bands refer to the current run. When durations differ, the chart shows both time ranges and the peak comparison notes the difference.

Completed results for up to three configurations are reused in memory; new numerical inputs and fitting observations invalidate reuse. Charts below the visible area wait until you scroll near them. See [performance verification](docs/interface-performance.md) for the scope of the measurements.

## Get started

**Use it online:** [ayflux.org](https://ayflux.org/) — no sign-in or app download is needed.

**Run it locally** with Node.js 22+ and a local static server:

```bash
git clone https://github.com/khalilm3264/acyclovirpksim.git
cd acyclovirpksim
npm install --no-save --ignore-scripts --no-audit --no-fund echarts@5.6.0 echarts-gl@2.0.9 @fontsource/poppins@5.3.0 parse5@7.3.0
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

1. **Patient and medication:** set body mass, residual CrCl or a kidney-function trajectory, dosing, and the simulation horizon.
2. **Dialysis scenario:** select no dialysis, HD, PD, CRRT or a custom schedule. The graph overlays are hypothetical counterfactual comparisons; a custom schedule follows a single simulated switching timeline.
3. **Concentration and clearance:** explore plasma, CSF, CMMG, and time-resolved dialysis/renal clearance results, with clearly labeled units.
4. **Research tools:** compare local OSP results, export data, inspect diagnostics, copy a scenario link or restore earlier imported settings.
5. **References & methods:** read the drug reference table, implemented assumptions and numbered sources. The dialysis comparison table is an expandable panel at the bottom of Concentration.

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
| [`public/assets/simulator-ui.js`](public/assets/simulator-ui.js) | Form validation, plots, scenarios and configuration handling |
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
