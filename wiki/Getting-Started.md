# Getting started

Use [AyFlux](https://ayflux.org/) in a browser. No account is required. Start with a hypothetical scenario and change one assumption at a time.

## Set up a first simulation

1. In the patient and medication controls, review body weight, residual kidney function, route, dose, interval, dose count, and simulation duration.
2. Choose IV acyclovir or oral valacyclovir. Their entered milligram amounts refer to different administered drugs; they are not interchangeable doses. Infusion duration applies to IV administration.
3. Select a dialysis scenario and review its timing and clearance inputs.
4. Allow the calculation to finish before interpreting charts or exporting results. Resolve any validation messages rather than assuming an old curve represents new settings.
5. Use scenario visibility controls to compare curves. Select the primary scenario deliberately: background shading corresponds to that scenario's schedule, even when multiple curves are displayed.

## Read the outputs

| Output | Interpretation |
| --- | --- |
| Plasma acyclovir | Predicted concentration in the model's central plasma compartment |
| CSF acyclovir | A simplified effect-compartment prediction with partition and lag assumptions |
| Plasma / CSF CMMG | Exploratory metabolite predictions, with additional model uncertainty |
| AUC | Area under the modeled concentration–time curve over the selected horizon |
| Peak | Estimated maximum in the simulated output; not a measured peak |
| Clearance and dialysis transfer | Model clearance terms and drug transfer over time; check each axis's units |
| Shaded interval | A range derived from sampled model parameters, not demonstrated patient-level coverage |

Longer horizons change the observation window for AUC and peaks. Keep the horizon fixed when making comparisons. A reference line or cell-culture susceptibility range does not establish a therapeutic target or toxicity cutoff.

## Custom events

Use the **Custom timeline** tools when repeat dosing is insufficient. Review every administration's time, route, amount, and IV duration. Apply pending edits before using the resulting curves. A mixed oral/IV timeline retains each event's own drug units.

For dialysis transitions, use a **Custom sequence** and review the session start/end times. Separate overlaid scenarios are independent comparisons; they do not combine into one treatment history.

## Save a reproducible result

Keep the configuration JSON together with your exported results, application version, primary scenario, and any external comparison data. A screenshot alone does not preserve all model inputs. See [Research and data exchange](Research-and-Data-Exchange).

[Home](Home) · [Worked examples](Worked-Examples)
