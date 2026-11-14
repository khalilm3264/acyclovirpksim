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

Seven systemic multipliers (0.75–3) and seven transport multipliers (0.5–4)
give 49 combinations per patient. The shared score averages the sum of squared
log predicted/source ratios across the two endpoints and three patients.
Equal log errors receive equal weight. This objective is an exploratory choice,
with no sampling-error or digitization-error weighting. The observations were
known before selecting the grid. These results describe calibration and
sensitivity, with generalization still untested.

## Results

| Patient | Source trough, mg/L | Baseline trough | Shared-grid trough | Source recovery, % dose | Baseline recovery | Shared-grid recovery |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 1.419 | 1.744 | 0.908 | 10.6 | 14.35 | 13.61 |
| 4 | 0.676 | 2.002 | 1.059 | 13.6 | 12.22 | 11.58 |
| 5 | 0.653 | 1.906 | 0.994 | 12.3 | 14.05 | 13.33 |

The best shared point on this grid is systemic multiplier 1.5 and PD transport
multiplier 2. Patients 4 and 5 improve from trough ratios of 2.96 and 2.92 to
1.57 and 1.52. Patient 1 shifts from 1.23 to 0.64. The shared mean score falls
from 0.830 to 0.224. The point is a compromise across patients.

Separate grid minima differ. Patient 1 favors systemic 1.25 and transport 0.75,
giving trough and recovery ratios 0.91 and 0.97. Patients 4 and 5 favor systemic
2 and transport 4. Their recovery ratios are 0.77 and 0.98, with trough ratios
0.94 and 0.90. Transport 4 is the upper grid edge, so these minima do not establish
a bounded optimum. Predicted day-5 peaks at the shared point have ratios 1.03,
1.36 and 1.06, respectively.

Halving the shared-point integration step from 0.25 to 0.125 h changes troughs
by less than 0.000004 mg/L and recovery by less than 0.00023 percentage points.
Mass-balance residuals remain below 1e-9 mg throughout the grid.

## Interpretation

Faster systemic elimination can correct excessive troughs while reducing the
amount available for peritoneal recovery. Increasing membrane transport partly
compensates, with different trade-offs across patients. The grid supports
patient heterogeneity or uncertainty in the inherited inputs and coefficients.
It cannot identify a unique mechanism or justify adopting the shared multipliers
as model defaults.

The complete 147-row grid is in boelaert-joint-grid.csv. The JSON records the
baseline, shared and individual grid minima, numerical sensitivity and provenance.
