# Boelaert paired trough and dialysate recovery analysis

Run from the repository root with Node.js.

```sh
node research/validation/boelaert-joint.cjs
```

## Source and endpoint alignment

Boelaert et al. J Antimicrob Chemother. 1987;20:69–76, doi:10.1093/jac/20.1.69.
Full text reviewed in the supplied PDF, printed pages 70 and 73, Tables I–II.
The existing reconstruction supplies patients 1, 4 and 5, whose urinary recovery
cells are blank. Residual CrCl zero is an assumption, rather than a measured
clearance established by those blank cells. No renal clearance is estimated here.

Table II describes dialysate recovery as a percentage of the daily dose and
reports 24-hour steady-state exposure. The comparison therefore uses the final
24-hour drain recovery, hours 96–120, divided by one daily dose. Cumulative
five-day recovery divided by five doses includes the accumulation period and
answers a different question. Table I plasma endpoints are treated as
source-derived fitted endpoints, following the existing reconstruction.

The inherited IV regimen and four daily dwells (4, 4, 4 and 12 h) are preserved.
The two outcomes are day-5 predose trough and daily dialysate recovery.
The engine SHA-256 and explicit grid are saved in the result JSON.

## Exploration

A common systemic multiplier scales both nonrenal parent-drug loss and
CMMG-formation clearance by the same factor through clearanceScale and
formFactor. This preserves the default ratio of those processes at zero CrCl.
It does not independently identify metabolism. PD transport is scaled through
pdTransport. All other assumptions remain as in the reconstruction.

Nineteen systemic multipliers (0.75–3 in steps of 0.125) and thirteen transport
multipliers (0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8, 12, 16, 24, 32) give 247
combinations per patient, 741 runs total. This extends the earlier 147-run grid
because two individual minima reached its transport boundary.

The shared score averages the sum of squared log predicted/source ratios across
trough and recovery. Peaks and AUC do not enter the fitting objective.
Daily AUC is integrated over hours 96–120 and compared with Table II values of
265, 194 and 218 µmol·h/L for patients 1, 4 and 5. These become 59.681, 43.691
and 49.096 mg·h/L. All outcomes come from the same subjects and paper, so these
additional checks do not constitute independent external validation.

A descriptive neighborhood contains grid scores within 0.01 of each individual's
minimum. That threshold has no confidence-interval interpretation.

## Extended results

All ratios below are model/source at the individual trough-and-recovery minimum.

| Patient | Systemic multiplier | Transport multiplier | Trough ratio | Recovery ratio | Peak ratio | Daily AUC ratio |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 1.125 | 0.75 | 1.07 | 1.06 | 1.15 | 1.14 |
| 4 | 1.875 | 6 | 1.06 | 0.82 | 1.25 | 1.02 |
| 5 | 1.875 | 3 | 1.02 | 0.99 | 1.00 | 0.90 |

The expanded-grid minima for patients 4 and 5 are interior. Patient 4 still
underpredicts daily recovery by about 18% and overpredicts peak by about 25%.
Patient 5 simultaneously approaches trough, recovery and peak, with daily AUC
about 10% below the source estimate.

Patient 5 has fourteen grid points within 0.01 of its minimum, spanning transport
multipliers 3–32 and systemic multipliers 1.875–2. This broad range supports weak
identifiability of transport under this objective. Patient 4 has four nearby
points spanning transport 4–8 and systemic 1.75–1.875. Patient 1 has two,
at transport 0.75 and systemic 1.125–1.25. These are sampled neighborhoods,
rather than continuous parameter intervals.

The best shared grid point is systemic multiplier 1.625 and transport 2. Its
trough ratios are 0.56, 1.37 and 1.33 for patients 1, 4 and 5. The corresponding
recovery ratios are 1.20, 0.80 and 1.02. A common setting continues to compromise
across patients.

The JSON includes half-step repeats of both the shared and individual minima.
These check numerical sensitivity within the same equations and event schedule.

## Source review checklist for Gem

- Confirm Table I day-5 troughs of 6.3, 3.0 and 2.9 µmol/L for patients 1, 4 and 5.
- Confirm Table II daily recovery fractions of 10.6%, 13.6% and 12.3%.
- Confirm 24-hour steady-state AUC values of 265, 194 and 218 µmol·h/L.
- Check the recovery collection window and the four dwell durations against Methods.
- Assess whether blank urine-recovery cells justify the inherited anuric subset.
- Check the status of the plasma endpoints as source-derived/fitted values.

## Interpretation

Faster systemic elimination can correct excessive troughs while reducing the
amount available for peritoneal recovery. Increasing membrane transport partly
compensates, with different trade-offs across patients. The grid supports
patient heterogeneity or uncertainty in the inherited inputs and coefficients.
It cannot identify a unique mechanism or justify adopting the shared multipliers
as model defaults.

The complete 741-row grid is in boelaert-joint-grid.csv. The JSON records the
baseline, shared and individual grid minima, numerical sensitivity and provenance.
