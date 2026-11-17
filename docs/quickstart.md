# First use

Open [AyFlux](https://ayflux.org/). No installation or account is needed to run the simulator.

1. Enter the dose history, body weight, kidney function and dialysis schedule for an illustrative scenario. Keep the time origin consistent across doses and dialysis sessions.
2. Inspect the plasma acyclovir graph. Check the time axis, concentration units and dialysis intervals before comparing curves.
3. Open **Compare with a published study** on the plasma graph. Read the study's dose, sampling and reconstruction notes before interpreting its overlay. Published observations, author-fitted concentrations and assumed inputs are identified separately.
4. Export the configuration and the concentration table if you need to reproduce the scenario. Record the AyFlux release or exact commit alongside them.

A mismatched curve may reflect unavailable inputs, study-specific conditions or model limitations. Agreement with a source used to set a parameter is not independent validation. The [methods](https://ayflux.org/learn/model-methods/) explain the assumptions; the [study scripts](../research/validation/) record individual reconstructions.

For a code-based example, run the documented [CAPD comparison](../research/validation/README.md). For local installation, use the [repository setup instructions](../README.md#run-locally).

AyFlux is for education and exploratory research. Do not use its predictions to prescribe treatment or diagnose neurotoxicity.
