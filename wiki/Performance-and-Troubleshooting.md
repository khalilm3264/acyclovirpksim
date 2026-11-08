# Performance and troubleshooting

## Choose the smallest interface that fits the task

**Lite** uses the current shared PK engine with a deterministic configuration and native Canvas charts. It compares no dialysis, HD, CAPD, APD, and CRRT with basic medication, kidney, and dialysis inputs. It omits the full simulator's uncertainty sampling, CSF forecasts, observation fitting, and advanced research tools.

Find [Lite](https://ayflux.org/lite/) directly or in the collapsed alternative-interface section of the [user guide](https://ayflux.org/learn/).

The full simulator loads chart libraries on demand. The separate explorer loads its 3D bundle only after you request the surface. A slow first chart load and a slow numerical simulation are different problems.

## Common problems

| Symptom | What to check |
| --- | --- |
| Interactive charts cannot load | Check the connection, reload, and use the error message's **open AyFlux Lite** link |
| Grid calculation is slow | Start with 7 × 7; check the horizon; cancel an unwanted run |
| Optional 3D cannot open | Keep using the heatmap and SVG views; inspect browser WebGL support and connection if needed |
| Results appear unchanged | Check validation errors, pending edits, selected scenario, and whether calculation has completed |
| Old wording or layout appears | Try a hard refresh (Ctrl+Shift+R on Windows/Linux); service-worker assets can remain cached |
| Offline charts are missing | Standard charts need an initial successful online load; optional 3D assets are not in the current service-worker cache list |
| Report does not open | Allow the requested report pop-up, then retry and use Save as PDF |
| External import fails | Use CSV within the stated size limit; explicitly map numeric columns and supported units |
| Explorer rejects an axis | Check custom-dose, renal-profile, HD-mode, and repeat-interval restrictions |

## Offline and privacy boundaries

The service worker caches selected public static assets. It does not guarantee every optional feature will work offline. Navigation fallback can show the main app when a requested page was never cached; this is not evidence that the requested page loaded.

Simulation and CSV comparison run in the browser. Local processing does not mean the website makes no network requests: initial application assets and optional libraries must still be obtained, and hosting infrastructure handles ordinary web requests. Do not put private data in public bug reports, screenshots, or shared exports.

## Report a reproducible issue

Include the app version, browser and operating system, selected mode, exact steps, expected result, observed result, and a minimal synthetic configuration. For rendering problems, add a screenshot without private information. For numerical problems, attach labeled result files and units.

Use [GitHub Issues](https://github.com/khalilm3264/acyclovirpksim/issues). Send security concerns through the contact listed in [SECURITY.md](https://github.com/khalilm3264/acyclovirpksim/blob/main/SECURITY.md), rather than publishing sensitive details.

[Home](Home) · [Visual explorer](Visual-Explorer)
