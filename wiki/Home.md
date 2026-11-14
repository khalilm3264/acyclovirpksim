# AyFlux Wiki

AyFlux is a browser-based acyclovir and valacyclovir pharmacokinetics simulator for teaching and exploratory research across kidney function, HD, PD and CRRT.

**Current release identity: v0.27.0 preview** (released 2026-11-13). Cite the release tag, or an exact commit for later work from main.

## Start here

| Resource | Purpose |
| --- | --- |
| [Simulator](https://ayflux.org/) | Adult IV acyclovir and oral valacyclovir scenarios |
| [User guide](https://ayflux.org/learn/) | Controls, outputs and model interpretation |
| [References](https://ayflux.org/references/) | Complete numbered bibliography and DOI links |
| [Model methods](https://ayflux.org/learn/model-methods/) | Implemented equations, parameter sources and limitations |
| [Research modules](Research-Modules) | Pediatric IV, sampling, visual exploration and evidence comparisons |
| [Data exchange](https://ayflux.org/learn/interoperability/) | CSV, XLSX and R/OSP comparisons |
| [Roadmap](Roadmap) | Available work and outstanding scientific priorities |
| [Release plan](Release-Plan) | Verification and release checks |
| [Reference maintenance](References) | How sources and evidence versions are tracked |

## Release candidate integration

The `release/combined-review` branch combines benchmark/usability work from #101, academic exports from #107, corrected missing-data handling from #108/#110 and the event CSV/teaching note from #104. The current main already contains ECharts 6.1, nominal Python/R exports, Lite PNG and the printable summary through #109. Candidate features remain pending until merged and deployed.

The combined menu retains detailed CSV, tidy CSV, pharmacometric events, XLSX, LaTeX, full BibTeX, printable summary and nominal Python/R scripts. Printing uses one shared preview renderer. The teaching note can be copied locally; clipboard denial offers manual copying. See [Data exchange](https://ayflux.org/learn/interoperability/).

## Available on main

- Adult central/peripheral acyclovir, CMMG formation/elimination, oral absorption and exploratory CSF estimates.
- Constant or entered time-varying CrCl; HD, manual/cycler PD, CRRT and custom sequences.
- Baseline comparison, mg/L and µmol/L display, graph zoom/pan, ECharts visualizations and a compact Lite interface.
- Shareable scenario links, JSON save/load, undo import and session-only import history. Shared links exclude measured concentrations.
- Monte Carlo intervals, observation reweighting, exposure summaries, CSV/XLSX exports and local result overlays.
- Separate pediatric IV research and plasma-sampling pages; published-evidence scripts and numerical verification.

Since 0.26.0 the simulator also has shareable links, a mg/L ↔ µmol/L selector, guided teaching scenarios, a hemodialysis timing explorer, descriptive statistics (time above a level, accumulation ratio) and undo for imports; see the [changelog](https://github.com/khalilm3264/acyclovirpksim/blob/main/CHANGELOG.md#unreleased). Version 0.21.0 added an optional **time-varying CrCl trajectory** and a compact CSV format selector. Changing CrCl over time means specifying a hypothetical kidney function path; AyFlux does not predict acute kidney injury or recovery from creatinine alone.

The adult model, pediatric model, measured-data comparisons and synthetic numerical experiments have different evidence scopes. See [Research modules](Research-Modules). **Educational and exploratory use only; no patient-specific dosing or toxicity decisions.**

Report reproducible problems through [Issues](https://github.com/khalilm3264/acyclovirpksim/issues). Read [CONTRIBUTING.md](https://github.com/khalilm3264/acyclovirpksim/blob/main/CONTRIBUTING.md) for scientific changes. Contact: [contact@ayflux.org](mailto:contact@ayflux.org). License: AGPL-3.0-only.
