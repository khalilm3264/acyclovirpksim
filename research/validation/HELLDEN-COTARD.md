# Helldén 2007 case 1: CMMG between dialysis sessions (#46)

Helldén A, Odar-Cederlöf I, Larsson K, Fehrman-Ekholm I, Lindén T. Death delusion. *BMJ* 2007;335:1305. [doi:10.1136/bmj.39408.393137.BE](https://doi.org/10.1136/bmj.39408.393137.BE). Reference [45].

**This case set AyFlux's non-kidney CMMG clearance: 0.5 L/h since the #46 model change (previously 0.25).** Hara 2008 is the independent check. Reproduce with `node research/validation/hellden-cotard.cjs`. Results are in `hellden-cotard-results.json`.

## The case

A 35-year-old woman with a failing kidney transplant on chronic haemodialysis took valaciclovir 1 g daily, starting after dialysis on day 1, 3 g in total. Measured serum values (µmol/L):

| Sample | Acyclovir | CMMG |
|---|---:|---:|
| Before dialysis, 30 h after the last dose | 19.4 | 90.2 |
| After that session | — | 21.1 |
| Before dialysis on day 6 | 1.8 | 8.9 |
| After that session | — | 1.5 |

**Reported:** the dose, the 3 g total, the 30 h gap and the six concentrations. **Assumed:** doses at 0, 24 and 48 h; 4-hour sessions at 78 h and 126 h (48 h apart); 60 kg; CrCl 0. Residual function from the failing transplant is not reported. The figure gives the trajectories, but its values are not digitized here.

## Results

| HD clearance | CMMG non-kidney clearance (L/h) | Before session 1: acyclovir / CMMG | After session 1: CMMG | Day 6 before: CMMG | Day 6 after: CMMG | RMS log error |
|---|---|---|---|---|---|---:|
| | **Measured** | **19.4 / 90.2** | **21.1** | **8.9** | **1.5** | |
| 81.8 (default) | 0.25 (before #46) | 21.0 / 114.1 | 50.7 | 46.6 | 20.1 | 1.32 |
| 159 (Hara-matched) | 0.25 (before #46) | 21.0 / 114.1 | 23.6 | 25.4 | 5.1 | 0.67 |
| 159 | **0.5 (current default)** | 21.0 / 84.4 | 17.1 | 15.3 | 3.0 | 0.38 |
| 159 | 0.75 | 21.0 / 64.6 | 12.9 | 10.0 | 1.9 | 0.27 |

- **Acyclovir fits.** The level 30 h after the last dose is predicted within 8% at CrCl 0, so acyclovir exposure and CMMG formation input are about right.
- **CMMG leaves too slowly between sessions.** Measured CMMG fell from 21.1 to 8.9 µmol/L over the gap, an apparent half-life of about 35 h. Post-dialysis rebound would make the true half-life shorter still. With the former 0.25 L/h (nominal half-life 67 h at 60 kg), AyFlux predicted CMMG *rising* after the first session, and day-6 CMMG was 2.6–3 times the measured value at 50, 60 and 80 kg.
- **Residual kidney function does not explain it.** At CrCl 2 mL/min, the acyclovir level before session 1 drops to 15.0 against 19.4 measured.
- **No single value fits everything.** 0.75 L/h fits the between-session data best but underpredicts the first peak (64.6 vs 90.2). 0.5 L/h was chosen as the value that also fits Hara.

## Independent check against Hara 2008

Hara was not used to choose the value. Hara's single-dose CMMG peak (7.47 mg/L measured) is predicted at 8.57 with 0.25 L/h, **7.06 with 0.5 L/h** and 6.08 with 0.75 L/h. Both sources favor 0.5 L/h: a nominal CMMG half-life of about 39 h at 70 kg with no kidney function, instead of 78 h.

## Limits

One patient with a failing transplant; weight, session lengths, session times and dialyzer are unknown. The before/after outputs of every validation script for the change are in `MODEL-CHANGE-46.md`.
