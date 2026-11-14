# Khajehdehi 2000 Figure 1: descriptive slope audit

Audit date: November 14, 2026. Source: Khajehdehi P, Jamal JA, Bastani B. *Clin Nephrol* 2000;54(4):351–355, Figure 1 and accompanying text, p. 353 ([PMID 11076113](https://pubmed.ncbi.nlm.nih.gov/11076113/)). Primary scan: `papers/acyclovir-pk/khajehdehi2000.pdf` in the research source collection (not distributed in this repository).

The paper reports **22.5 and 25.5 hours on two occasions off renal replacement**, and **19.5 hours during CA-210 CVVHDF**. The figure and accompanying text do not identify the observations or regression method used to calculate those values. This audit does **not** independently recover them. Matching a selectively chosen slope to a published number would not establish the authors' calculation.

## Reproducible read-off method

Render page 3 to a 1575 × 2100 pixel PNG, for example with Poppler:

```sh
pdftoppm -f 3 -singlefile -scale-to-x 1575 -scale-to-y 2100 -png papers/acyclovir-pk/khajehdehi2000.pdf /tmp/khpage-3
node research/validation/khajehdehi-fig1-halflives.cjs
```

Coordinates refer to the full page, upper-left origin. Circular marker centers were read manually at integer pixels. The script contains all 19 centers in left-to-right order and prints their converted values. They are approximate scan readings, not underlying patient data; calculated tenths of an hour do not establish that timing accuracy.

| Calibration anchor | x (px) | y (px) |
| --- | ---: | ---: |
| Left time zero / log concentration 0.4 | 267 | 667 |
| Left time 28 | 531 | — |
| Right time 76 | 651 | — |
| Right time 148 | 1333 | — |
| Right baseline | 1340 | 650 |
| Left log concentration 1.6 | 267 | approximately 234 |

Each panel is calibrated separately: `t=(x−267)×28/264` on the left and `t=76+(x−651)×72/682` on the right. The right **76-hour tick**, rather than the unlabeled left edge of that panel, supplies the time anchor. The slashed axis interrupts the display between the labeled 28 and 76 ticks, but there are unlabeled ticks and a marker to the left of 76 on the right panel. A blanket claim that all observations between 28 and 76 are absent is therefore incorrect. No interpolation through the break is used.

With `baseline(x)=667−17(x−267)/1073`, use `log10 C=0.4+(baseline(x)−y)/360.8` and `C=10^(log10 C)` mg/L (numerically µg/mL). Fit ordinary least squares to `ln C` against time. The apparent half-life is `−ln(2)/slope` for a negative slope. Y-intercept uncertainty affects concentrations; y-scale and tilt uncertainty can affect slopes.

## Intervention boundaries and selected windows

Dose arrows lie at approximately x=266, 371, 663, 882, 1103, and 1324. The F8 box ends around x=403; HD occupies approximately x=625–669; CA210 begins around x=1080. These establish graphic ordering, not exact infusion start/end times or treatment duration. ID 2 (x=400) overlaps the F8 endpoint region and is included only as an ambiguous endpoint sensitivity. The six-hour F8 circuit clotting duration comes from the paper text, not from the box width.

ID 6 lies in the HD graphic. ID 11 is after the fourth dose arrow, ID 12 after the fifth, and ID 19 after the sixth. All remain in the coordinate inventory, but are excluded from decline fits. They must not be assumed to be pre-dose observations based on this scan. The late rise and fall are not assigned physiological causes.

| Descriptive window | IDs | Approx. span (h) | Slope ln(C)/h | Apparent half-life (h) | R² |
| --- | --- | --- | ---: | ---: | ---: |
| After F8 endpoint region | 3,4,5 | 17.1–25.9 | −0.0786 | 8.8 | 0.974 |
| Include ambiguous first high marker | 2,3,4,5 | 14.1–25.9 | −0.0800 | 8.7 | 0.987 |
| After HD/third arrow, before fourth arrow | 7,8,9,10 | 81.8–95.6 | −0.0636 | 10.9 | 0.940 |
| Same interval, omit first marker | 8,9,10 | 85.7–95.6 | −0.0746 | 9.3 | 0.934 |
| CA210, after fifth and before sixth arrows | 13,14,15,16,17,18 | 127.7–143.1 | −0.0742 | 9.3 | 0.895 |
| Same CA210 interval, omit first marker | 14,15,16,17,18 | 128.9–143.1 | −0.0690 | 10.0 | 0.870 |

These choices describe visible trends within treatment/dose boundaries. Neither R² nor apparent half-life validates a pharmacokinetic model or establishes an elimination phase. The figure does not identify whether the steep slopes arise from distribution, elimination, infusion kinetics, or other mechanisms. Original observations, sampling and infusion timing, and the authors' point selection would be required to resolve the discrepancy with their reported values.

## Sensitivity and limits

The script deterministically enumerates every combination of ±2-pixel x/y shifts at selected centers (at most 4^6 combinations). Resulting **coordinate sensitivity envelopes**, rounded to tenths of an hour, are 8.1–9.6, 8.0–9.4, 10.2–11.7, 8.5–10.1, 8.8–9.9, and 9.4–10.7 hours in table row order. These are **not statistical confidence intervals or clinical uncertainty intervals**. They exclude patient variability, unknown timing, choice of fit window, and many calibration errors.

A separate deterministic ±2% perturbation of panel x scale and log-concentration y scale yields 8.5–9.2, 8.3–9.0, 10.5–11.3, 8.9–9.7, 9.0–9.7, and 9.6–10.5 hours. This is an illustrative calibration sensitivity, not an estimated probability distribution; tilt remains fixed. Endpoint omission changes the middle and late slopes appreciably. Extra decimal places would conceal that larger point-selection uncertainty.

Earlier drafts bridged treatments and dose arrows, selected points to match published half-lives, and called random coordinate jitter a confidence interval. Those claims are withdrawn. Published half-lives remain source-reported quantities, separate from this descriptive scan audit and from spot-extrapolated effluent estimates in `KHAJEHDEHI-CRRT-AUDIT.md`. Engine parameters and defaults are unchanged.
