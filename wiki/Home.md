# AyFlux documentation

AyFlux is an open-source educational simulator for acyclovir pharmacokinetics across kidney function and dialysis. It models IV acyclovir, oral valacyclovir, and the CMMG metabolite in the browser.

**Educational use only.** Predictions are model outputs, not patient measurements or validated guidance for prescribing, dialysis, or toxicity assessment.

## Find a guide

| Page | What you will learn |
| --- | --- |
| [Getting started](Getting-Started) | Configure a simulation and read its charts |
| [Kidney function and dialysis](Kidney-Function-and-Dialysis) | Constant and changing CrCl, HD, PD, CRRT, and custom schedules |
| [Model and uncertainty](Model-and-Uncertainty) | Compartments, intervals, observation fitting, and limitations |
| [Worked examples](Worked-Examples) | Reproducible exercises using hypothetical inputs |
| [Research and data exchange](Research-and-Data-Exchange) | CSV, JSON, Excel, R, and comparisons with PK-Sim/MoBi |
| [Visual explorer](Visual-Explorer) | Heatmaps, drug accounting, and optional 3D surfaces |
| [Performance and troubleshooting](Performance-and-Troubleshooting) | Lite, chart errors, offline behavior, and reproducible bug reports |
| [Development and verification](Development-and-Verification) | Run locally, stage optional assets, and understand tests |
| [Roadmap](Roadmap) | Remaining scientific and engineering priorities |
| [Release plan](Release-Plan) | Release and verification checklist |

## Choose an interface

| Interface | Best suited to |
| --- | --- |
| [Full simulator](https://ayflux.org/) | Custom dosing and dialysis, uncertainty, CSF outputs, and research tools |
| [AyFlux Lite](https://ayflux.org/lite/) | Fast comparison of five dialysis scenarios with basic inputs and Canvas charts |
| [Visual explorer](https://ayflux.org/explore/) | Deterministic parameter grids and drug accounting; open from Research tools to copy your settings |

These pages describe the **0.25.0 preview** implementation. Application version and configuration schema are separate; this release uses configuration schema 2. Consult the [changelog](https://github.com/khalilm3264/acyclovirpksim/blob/main/CHANGELOG.md) for later changes.

## Methods, citation, and contributions

The [model methods guide](https://ayflux.org/learn/model-methods/) contains equations, parameter provenance, references, and limitations. Use [Cite AyFlux](https://ayflux.org/cite/) for software attribution and record the version used in your work.

Report reproducible problems through [GitHub Issues](https://github.com/khalilm3264/acyclovirpksim/issues). Share synthetic or appropriately licensed public examples without patient identifiers. Read [CONTRIBUTING.md](https://github.com/khalilm3264/acyclovirpksim/blob/main/CONTRIBUTING.md) for scientific and code changes.

License: **AGPL-3.0-only**. Project contact: [contact@ayflux.org](mailto:contact@ayflux.org).
