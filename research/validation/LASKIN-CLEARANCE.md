# Renal vs nonrenal acyclovir clearance against Laskin 1982

**Scientific verification check, not clinical dose guidance.** Addresses issue #51. No model equation, parameter, default or schema is changed.

## Source

Laskin OL, de Miranda P, King DH, et al. *Effects of probenecid on the pharmacokinetics and elimination of acyclovir in humans.* Antimicrob Agents Chemother. 1982;21(5):804–807. doi: [10.1128/aac.21.5.804](https://doi.org/10.1128/aac.21.5.804).

Three volunteers with normal renal function received acyclovir 5 mg/kg as a 1-hour infusion, before and after oral probenecid 1 g. Values below are mean ± SD from the abstract, in mL/min per 1.73 m²:

| Quantity | Value |
|---|---:|
| Total clearance | 300 ± 69 |
| Renal clearance | 248 ± 80 (83% of total) |
| Estimated creatinine clearance | 90 ± 48 |
| Renal clearance after probenecid | 168 (a 32% decline) |
| AUC without / with probenecid (nmol·h/mL) | 91.3 / 127.6 (+40%) |

The abstract states renal clearance was "almost threefold" creatinine clearance. The ratio of the means is 2.76. Nonrenal clearance is not reported; 52 mL/min below is derived by subtraction, and its uncertainty is not available from the abstract.

The anuric reference is the intercept of 28.7 mL/min per 1.73 m² from Sadjadi's review, cited on the site as [23].

## Run it

```bash
node research/validation/laskin-clearance.cjs
```

It calls the same `public/assets/pk-engine.js` functions as the website, at the nominal 70 kg subject, CrCl 90 mL/min, no dialysis and no variability. Total clearance is dose divided by the simulated AUC and equals the sum of the parameter terms.

## Result

| Quantity | Laskin 1982 | Engine |
|---|---:|---:|
| Renal clearance at CrCl 90 (mL/min) | 248 ± 80 | 303.0 |
| Nonrenal clearance (mL/min) | 52 (derived) | 28.7 |
| Total clearance (mL/min) | 300 ± 69 | 331.7 |
| Renal fraction of total | 83% | 91% |
| Renal clearance / CrCl | 2.76 | 3.37 |
| Anuric total clearance (mL/min) | 28.7 (Sadjadi [23]) | 28.7 |
| Total clearance fall when renal clearance falls 32% | 26.7% | 29.5% |
| AUC increase when renal clearance falls 32% | 39.8% | 41.8% |

The last two rows emulate probenecid by scaling the renal term to 68% (CrCl 61.2 mL/min). The engine has no separate tubular-secretion term, so this is a scaling of one renal term, not a mechanistic probenecid model.

## Interpretation

- **Renal clearance:** the engine's term is about 22% above the Laskin mean (303 vs 248) and its renal-to-creatinine ratio is 3.37 against 2.76. The engine value lies within one SD of the Laskin mean (±80, n = 3), so this is not evidence of a discrepancy.
- **Total clearance:** 331.7 against 300 ± 69, also within one SD.
- **Nonrenal clearance:** the engine's 28.7 mL/min matches the Sadjadi anuric intercept exactly, because that is what it was anchored to. It is lower than the 52 mL/min obtained by subtracting Laskin's means. The two are not independent estimates of the same quantity (different populations, and the Laskin figure is a difference of two noisy means), so they are reported side by side and not reconciled.
- **Probenecid response:** a 32% fall in renal clearance gives a 41.8% AUC increase in the engine against 39.8% observed. This follows mostly from the renal/nonrenal split, so it supports that split at normal renal function but does not test the anuric end.
- **Composition of the nonrenal term:** of the engine's 28.7 mL/min nonrenal clearance, 26.7 mL/min (93%) is formation of CMMG and only 2.0 mL/min is other nonrenal elimination. This is the quantity at issue in #46, and Laskin 1982 cannot constrain it because it measured parent drug only.

## Limits of this check

- Three volunteers, normal renal function, parent drug only. It says nothing about CMMG or about reduced renal function.
- Laskin reports per 1.73 m²; the engine uses mL/min at 70 kg with allometric scaling (exponent 0.75). For a 70 kg adult the difference is small, but it was not adjusted for.
- Only the abstract was used. Individual subject values would give a better ratio estimate than the ratio of means.

## Conclusion

No parameter change is recommended on the basis of this comparison alone. The renal and total clearance terms agree with Laskin 1982 within its reported spread. The open scientific question is the formation fraction of the nonrenal term (#46), which this source cannot address.
