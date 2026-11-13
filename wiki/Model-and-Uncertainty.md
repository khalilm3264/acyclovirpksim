# Model and uncertainty

This page explains how to interpret the software, not how to select treatment. The [model methods guide](https://ayflux.org/learn/model-methods/) is the detailed reference for equations and parameter provenance.

## Model structure

AyFlux uses a simplified two-compartment acyclovir model: a central compartment exchanges drug with a peripheral compartment, with renal and other elimination terms. Oral valacyclovir uses a simplified absorption/conversion representation. Additional states represent CMMG formation/elimination and exploratory CSF behavior.

CSF outputs depend on partition and equilibration assumptions; they are not direct measurements or a full mechanistic brain model. The visual explorer's mass accounting excludes CSF because those effect states are not integrated mass compartments.

## What an uncertainty band means

The full simulator samples model parameters, simulates the resulting curves, and summarizes their distribution. For a requested central 90% interval, the displayed lower and upper curves describe the corresponding central range of the model ensemble.

This is conditional on the chosen distributions, parameter settings, equations, and available observations. It does not mean that 90% of future patients have been shown to fall inside the band. More draws improve numerical sampling of those assumptions; they do not supply missing empirical evidence.

A pointwise median concentration curve also need not be the trajectory of one specific sampled individual.

## Observation reweighting

Research tools can reweight sampled predictions using entered observations and assay-error assumptions. Distinguish observations used for fitting from observations reserved for hold-out evaluation.

- Fitted agreement is not independent validation.
- A few observations do not resolve all parameter uncertainty or structural model error.
- Hold-out checks apply to the supplied observations and do not establish general population coverage.
- Use synthetic or appropriately permitted public data; do not share patient identifiers in examples or issues.

## Deterministic views

Lite and the visual explorer use a single nominal parameter configuration without uncertainty sampling or observation fitting. Their curves may differ from the full simulator's ensemble medians. For an equation-level comparison, align the actual parameter values and calculation settings rather than comparing labels alone.

## Scientific limitations to retain

The current code's exploratory CSF CMMG partition parameter remains a scientific review priority. The repository's [comparison notes](https://github.com/khalilm3264/acyclovirpksim/blob/main/docs/research-model-comparison.md) document the concern and its literature context. Do not treat its default as an independently validated coefficient.

Susceptibility references, literature benchmarks, and exposure associations are not interchangeable with validated individual therapeutic or toxicity thresholds. Matching another simulator demonstrates agreement under selected assumptions; it does not establish clinical performance.

[Home](Home) · [Development and verification](Development-and-Verification)
