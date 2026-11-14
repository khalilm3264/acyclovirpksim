# Ito 2025 conditional washout comparison

Source: Ito T et al. Impact of continuous hemodiafiltration on serum acyclovir concentrations in a patient with encephalopathy. J Infect Chemother. 2025;31(12):102859.
Accepted manuscript https://hdl.handle.net/20.500.14094/0100498244, file SHA256 9802acdd835af60745d282532b4b58b3c48a6979e0bc414ed88a7c5cf0392475.

## Source extraction

PDF page 16, Figure 2 has a linear time axis (0–48 h) and logarithmic concentration axis (0.1–100 µg/mL). The admission concentration is reported as 14.1 mg/L. Visual readings of the subsequent markers are approximately 3.0 mg/L at 15 h and 0.5 mg/L at 39 h. These are graph estimates, with unquantified digitization error. Their two-point apparent half-life is 9.28 h, consistent with the authors' 9.3 h. The connecting line is illustrative.

The plotted CHDF bars span approximately 4.5–13 h and 18–48 h. The narrative on PDF page 6 reports a seven-hour first session and a 5.5-hour interruption. These do not exactly match the bars. The primary comparison uses the plotted start at 4.5 h and narrative durations, hence restart at 17 h. A separate sensitivity uses the plotted boundaries.

Reported weight is 66.2 kg. Earlier CrCl is 12.9 mL/min, before transfer, with creatinine 4.02 mg/dL. Admission creatinine is 3.73 mg/dL, and renal recovery is documented. Constant CrCl 12.9 is an assumption. CMMG was not measured.

## Calculation and assumptions

Run node research/validation/ito2025.cjs from the repository root. The saved results record all settings and predictions. Core engine parameters are drawn once with variability zero. The script integrates the engine's parent-drug central and peripheral equations with RK4. The engine itself starts from zero drug, so this separate conditional calculation initializes central concentration at the reported admission value and peripheral concentration at the same value.

Dialytic clearance is assumed to equal effluent flow multiplied by sieving coefficient 0.95 and delivered fraction 1. Effluent is 2.1 L/h initially (1.8 dialysate plus 0.3 filtration), then 0.8 L/h (0.5 plus 0.3). The replacement rate is not added a second time. Continued filtration after restart is assumed. Additional net fluid removal and predilution effects are uncertain. No further drug input is assumed after admission.

The observed follow-up points were known before this calculation. This is an exploratory conditional comparison. No parameter is optimized to either follow-up observation.

## Results

| Assumption | Predicted at 15 h, mg/L | Predicted at 39 h, mg/L |
| --- | --- | --- |
| Primary | 2.956 | 0.324 |
| CrCl zero | 6.136 | 1.907 |
| Peripheral concentration initially half central | 2.080 | 0.228 |
| Peripheral concentration initially twice central | 4.708 | 0.515 |
| Plotted treatment boundaries | 2.797 | 0.313 |
| Zero dialytic clearance | 3.696 | 0.544 |

The primary predicted/observed ratios are 0.99 and 0.65. Halving the numerical step from 0.01 to 0.005 h agrees within 0.001 mg/L at both times. Assumed residual kidney clearance and initial peripheral drug concentration materially change the comparison. Even the zero-dialysis scenario approaches the two observations under these assumptions, limiting inference about CHDF-specific clearance.

This case supports an observed decline during interrupted CHDF. It leaves the magnitude and timing of any interruption-related rebound unresolved. The apparent agreement at 15 h cannot establish adult CRRT validation, CMMG kinetics, or treatment efficacy.
