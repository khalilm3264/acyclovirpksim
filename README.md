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
  <a href="wiki/Roadmap.md">Development roadmap</a> ·
  <a href="CHANGELOG.md">Changelog</a> ·
  <a href="https://ayflux.org/cite/">Cite AyFlux</a>
</p>

<p align="center">
  <a href="https://github.com/khalilm3264/acyclovirpksim/actions/workflows/pages.yml"><img alt="Build and tests" src="https://github.com/khalilm3264/acyclovirpksim/actions/workflows/pages.yml/badge.svg"></a>
  <a href="LICENSE"><img alt="License: AGPL-3.0-only" src="https://img.shields.io/badge/license-AGPL--3.0--only-315f7b"></a>
  <a href="CHANGELOG.md"><img alt="Version 0.22.0 preview" src="https://img.shields.io/badge/version-0.22.0_preview-326f79"></a>
</p>

> [!IMPORTANT]
> **Educational simulation only.** AyFlux is **not** a validated clinical decision-support system. Modeled plasma, CSF and CMMG concentrations must not be used to prescribe medication, select dialysis prescriptions, determine treatment efficacy, diagnose neurotoxicity or make other patient-care decisions.

## What does AyFlux do?

AyFlux uses a simplified two-compartment acyclovir model with renal and nonrenal clearance, a CMMG formation/elimination compartment, oral valacyclovir absorption and exploratory CSF effect models. It lets you explore how hypothetical changes in dosing, renal function and dialysis schedules affect **predicted** concentration–time curves.

| Explore | Current tools |
| --- | --- |
| **Kidney function** | Constant CrCl or an optional user-drawn, piecewise-linear CrCl trajectory; independent renal clearance terms for acyclovir and CMMG |
| **Renal replacement therapy** | Intermittent hemodialysis, peritoneal dialysis, CRRT and custom sequential schedules |
| **Drug administration** | IV acyclovir infusions and oral valacyclovir, with repeat or custom dose timelines |
| **Model outputs** | Plasma/CSF acyclovir, plasma/CSF CMMG, dialysis transfer, clearance, AUC and estimated peaks |
| **Exploratory statistics** | Monte Carlo uncertainty bands, user-supplied observation reweighting, sensitivity and model consistency checks |
| **Data exchange** | Detailed or tidy CSV exports, configuration JSON, an R comparison script, and local PK-Sim/MoBi **results** CSV overlays |
| **Reports and access** | Print-formatted PDF report with scenario-specific charts and page breaks, literature benchmark examples and offline static app caching where supported |

**What it does not do:** infer a reliable kidney recovery trajectory from serum creatinine, generate valid native PK-Sim/MoBi model files, establish clinical thresholds, or replace externally validated patient-level PK analyses.

## Get started

**Use it online:** [ayflux.org](https://ayflux.org/) — no sign-in or app download is needed.

**Run it locally** with Node.js 22+ and a local static server:

```bash
git clone https://github.com/khalilm3264/acyclovirpksim.git
cd acyclovirpksim
python3 -m http.server 8000 --directory public
```

Open `http://localhost:8000` in your browser. To enable the optional interactive heatmap when developing locally, stage the pinned Cartesian asset first:

```sh
npm install --no-save --ignore-scripts --no-audit --no-fund plotly.js-cartesian-dist-min@3.3.1
node scripts/stage-cartesian.cjs
```

The numerical heatmap table still works when the optional script is absent. GitHub Actions stages the bundle automatically for its Pages and Cloudflare deployments. You can run the dependency-free test suite with:

```bash
node --test tests/*.test.cjs
```

The browser uses a locally served Plotly Basic bundle for standard graphs and loads Plotly Cartesian **only on demand** for the interactive sensitivity heatmap. The pharmacokinetic engine and interface remain separate. Simulation calculations are performed in a Web Worker when available. A main-thread fallback exists where Workers are restricted.

## A guide to the interface

1. **Patient and medication:** set body mass, residual CrCl or a kidney-function trajectory, dosing, and the simulation horizon.
2. **Dialysis scenario:** select no dialysis, HD, PD, CRRT or a custom schedule. The graph overlays are hypothetical counterfactual comparisons; a custom schedule follows a single simulated switching timeline.
3. **Concentration and clearance:** explore plasma, CSF, CMMG, and time-resolved dialysis/renal clearance results, with clearly labeled units.
4. **Research tools:** inspect model assumptions, compare a local OSP results CSV, export data, run numerical diagnostics and create a printable research summary.

For deeper explanations, see [Dialysis](https://ayflux.org/learn/dialysis/), [Model methods and limits](https://ayflux.org/learn/model-methods/) and the [CSV/R/OSP exchange guide](docs/data-exchange.md).

## Reproducibility and project plans

AyFlux is a **teaching model with exploratory parameters**, not a fitted, externally validated population PK model. Agreement between two simulated curves is not independent clinical validation. Data exchange files include explicit time and concentration units; simulations remain subject to model assumptions and numerical limitations.

- [Version history](CHANGELOG.md) · [Software citation](CITATION.cff) · [Data-exchange schema](docs/data-exchange.md)
- [Roadmap and planned scientific work](wiki/Roadmap.md) · [Verification plan](wiki/Release-Plan.md)
- [Wiki-ready pages](wiki/Home.md) · [How to publish to the GitHub Wiki](docs/wiki-publishing.md)

The `wiki/` directory contains the reviewed wiki source pages. GitHub's separate **Wiki** tab is not automatically updated by changes to this repository.

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
| [`tests/`](tests/) | Dependency-free regression and scientific consistency checks |
| [`wiki/`](wiki/) / [`docs/`](docs/) | Roadmap, model exchange, deployment and contributor documentation |

## License, citations and contact

© 2026 Muhammad Khalil. AyFlux's first-party source code is licensed under **GNU Affero General Public License v3.0 only** ([LICENSE](LICENSE)). Third-party packages retain their respective licenses ([notices](THIRD_PARTY_NOTICES.md)).

If you use AyFlux for teaching or research illustration, cite the software using [`CITATION.cff`](CITATION.cff) and cite the primary pharmacokinetic sources relevant to your analysis. A software citation does not imply clinical validation.

**Public project email:** [contact@ayflux.org](mailto:contact@ayflux.org) · **Website:** [ayflux.org](https://ayflux.org/) · **Release/deployment instructions:** [docs/deployment.md](docs/deployment.md).
