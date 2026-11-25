# Oral absorption replays in kidney failure: Hara 2008 and Smith 2010

Fixed replays of three oral absorption models against digitized group-mean **plasma acyclovir** curves. Nothing here is fitted, and no live default changes. The page is `/experimental/renal-oral/`, a follow-up to the adult comparison at `/experimental/oral-absorption/`.

| Model | Absorption | Source of the value |
|---|---|---|
| One stage (current AyFlux) | First-order, 1.8 h⁻¹ | Frozen default |
| Fixed lag | Same, delayed 0.590 h | Frozen on adult data |
| Two stages | Two transit stages at 1.636 h⁻¹ replacing the depot | Frozen on adult data |

All three share 54.5% bioavailability and the disposition from `pk-engine-8fc1c9d.js`. That file is an unmodified copy of `public/assets/pk-engine.js` at commit 8fc1c9d97590c81d3fbcf65ecb1f0ead273ab4a0, and every script checks its SHA-256 before use.

```sh
node research/validation/renal-oral/hara/score.cjs    # reproduces hara/scores.json
node research/validation/renal-oral/smith/score.cjs   # reproduces smith/scores.json
node research/validation/renal-oral/build-page-data.cjs [--check]
node --test tests/renal-oral.test.cjs
```

`build-page-data.cjs` copies the stored metrics unchanged. It adds dense model curves for drawing and asserts they pass through the scored values at every sampling time.

Units: mg/L, hours and mg·h/L. AUC is linear-up/log-down over the same sampling grid for measured and modelled curves. A plotted group-mean peak is not compared with a paper's mean of individual peaks.

## Hara 2008, Figure 1 (printed p. 308)

[doi:10.2133/dmpk.23.306](https://doi.org/10.2133/dmpk.23.306). The native 988×809 image (PDF XObject 11) is vertically flipped before reading. Concentration = (647.5 − y) / 36.75 mg/L. The axis ticks at 59.5–647.5 px were independently re-located and agree to within 0.5 px.

- Three ALDH2 groups of six, one 1,000 mg dose. Each group uses its Table 1 mean weight and urine-derived CrCl.
- Scored points are 1, 2, 3, 4, 6, 8 and 12 h. The 0 h value is assumed zero because the baseline markers overlap. It is used for AUC only, not RMSE.
- The 24–48 h markers overlap between groups and are not scored. The 48–52 h hemodialysis session is out of scope.
- Cross-check: the digitized \*1/\*1 AUC₀₋₁₂ is 71.73 mg·h/L, against 71.55 in Table 2.

## Smith 2010, Figure 1A, CKD panel (printed p. 1148)

[doi:10.1128/AAC.00729-09](https://doi.org/10.1128/AAC.00729-09). Native 3500×2406 image (PDF XObject 12). Filled-circle centres are read on the log axis as y = 675.1 − 229.2·log₁₀(µM), then multiplied by 0.22521 for mg/L. The decade ticks were independently re-located at 217, 445.5, 675.5 and 904.5 px.

- Three participants after the fifth 1,500 mg dose every 12 h, with all five doses simulated. The curve averages simulated people with the reported Cockcroft–Gault CrCl of 17, 30 and 31 mL/min.
- Weight was not reported. 70 kg is an assumption, with 55 and 85 kg as sensitivity cases.
- The predose point is measured and included in both RMSE and AUC.
- Cross-check: the digitized AUC is 128.86 mg·h/L, against Table 1's 577 µM·h = 129.9 mg·h/L.
- Smith 2010 already informed the CSF CMMG coefficient. This plasma acyclovir check is from the same study and is not independent of it.

## Findings

Matched-window exposure is too high in every Hara group, at 1.05–1.29 times observed. It is too low in Smith: 0.65–0.66 times observed at 70 kg, and 0.56–0.79 across 55–85 kg. The three absorption models differ by at most 2.5% in matched-window AUC, so absorption shape does not explain either gap.

The two-stage model has the lowest RMSE in all three Hara groups and at 70 kg in Smith. In Smith, though, the raw RMSE ranking depends on weight and on the 0.5 h point, so no model is claimed best under every scoring rule. In Smith, two stages put the peak at 1.5 h (observed 2 h) and lower it further below the observed value.

Digitization overlays used to verify marker placement are kept with the source PDFs, not in this public repository. Digitized group means cover no individual patient. Do not use these comparisons for dosing.
