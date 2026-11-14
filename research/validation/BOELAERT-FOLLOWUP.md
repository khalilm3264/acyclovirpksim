# Patient 4 source audit and fixed-candidate CAPD comparison

Run from the repository root.

```sh
node research/validation/boelaert-followup.cjs
```

## Patient 4 audit

Boelaert 1987, printed p. 70 Table I reports male, age 49, weight 59 kg and
actual daily IV dose 142 mg. Methods on pp. 70–71 report 60-minute infusions,
2 L of 1.36% glucose solution, three four-hour dwells and one overnight
12-hour dwell. Morning infusion begins after the exchange. These values agree
with the existing reconstruction. The nominal 2.5 mg/kg corresponds to 147.5 mg,
but this comparison retains the 142 mg recorded in the patient table.

Table II, p. 73, gives a fitted central volume of 28.2 L (0.478 L/kg).
The engine uses 0.32 × 59 = 18.88 L. A source-informed sensitivity therefore sets
vcScale to 28.2/18.88 = 1.493644. The source three-compartment rate constants
also imply different distribution kinetics from the engine. Changing central
volume alone is a partial sensitivity, with the engine's other distribution
parameters retained.

The authors fitted plasma concentrations and dialysate amounts jointly. The
reported peak, trough, daily AUC and model-derived quantities are therefore
dependent outputs of their fitted model. Matching all of them is informative
about reconstruction agreement, with independent raw-data validation still pending.

## Central volume sensitivity

Ratios below are predicted/source for day-5 endpoints. Source daily AUC is
194 µmol·h/L, or 43.691 mg·h/L. Source trough and peak are 3 and 22 µmol/L.

| Candidate | Central volume, L | Peak ratio | Trough ratio | Recovery ratio | Daily AUC ratio |
| --- | ---: | ---: | ---: | ---: | ---: |
| Baseline | 18.88 | 1.57 | 2.96 | 0.90 | 1.87 |
| Baseline | 28.20 | 1.28 | 3.25 | 0.88 | 1.85 |
| Shared Boelaert setting | 18.88 | 1.33 | 1.37 | 0.80 | 1.18 |
| Shared Boelaert setting | 28.20 | 1.05 | 1.61 | 0.79 | 1.18 |
| Patient 4 setting | 18.88 | 1.25 | 1.06 | 0.82 | 1.02 |
| Patient 4 setting | 28.20 | 0.98 | 1.26 | 0.82 | 1.02 |

The larger central volume lowers peak while increasing trough. It preserves the
remaining recovery discrepancy. The shape of the profile requires more than a
single volume substitution to reconcile these endpoints.

## Fixed candidates in Stathoulopoulou 2002

The supplied full text of Nephron 2002;91:164–166, doi:10.1159/000057621,
was checked for the dose, collection period and Table II subsets. The existing
reconstruction uses one 500 mg oral valacyclovir dose with 24-hour recovery.

Candidate coefficients were fixed from the preceding Boelaert analysis.
No external outcome enters an optimization. The prior Stathoulopoulou
baseline discrepancy was already known, so this is a transportability
sensitivity rather than a prospective test of an untouched dataset.

| Candidate | clearanceScale / formFactor | pdTransport |
| --- | ---: | ---: |
| Baseline | 1 / 1 | 1 |
| Shared Boelaert setting | 1.625 / 1.625 | 2 |
| Patient 4 Boelaert setting | 1.875 / 1.875 | 6 |

All three candidates are run at weights 50, 70 and 90 kg and CrCl values
0, 0.5, 1, 2, 5 and 10 mL/min. The four six-hour exchanges, glucose and
bioavailability are inherited illustrative inputs. Individual source weights,
CrCl and exchange details remain unavailable.

At positive CrCl, clearanceScale also multiplies the renal term. Thus those
scenarios transfer the actual configured coefficient changes, with effects on
both renal and nonrenal clearance. Zero-CrCl scenarios isolate the anuric case.

The source's recovery denominator remains ambiguous. Both tablet-mass and
equimolar acyclovir interpretations are shown. The anuric participants 1–4
have mean reported recovery 6.975%; the mixed eight-person subset has mean
6.5125%. The means refer to different subsets.

| Candidate | Anuric recovery / tablet mass, % | Anuric recovery / ACV-equivalent mass, % |
| --- | ---: | ---: |
| Baseline | 2.17–3.56 | 3.12–5.13 |
| Shared Boelaert setting | 2.20–3.51 | 3.17–5.05 |
| Patient 4 Boelaert setting | 2.10–3.31 | 3.02–4.77 |

All anuric predictions remain below the 6.975% source mean under both denominator
interpretations. Some overlap individual reported recoveries. Unknown
patient-specific inputs and denominator conventions limit interpretation.
The selected Boelaert adjustments do not resolve this external recovery
discrepancy under the inherited assumptions.

Across all 54 external runs, halving the step from 0.125 to 0.0625 h changes
urinary or dialysate recovery by at most 0.000198 mg. The reused runner also
checks mass balance. Numerical stability does not resolve source-input uncertainty.

## Next evidence needs

Confirm actual effluent volumes, individual body sizes and residual clearances
before pursuing more elaborate parameter fitting. A source-informed distribution
experiment would also need the complete disposition parameterization and its
units, with the calibration status recorded explicitly.
