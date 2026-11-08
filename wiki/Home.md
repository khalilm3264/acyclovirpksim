# AyFlux Wiki

AyFlux is an open-source, browser-based **educational acyclovir and valacyclovir pharmacokinetics simulator**. It explores modeled drug concentrations across kidney function, hemodialysis, peritoneal dialysis and CRRT.

> **Educational use only.** AyFlux has not undergone the external clinical validation needed to support prescribing, dialysis decisions, or toxicity assessment. Predictions and uncertainty intervals are model-dependent, not measured patient outcomes.

## Start here

| Resource | Purpose |
| --- | --- |
| [Open AyFlux](https://ayflux.org/) | Run the browser simulator |
| [Learning center](https://ayflux.org/learn/) | Understand the drug, dialysis, and core model concepts |
| [Model methods](https://ayflux.org/learn/model-methods/) | Assumptions and evidence limitations |
| [Interoperability](https://ayflux.org/learn/interoperability/) | CSV, R, and PK-Sim/MoBi result comparisons |
| [Roadmap](Roadmap) | Current priorities and longer-term ideas |
| [Release plan](Release-Plan) | Quality gates and reproducibility targets |
| [GitHub source](https://github.com/khalilm3264/acyclovirpksim) | Code, issues, contributions and releases |

## Simulation scope

AyFlux includes IV acyclovir, oral valacyclovir (with an exploratory first-order absorption model), plasma/peripheral drug distribution, CMMG formation, simplified CSF effects, residual kidney clearance, and modeled dialysis drug removal. Research tools include Monte Carlo bands, Bayesian reweighting against user-entered observations, parameter sweeps, CSV exports and local CSV overlays.

Version 0.21.0 adds an optional **time-varying CrCl trajectory** and a compact CSV format selector. Changing CrCl over time means specifying a hypothetical kidney function path; AyFlux does not predict acute kidney injury or recovery from creatinine alone.

## Community

Suggestions and reproducible bug reports are welcome at [GitHub Issues](https://github.com/khalilm3264/acyclovirpksim/issues). Read [CONTRIBUTING.md](https://github.com/khalilm3264/acyclovirpksim/blob/main/CONTRIBUTING.md) before proposing scientific changes. Please share **synthetic or appropriately licensed public data only**; never submit patient-identifying information, API tokens, or credentials.

Project contact: [contact@ayflux.org](mailto:contact@ayflux.org) · License: GNU AGPLv3-only.
