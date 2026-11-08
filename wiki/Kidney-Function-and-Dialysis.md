# Kidney function and dialysis

AyFlux accepts kidney function and dialysis settings as model inputs. It does not infer an appropriate prescription or forecast renal recovery.

## Residual kidney function

CrCl is expressed in **absolute mL/min**. The interface can use an entered value or a Cockcroft–Gault calculation. Do not silently substitute a body-surface-area-indexed value in different units.

With constant kidney function, the entered CrCl remains fixed. With a time-varying profile, user-entered hour/CrCl points define a piecewise-linear trajectory. This is a hypothetical input path, not a prediction from serum creatinine. The detailed CSV records the entered residual CrCl at output times; the configuration retains the original points.

At **CrCl = 0**, the modeled renal clearance terms are zero. Other modeled elimination pathways can remain active, so zero renal clearance does not mean zero total drug elimination.

## Dialysis modes

| Mode | Inputs to inspect | Interpretation |
| --- | --- | --- |
| No dialysis | Residual CrCl and other PK parameters | A reference simulation without extracorporeal removal |
| Intermittent HD | Start, duration, repeat timing, modeled clearance | Removal is active during scheduled sessions |
| Peritoneal dialysis | CAPD/APD method, exchanges, fill volume, dwell and transfer assumptions | Exchange timing and dialysate mass balance influence modeled removal |
| CRRT | Effluent and clearance-related assumptions | A simplified continuous-treatment scenario |
| Custom sequence | Mode and start/end of each session | One modeled timeline of treatment transitions |

Do not equate effluent flow, residual CrCl, and drug clearance merely because some quantities use mL/min. They have different meanings in the model.

## Peritoneal dialysis details

The full interface includes exchange-specific prescription tools. Inspect fill and dwell settings together: changing one can change the schedule or modeled drug transfer. Drug remaining in dialysate and drug discarded at an exchange boundary are different quantities in the accounting model.

CAPD and APD in Lite are separate schedules using the shared engine. Their results need not match even when fill volume is the same. Neither provides patient-specific membrane characterization.

## Comparing schedules

Keep medication events, weight, kidney function, time horizon, and uncertainty settings fixed while changing one dialysis input. Check the plotted schedule shading and summary units. For a custom sequence, ensure the session list reflects the intended order rather than treating independent scenario overlays as sequential therapy.

See the [dialysis guide](https://ayflux.org/learn/dialysis/) and [model equations](https://ayflux.org/learn/model-methods/#equations) for implementation assumptions and source references.

[Home](Home) · [Worked examples](Worked-Examples)
