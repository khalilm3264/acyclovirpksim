# Boelaert numerical solver experiment

Run from the repository root with Node.js and the pinned research dependency.

```sh
npm install --prefix /tmp/ayflux-odex --ignore-scripts --no-audit --no-fund odex@3.0.0-rc.4
NODE_PATH=/tmp/ayflux-odex/node_modules node research/validation/compare-odex.cjs
```

The experiment evaluates all three Boelaert patients in the existing reconstruction, using its default coefficients and event schedule. A private VM copy replaces the RK4 compartment step with ODEX. Ten integrated states include the six compartment/fluid states and four cumulative elimination fluxes. Assertions require finite endpoints, successful interval completion and mass residual below 1e-6 mg.

ODEX restarts at every output/event interval. This isolates compartment integration differences while preserving PD transfer timing, drain events, positivity clamps, CSF updates and trapezoidal AUC. ODEX at 0.125 hours is a comparison reference, with both absolute and relative tolerance 1e-10. Agreement measures numerical convergence within this implementation. Shared scheduling or equation errors require independent checks.

| Patient | Method | Day-5 trough (mg/L) | 120-hour AUC (mg·h/L) | Drained (mg) | Maximum mass residual (mg) |
| --- | --- | ---: | ---: | ---: | ---: |
| 1 | rk4 | 1.74440072 | 332.049286 | 70.950160 | 3.41e-13 |
| 1 | rk4-half | 1.74439639 | 332.045766 | 70.950943 | 2.27e-13 |
| 1 | odex | 1.74440064 | 332.049253 | 70.950175 | 4.66e-12 |
| 1 | odex-half | 1.74439639 | 332.045764 | 70.950944 | 2.02e-12 |
| 4 | rk4 | 2.00198559 | 361.737518 | 77.022403 | 2.27e-13 |
| 4 | rk4-half | 2.00198144 | 361.734539 | 77.023277 | 6.82e-13 |
| 4 | odex | 2.00198553 | 361.737492 | 77.022418 | 5.34e-12 |
| 4 | odex-half | 2.00198143 | 361.734537 | 77.023277 | 3.87e-12 |
| 5 | rk4 | 1.90561522 | 360.134024 | 76.912653 | 5.68e-13 |
| 5 | rk4-half | 1.90561060 | 360.130332 | 76.913504 | 2.27e-13 |
| 5 | odex | 1.90561514 | 360.133990 | 76.912669 | 2.9e-12 |
| 5 | odex-half | 1.90561060 | 360.130330 | 76.913505 | 5.34e-12 |

Current RK4 differs from half-step ODEX by at most 0.000249% at the day-1/day-5 troughs, 0.001061% in AUC and 0.001136% in drained drug mass across these patients. Inference from this experiment suggests that compartment integration error contributes very little to the reported trough discrepancy in these reconstructions.

The JSON archive includes measured Node runtimes. The ODEX adapter runs in a VM and creates a solver per output interval, so these timings cannot establish browser performance or the speed of an optimized adaptive implementation. CSF convergence and independent PD event correctness remain outside this experiment.

The source-specific protocol and published fitted concentrations are documented in `boelaert-capd.cjs`.
