# CRRT clearance comparison in Collignon et al.

The patient was a 21-month-old girl weighing 10 kg with body surface area 0.46 m². Intravenous acyclovir was given as 500 mg/m² (230 mg) every eight hours over one hour. During sampling, dialysate flow was 2200 mL/h, replacement flow 750 mL/h and fluid removal 0–40 mL/h. Total effluent was therefore 2950–2990 mL/h, or 295–299 mL/kg/h. Blood flow was 100 mL/min. [Collignon et al., Pediatric Nephrology 2023;38:3493–3497, Table 1](https://doi.org/10.1007/s00467-023-05881-6)

The comparison calls the adult engine's parameter-construction function to examine its extracorporeal clearance term, CL = effluent × weight / 1000 × coefficient × delivered fraction, in L/h. Dividing by 0.06 gives mL/min. No age scaling enters this term. This component check does not run the adult compartmental model in the infant.

Two calculations use the reported flow range. The first retains the engine defaults of coefficient 0.95 and delivered fraction 0.85. The second substitutes each measured effluent-to-prefilter concentration ratio and assumes full delivery during sampling. Because these concentrations also define the authors’ effluent-based clearance, this second calculation checks the formula and units, rather than providing independent validation.

All clearance values below are mL/min. Reproduce with `node research/validation/collignon-crrt.cjs`.

| Sample | Published blood-based clearance | Published effluent-based clearance | Default coefficients at reported flow | Measured effluent/plasma ratio at reported flow |
|---|---:|---:|---:|---:|
| H1 | 19.2 | 27.6 | 39.70–40.24 | 27.39–27.76 |
| H2 | 19.8 | 42 | 39.70–40.24 | 42.01–42.58 |
| H4 | 21.8 | 37.9 | 39.70–40.24 | 37.35–37.85 |
| H5 | 24.6 | 44.1 | 39.70–40.24 | 44.12–44.72 |
| H7 | 26.3 | 40.3 | 39.70–40.24 | 40.26–40.81 |
| H8 | 21.2 | 44.3 | 39.70–40.24 | 43.70–44.30 |

## Interpretation and concentration reconstruction

The default coefficients at the reported flows yield 39.70–40.24 mL/min. This exceeds every blood-based estimate (19.2–26.3 mL/min) and falls within the overall effluent-based range (27.6–44.3 mL/min). The measured-ratio calculation approximately reproduces the effluent-based estimates. Small differences reflect published rounding and unspecified sample-specific fluid removal.

The filter combined diffusion and convection. The authors explicitly state that Ceff/Cpl cannot identify separate sieving and saturation coefficients. Substituting that ratio treats it as an effective combined transfer coefficient.

The paper combines samples from two infusions one day apart. H2, H5 and H7 belong to the first, while H1, H4 and H8 belong to the second. Connecting all table rows as a single concentration curve would misrepresent the observations. The first interval also included a predose sample. The authors report interval AUCs of 75 and 65 mg·h/L and an estimated total clearance of 52.2 mL/min.

Kidney function was preserved before CKRT, with creatinine 22 µmol/L. Endogenous clearance was estimated at 25.9–33 mL/min. Adult Cockcroft–Gault scaling is inapplicable at 21 months. A full concentration reconstruction requires an explicit pediatric endogenous-clearance model and alignment of the two sampling intervals. This report evaluates the existing CRRT clearance component only.
