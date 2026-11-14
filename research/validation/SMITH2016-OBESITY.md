# Smith 2016: separate renal estimation from body-weight scaling

Source: Smith TC, Kim JH, Gast CM, Benefield RJ. *Pharmacokinetics of acyclovir in a morbidly obese patient with renal impairment.* Int J Antimicrob Agents. 2016;47:340-341. [doi:10.1016/j.ijantimicag.2016.01.006](https://doi.org/10.1016/j.ijantimicag.2016.01.006). Reconstruction uses the supplied two-page article-in-press full text, including Table 1.

This is a **diagnostic reconstruction designed after reading the endpoints**, not a blinded validation, prospectively specified held-out test, or parameter fit. It changes no model equation, default, clinical weight rule, or pooled evidence scorecard. The patient is distinct from Smith 2010's CSF study.

## Source inputs and evidence status

The patient was female, age 61, 162.6 cm, actual weight 106.7 kg, source ideal weight 54.7 kg, serum creatinine 1.8 mg/dL. Source adjusted weight is 75.5 kg using IBW + 0.4(actual - IBW). Reported Cockcroft-Gault CrCl was 55 mL/min; a timed urine collection gave **19.4 mL/min**, without BSA indexing. Treatment was IV acyclovir **1000 mg every 8 h**, unchanged until sampling on day 19. No dialysis was reported.

| Endpoint | Published value | Status |
|---|---:|---|
| Post-infusion maximum | 43 mg/L | Observed maximum |
| Pre-next-dose concentration | 16.1 mg/L | Extrapolated by the authors, not a measured trough |
| Interval AUC | 217 mg·h/L | Derived from observed/extrapolated concentrations |
| Total clearance | 4.62 L/h | Derived from dose/AUC; not another independent observation |
| Apparent half-life | 5.13 h | Estimated by a one-compartment log-linear fit |

Samples were obtained 0, 0.5, 1, 2 and 4 h after infusion, but individual concentration values are not tabulated. **Do not invent serial observations from the reported peak or regression.** The source does not state infusion duration. We assume 1 h and report 0.5/2 h sensitivity. Peak and apparent half-life comparisons therefore depend on an unreported input.

## Reconstruction

```sh
node research/validation/smith2016-obesity.cjs research/validation/smith2016-obesity-results.json
node --test tests/smith2016-obesity.test.cjs
```

The script runs the actual AyFlux engine with nominal parameters, no uncertainty draws and no fitting. It keeps the administered dose at 1000 mg in **every** scenario. The CrCl comparison keeps PK weight at 106.7 kg. The structural weight comparison holds measured CrCl at 19.4 mL/min and substitutes source ideal/adjusted weights only into the model's weight scaling; this is not what the interface's CrCl weight selector does.

The engine supports up to 336 h. We approximate the source's assumed day-19 steady state with repeated dosing over 336 h, comparing the final interval [328,336] h. Consecutive pre-dose concentrations and a second simulation with one less burn-in interval agree within 0.1%. A 0.025 h grid is checked against 0.0125 h. Dose/AUC also recovers the model's total systemic clearance within 0.1%. The output records the engine SHA-256. Stored results were generated with Node 24.22.1.

For apparent half-life, the script fits log concentrations at the source's five post-infusion sample times. This descriptive slope is distinct from the two-compartment engine's terminal eigenvalue; both are reported. The source's apparent volume of distribution is not directly equated with either model compartment volume.

## Results

One-hour infusion, fixed 1000 mg q8h:

| Renal input | CrCl (mL/min) | PK weight (kg) | Peak (mg/L) | Pre-dose (mg/L) | AUC over 8 h (mg·h/L) |
|---|---:|---:|---:|---:|---:|
| Source reported estimate | 55.00 | 106.7 | 21.57 | 2.35 | 56.82 |
| CG, actual weight | 55.28 | 106.7 | 21.53 | 2.33 | 56.56 |
| CG, ideal weight | 28.36 | 106.7 | 27.06 | 6.22 | 97.86 |
| CG, adjusted weight | 39.13 | 106.7 | 24.20 | 4.02 | 75.74 |
| Measured clearance | 19.40 | 106.7 | 31.00 | 9.63 | 129.28 |
| **Published endpoints** | **19.40 measured** | **106.7 actual** | **43.00** | **16.10, extrapolated** | **217.00, derived** |

Measured CrCl increases predicted exposure relative to the reported estimate, but AUC remains **0.60 times** the published value. Model total clearance is 7.74 L/h versus the authors' derived 4.62 L/h.

Structural sensitivity at **fixed measured CrCl and fixed dose**:

| Weight used for PK scaling | Weight (kg) | Peak (mg/L) | Pre-dose (mg/L) | AUC over 8 h (mg·h/L) | Apparent half-life (h) |
|---|---:|---:|---:|---:|---:|
| Actual | 106.7 | 31.00 | 9.63 | 129.28 | 3.28 |
| Adjusted | 75.5 | 41.66 | 12.07 | 167.56 | 3.11 |
| Ideal | 54.7 | 54.88 | 14.87 | 213.38 | 2.97 |
| Published | - | 43.00 | 16.10 | 217.00 | 5.13 |

Ideal-weight scaling brings AUC closer, but overshoots the observed peak and does not reproduce the apparent half-life. Adjusted-weight scaling gives a closer peak with lower AUC. **No single substitution establishes an obesity correction.** Weight changes both volume and multiple clearance terms in this model; matching one endpoint cannot identify the responsible mechanism.

Infusion duration 0.5/1/2 h at actual PK weight and measured CrCl changes peak to **34.27/31.00/26.38 mg/L** and pre-dose concentration to **9.41/9.63/10.09 mg/L**. Interval AUC stays 129.28 mg·h/L, as expected for fixed dose and clearance at steady state. This uncertainty does not explain the nominal AUC gap.

## Limits and use

This one case combines obesity, renal impairment, sparse sampling and author-derived endpoints. It separates input-estimation error from residual structural mismatch but cannot determine a population weight exponent, validate a dosing strategy, or support a default model change. The measured clearance and fixed dose must remain separate from the weights selected for CG or exploratory PK scaling. No clinically safe or therapeutic concentration is inferred.

The paper PDF is not redistributed in the repository. The uploaded source remains the authority for source inputs. Keep this benchmark separate from the pooled scorecard because the endpoints have mixed measured/derived status and shared dependencies. Any future independent evaluation must state its hypotheses and choices before inspecting its outcomes; this reconstruction cannot be relabeled as that evaluation.
