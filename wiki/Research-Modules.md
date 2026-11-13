# Research modules and evidence

| Resource | What it evaluates | Scope |
| --- | --- | --- |
| [Adult simulator](https://ayflux.org/) | Entered dosing, kidney function and dialysis scenarios | Exploratory compartmental model with assumed parameters |
| [Visual explorer](https://ayflux.org/explore/) | Mass accounting, parameter grids, sensitivity and optional 3D views | Model behavior; visual agreement is not clinical validation |
| [Pediatric IV module](https://ayflux.org/research/pediatric/) | Published Abdalla model with covariate and Zeng comparisons | Separate model; do not infer pediatric dialysis or neonatal support |
| [Pediatric evidence review](https://ayflux.org/research/pediatric/evidence) | Source-specific support and limitations | Bibliographic/model evidence review |
| [PD exchanges and sample timing](https://ayflux.org/research/exchanges/) | Boelaert patients 1, 4 and 5, drain accounting and hypothetical endpoint timing | Replay downloads archive nominal values and settings |
| [Sampling experiment](https://ayflux.org/research/sampling/) | Exposure and parameter recovery from sampling schedules | Synthetic verification |
| [Published-evidence scripts](https://github.com/khalilm3264/acyclovirpksim/tree/main/research/validation) | CAPD, HD, CRRT, serum and CSF endpoints | Study-specific reconstructions with disclosed unavailable inputs |
| [Independent R workflows](https://github.com/khalilm3264/acyclovirpksim/tree/main/interop) | mrgsolve equation parity and OSP result exchange | Implementation/model comparisons |

## Reading a comparison

Identify whether each reference value is an original observation, a source-author fitted estimate, an aggregate summary or a reconstructed quantity. Match time origin, concentration units, administration route and dialysis prescription. A published case report provides evidence for that case; it does not establish population performance.

The current intact-barrier CSF CMMG partition is 0.025, informed by Smith 2010 and evaluated against the intact-barrier subset of Lindström 2019. The damaged-barrier preset uses acyclovir/CMMG partitions 0.37/0.11 fitted to the Lindström disrupted-barrier data. Its evaluation on those same samples is in-sample. Non-kidney CMMG clearance is 0.5 L/h at 70 kg. The kidney clearance coefficient remains an open evidence question. The adult CSF filter is an exploratory lagged partition model, not the LeiCNS PBPK model. See [Model methods](https://ayflux.org/learn/model-methods/) and [Roadmap](Roadmap).

## Replay demonstration

Open PD exchanges and sample timing from the User Guide. Select Boelaert patient 4 and end the run at 3.5 h. The inspector reports drug still in the cavity. Advance to 4 h to inspect the first completed drain, then replay five days. Select the 24 h trough and shift its hypothetical collection time by one hour to see the effect of the next infusion. The observed concentration stays fixed. Download replay data to retain the plotted curve, settings, exchange accounting and release identity. Shared links execute the installed model.

See [Lindström evidence and preset derivation](https://github.com/khalilm3264/acyclovirpksim/blob/main/research/validation/LINDSTROM-CSF.md) and [reproduction guidance](Release-Plan).

## Evidence filters and saved comparisons

In References & methods, Evidence included selects all published values, measured values, group means, individual samples or author-fitted endpoints. Statistics, plots, residuals and CSV follow the selection. The 37-value comparison contains 19 group means, 6 individual measured values and 12 author-fitted endpoints.

Under Comparison tools, save two regimens and open Compare changed inputs and outcomes. Choose a baseline and comparison. The view reports changed inputs and comparison-minus-baseline differences over the shorter saved horizon. Exposure and concentration outcomes use saved median curves; dialysis removal is a nominal calculation. Outcome differences stay hidden during the prediction exercise.
