# Boelaert repeating-regimen window check

The joint endpoint analysis uses hours 96–120 as an approximation to the
source's steady-state daily interval. This experiment extends the identical
regimen to 20 daily doses and compares days 3, 5, 10 and 20.

Run from the repository root.

```sh
node research/validation/boelaert-steady-state.cjs
```

The three subjects and the three previously selected candidate configurations
are fixed. No fitting occurs. Each subject uses the original actual dose,
60-minute infusion and 4/4/4/12-hour PD dwell template.
The engine integrates at 0.125 h with explicit treatment and dose boundaries.
Source-fitted plasma endpoints and measured/source-derived recovery uncertainty
remain as documented in BOELAERT-JOINT.md.

## Day-five difference from day twenty

Values are relative differences in percent, with day twenty as denominator.

| Subject | Candidate | Trough difference, % | Daily recovery difference, % |
| --- | --- | ---: | ---: |
| 1 | Baseline | -0.597 | -0.569 |
| 4 | Baseline | -0.879 | -0.838 |
| 5 | Baseline | -0.630 | -0.601 |
| 1 | Shared grid minimum | -0.042 | -0.039 |
| 4 | Shared grid minimum | -0.073 | -0.067 |
| 5 | Shared grid minimum | -0.045 | -0.042 |
| 1 | Patient-4 minimum | -0.016 | -0.015 |
| 4 | Patient-4 minimum | -0.028 | -0.027 |
| 5 | Patient-4 minimum | -0.017 | -0.016 |

Under these configurations, the fifth simulated day is already within 0.9% of
day twenty for both endpoints. The difference is smaller with the faster
clearance candidates. Extending the regimen increases the baseline trough
slightly, so it cannot explain the approximately threefold overprediction
for patients 4 and 5.

This resolves a numerical window question within the inherited equations and
schedule. It does not establish that real patients followed those assumptions,
or resolve the missing effluent and residual clearance inputs.
The JSON retains all sampled days, the integration step and mass residuals.
