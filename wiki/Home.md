# AyFlux Wiki

AyFlux is a browser-based acyclovir and valacyclovir pharmacokinetics simulator for teaching and exploratory research across kidney function, HD, PD and CRRT.

**Current release identity: v0.26.0 preview.** The main branch also contains subsequent interface and research additions. v0.27.0 remains planned; cite an exact commit when reproducing work from main.

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

## Available on main

- Adult central/peripheral acyclovir, CMMG formation/elimination, oral absorption and exploratory CSF estimates.
- Constant or entered time-varying CrCl; HD, manual/cycler PD, CRRT and custom sequences.
- Baseline comparison, mg/L and µmol/L display, graph zoom/pan, ECharts visualizations and a compact Lite interface.
- Shareable scenario links, JSON save/load, undo import and session-only import history. Shared links exclude measured concentrations.
- Monte Carlo intervals, observation reweighting, exposure summaries, CSV/XLSX exports and local result overlays.
- Separate pediatric IV research and plasma-sampling pages; published-evidence scripts and numerical verification.

The adult model, pediatric model, measured-data comparisons and synthetic numerical experiments have different evidence scopes. See [Research modules](Research-Modules). **Educational and exploratory use only; no patient-specific dosing or toxicity decisions.**

Report reproducible problems through [Issues](https://github.com/khalilm3264/acyclovirpksim/issues). Read [CONTRIBUTING.md](https://github.com/khalilm3264/acyclovirpksim/blob/main/CONTRIBUTING.md) for scientific changes. Contact: [contact@ayflux.org](mailto:contact@ayflux.org). License: AGPL-3.0-only.
