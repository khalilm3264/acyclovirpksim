# Abe 2021: conditional serial pre-HD comparison

Research only. One AKI case; no clinical dose guidance or patient-level validation.

Source: Abe et al., Fundamental Toxicological Sciences 2021;8:229–233, [doi:10.2131/fts.8.229](https://doi.org/10.2131/fts.8.229), original Results p231 and Figure 3C p232. Reviewed 14 November 2026 following #75 comment 6884989116.

| Hospital day | Serum ACV (µg/mL) | Serum CMMG (µg/mL) | Provenance |
|---|---:|---:|---|
| 1 | 11.2 | 36.4 | Numerical, before HD |
| 2 | 5.39 | 16.37 | Numerical, before HD |
| 3 | 2.26 | 7.22 | Numerical, before HD |
| 7 | <0.1 | <0.1 | Numerical detection limits; not zero |

ACV day2/day1 and day3/day2 ratios are 0.481 and 0.419; CMMG ratios are 0.450 and 0.441. These describe combined HD, interdialytic disposition and changing renal function. They are not session extraction fractions or body drug removal.

**Figure qualification:** Figure 3C contains an additional early plotted pair between the day1 and day2 pre-HD pairs, near the first HD arrow. Thus saying that no early post-first-HD point is plotted would be incorrect. Its exact values and blood-draw time are not supplied numerically, and the arrow does not establish the interval from disconnect. It is excluded from the numerical comparison. No precisely timed end-of-session plus delayed drug-free pair is established, so no rebound magnitude is computed. The snippet-derived 8.2/8.5 baseline is discarded.

## Prespecified conditional reconstruction

The source reports a 63-year-old man prescribed valacyclovir 500 mg three times daily, symptoms after seven days, AKI and three daily HD treatments. Weight, actual administration clock times, last-dose gap, session durations/clearances and draw clock times are unavailable. Serum creatinine declined from 12.9 mg/dL on day1 to 6.75 on day3 and 3.40 on day7; these are not measured CrCl and are affected by HD/nonsteady state.

The script uses 21 doses 8h apart, last-dose-to-day1 gaps 8/24h, nominal pre-HD draws 24h apart, HD beginning at each draw, durations 2/4h and clearance 81.8/159 mL/min. These are illustrative assumptions, not recovered patient prescriptions. No doses occur afterward. Weight is 70kg, with separate 50/90kg sensitivity. Renal scenarios are constant CrCl0, constant 5, or 5 at day1 rising linearly to10 on day3 and20 on day7 (all mL/min); preadmission recovery-scenario CrCl is5. Neither recovery curve nor preadmission AKI onset is inferred from creatinine.

All 24 combinations are retained without selecting a best match. Absolute concentrations depend strongly on the hypothetical preadmission history; serial ratios describe the simulated course without baseline rescaling or fitting. Day7 is assessed only by whether each prediction is below 0.1. Censored values never enter ratios or residuals. No aggregate fold score, scorecard addition or independent cohort count is created.

## Conditional results

Across the 24 scenarios, day1 ACV spans 2.86–11.55 and CMMG 10.10–42.19 µg/mL; day3 ACV spans 0.052–1.62 and CMMG 0.181–15.13 µg/mL. All scenarios underpredict the reported day3 ACV 2.26. This grid does not recover a verified patient course. All eight anuric scenarios predict day7 CMMG above 0.1; all eight constant 5 and eight recovery scenarios predict it below 0.1. Every scenario predicts day7 ACV below 0.1. These are assumption sensitivities, not statistical intervals or evidence that one renal trajectory is true.

## Reproduction

```sh
node research/validation/abe-serial-prehd.cjs /tmp/abe-results.json
cmp research/validation/abe-serial-prehd-results.json /tmp/abe-results.json
```

The script checks adult engine Git blob `17971df66e0a97b4d382572a582d35c444a3c83f`, calls the actual engine deterministically, and checks baseline predictions at 0.125 versus 0.0625h steps (maximum relative difference <0.01). Source observations, assumptions, all predictions, serial ratios and day7 censor comparisons are in the tracked JSON. Model defaults, application UI and manuscript results are unchanged.
