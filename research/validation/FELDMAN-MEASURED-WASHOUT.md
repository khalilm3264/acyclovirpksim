# Feldman 1988: measured washout slope and the reported fitted half-life

## Source and estimands

Feldman S, Rodman J, Gregory B. *Excessive serum concentrations of acyclovir and neurotoxicity*. J Infect Dis. 1988;157(2):385–388. [DOI 10.1093/infdis/157.2.385](https://doi.org/10.1093/infdis/157.2.385), [PMID 3335815](https://pubmed.ncbi.nlm.nih.gov/3335815/). Printed p.386, Figure 1 and adjacent case-report paragraphs; supplied PDF SHA-256 `b3617edf3c19e6beb0e9106360e7d708e24127bb0fe6fd387bb846aab84ea062`.

The original [secondary-queue audit](SECONDARY-QUEUE-REBOUND.md#case-42--feldman-five-measured-washout-points-reconstructed-prior-curve) distinguishes the five measured **serum** triangles from the reconstructed upper curve and predicted lower curve. This numerical follow-up uses only the triangle labels and horizontal marker positions. It adds no patient or independently validated model endpoint.

The paper reports an **elimination half-life of 9.3 h** after fitting a two-compartment model accommodating variable doses and intervals to the measured concentrations using **weighted nonlinear least-squares regression** (p.386). This is a model-derived parameter. The descriptive unweighted regression of log concentration on time below is a different calculation; it does not reproduce the original two-compartment fit. Exact sample clocks, variable dose/interval history, regression weights and full fitted parameterization are not tabulated sufficiently to rerun that fit.

## Time origin and digitization

Treatment stopped after six IV doses, nominally 500 mg/m² (16.8 mg/kg) every eight hours. Five serum concentrations were measured during the next 31 h. Prose specifies 190 µM at 5.6 h after the last dose and 25 µM at 31 h; Figure 1 labels the first triangle **189**, followed by 131, 94, 43 and 25 µM. Retain the prose/figure rounding difference.

The horizontal axis covers the earlier six-dose course as well as the washout; it is **not** hours since the last dose. Render PDF page 2 (printed p.386) at 2600 pixels high using the command recorded in [the reproduction script](feldman-measured-washout.cjs). The resulting raster is 1996 × 2600 pixels. An affine calibration uses x-axis ticks 10/20/30/40/50 h at x = 1201.5/1278.5/1356.5/1434.5/1511.5 pixels. Triangle centers were independently read at x = 1479/1508/1540/1626/1675 pixels. Concentrations are taken from printed labels, not estimated from y coordinates or the smooth curve.

| Measured serum ACV, µM | Triangle x, pixels | Approximate graph-course time, h | Approximate time after last dose, h |
| ---: | ---: | ---: | ---: |
| 189 | 1479 | 45.79 | 5.60 |
| 131 | 1508 | 49.52 | 9.34 |
| 94 | 1540 | 53.65 | 13.46 |
| 43 | 1626 | 64.73 | 24.54 |
| 25 | 1675 | 71.04 | 30.86 |

The last column translates the graph coordinates so that the first draw is at the narrative 5.6 h. Its final draw is 30.86 h, within 0.15 h of the narrative 31 h. These are approximate graphical times, **not newly recovered exact sampling clocks**. A shift of time origin does not alter the log-linear slope. Do not force the graph's last-dose time to an exact multiple of eight hours: the authors explicitly accommodated variable intervals.

## Reproduction and reading sensitivity

Run `node research/validation/feldman-measured-washout.cjs`. The source-comparison CI runner also executes it and retains its report as an artifact.

For five points, ordinary least squares gives ln(C) = 5.63267 − 0.0778416 × t with t in the translated hours above and C in µM. The descriptive apparent half-life is ln(2)/0.0778416 = **8.905 h**. The intercept is an extrapolation, not a measured concentration at the last dose.

| Calculation | Apparent half-life, h | Interpretation |
| --- | ---: | --- |
| Five triangles, tick-calibrated times | 8.905 | Unweighted log-linear description of these observations |
| Five triangles, horizontal positions rescaled to both narrative endpoints 5.6/31 h | 8.955 | Alternative time calibration |
| Narrative endpoints 190 → 25 µM over 25.4 h | 8.681 | Two-point log-ratio sensitivity |
| Figure endpoint label 189 → 25 µM over 25.4 h | 8.703 | Effect of first-label rounding |
| Authors' weighted nonlinear two-compartment fit | 9.3 | Different model and fitting criterion |

For transparent reading sensitivity, the script perturbs each marker center by ±3 pixels (about ±0.39 h before calibration uncertainty) and each selected tick center by ±1 pixel, enumerating their corner combinations. The resulting five-point half-life envelope is **8.500–9.318 h**. Adding independent ±0.5 µM perturbations to the integer concentration labels gives **8.392–9.439 h** across those corner scenarios. Label perturbation is a rounding sensitivity assumption; it is not assay error supplied by the paper. These are scenario envelopes, not confidence intervals, exhaustive continuous bounds, or a claim that every digitization error is captured.

The central descriptive estimate is 4.25% below 9.3 h, while the reported fit lies within the chosen graphical-reading sensitivity. This shows approximate consistency in washout timescale; it neither establishes equivalence between the estimands nor diagnoses an error in the original fit.

## Limits

Only five measured samples contribute. The 290/470 µM early peaks, 160 µM pre-last-dose trough and smooth prior-course trajectory are reconstructed/model-derived values and are excluded. No HD was reported in this course. The washout slope is not an isolated renal or dialyzer clearance and does not establish a rebound fraction. No AyFlux engine is fitted, tuned or validated against these points, and no pooled predictive accuracy metric is changed. The already archived original is retained without a duplicate PDF or bibliography change.

