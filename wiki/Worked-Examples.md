# Worked examples

These exercises use hypothetical inputs to demonstrate model behavior. They are not dosing or dialysis recommendations. Save each configuration and keep its result files together.

## 1. Isolate the effect of kidney function

1. Open the full simulator and retain a single route and repeat-dose schedule.
2. Select **No dialysis** and constant kidney function.
3. Use a fixed 96-hour horizon and record the medication settings and body weight.
4. Run separate hypothetical CrCl values of 95, 30, and 0 mL/min, leaving other inputs fixed.
5. Export each result and compare plasma concentration curves and AUC over the same time window.

The exercise tests sensitivity to an input. At zero CrCl, verify zero modeled renal clearance rather than expecting all elimination to stop. If uncertainty is enabled, retain the same sampling settings.

## 2. Compare an HD timing change

1. Keep the same medication settings, CrCl, body weight, and horizon in both runs.
2. Select **Intermittent HD** and record duration, repeat timing, and modeled clearance.
3. Compare two hypothetical first-session times, such as hour 12 and hour 24.
4. Confirm the primary scenario's schedule shading moves with the session.
5. Compare the time courses, not only the maximum value: the peak can occur before the schedules differ.

This is a timing comparison within the chosen model. It does not identify an optimal clinical session time.

## 3. Enter a hypothetical renal trajectory

1. Choose the time-varying CrCl option and a 96-hour horizon.
2. Enter points at 0 hours / 50 mL/min, 48 hours / 10 mL/min, and 96 hours / 95 mL/min.
3. Keep dosing and dialysis settings unchanged from a saved constant-CrCl baseline.
4. Inspect the kidney-function trace and its relationship to the concentration curves.
5. Export the detailed CSV and retain the JSON configuration containing the original points.

The software interpolates between these points. It does not predict that a person's kidney function will follow this path.

## 4. Explore two inputs in 3D

1. Complete an HD simulation, then open the visual explorer from **Research tools** to copy its settings.
2. Choose constant CrCl for X and HD duration for Y. Keep the duration range within the HD repeat interval.
3. Select plasma acyclovir AUC and start with a **7 × 7** grid.
4. Generate the map, then select a cell to inspect that scenario's curves and drug accounting.
5. Open the optional 3D surface and rotate it. Compare apparent slopes with exact heatmap values.
6. Export the grid CSV before changing inputs.

The surface connects sampled deterministic outputs. It does not calculate a continuous optimized regimen or add evidence between grid points.

## Record your comparison

| Record | Why it matters |
| --- | --- |
| App version and configuration JSON | Identifies software and assumptions |
| Route, dose events, and dialysis events | Defines the simulated input history |
| CrCl setting/profile and weight | Preserves the modeled individual |
| Horizon and units | Makes summaries comparable |
| Deterministic or uncertainty settings | Explains differences between outputs |
| External data source, if used | Makes comparison provenance traceable |

[Home](Home) · [Research and data exchange](Research-and-Data-Exchange)
