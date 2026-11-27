# Frozen-engine replays for Laskin, Shah and Abe

All three analyses use the engine from `8fc1c9d` (Git blob `cb07505a2b9e619ee3351bb0bf66d5610a611a6f`, SHA-256 `9c370f46ebb986e7192afe7b6822aa31ed6faff34f91856fa580acbbad4c139d`). The input files retain the digitized values and their provenance. None of these replays extends the 37-point scorecard.

## Laskin 1982 single-infusion study

[Laskin et al., AAC 21(3):393–398](https://doi.org/10.1128/aac.21.3.393), Figure 1, printed p. 395. Manual marker centers from a 240-dpi crop map to the printed log concentration scale. The separate printed one-hour values provide end-infusion anchors. The scored observations use the nominal Methods sampling grid and Figure 1 measured group means. The two plotted marks around 15 h are retained as a sensitivity analysis because that time is absent from the Methods grid.

Each arm uses one representative dose and the reported arm means for age and weight. Absolute creatinine clearance (CrCl) is approximated by multiplying indexed CrCl by mean body surface area divided by 1.73 m². The larger CrCl and younger age in the 15 mg/kg cohort limit comparisons of dose proportionality across arms. Agreement is assessed over matching windows with linear trapezoids and without extrapolation.

| Dose (mg/kg) | Hours from infusion start | Observed AUC (mg·h/L) | Predicted AUC (mg·h/L) | Predicted/observed |
| --- | --- | --- | --- | --- |
| 2.5 | 2–19 | 6.943 | 6.633 | 0.955 |
| 5 | 2–19 | 12.122 | 13.424 | 1.107 |
| 10 | 2–21 | 19.930 | 24.087 | 1.209 |
| 15 | 2–21 | 20.244 | 14.940 | 0.738 |

AyFlux overpredicts the separate end-infusion anchors in all four arms. Later errors vary in direction by time and arm. Halving the solver step changes each predicted concentration by less than 0.001 mg/L.

## Shah 1986 CAPD case

[Shah et al., AJKD 7(6):507–510](https://doi.org/10.1016/S0272-6386(86)80193-7), Figure 1 and p. 509. Shah informed the PD model assumptions. The replay compares 20 Figure 1 markers, including five with ambiguous timings kept outside the primary summary. The authors reported indexed CrCl of 2.0 mL/min/1.73 m². The original reconstruction varies assumed BSA (1.40, 1.55 and 1.70 m²) and the order of the reported dextrose strengths on three study days. Dosing times, exchanges and sample assignments follow the reconstruction. Non-study-day bag strength and per-exchange ultrafiltration are assumptions.

At nominal settings, predictions for all 15 primary samples exceed the observed concentrations and are within twofold (geometric mean ratio 1.40). Day 1, 4 and 7 dialysate recovery is 6.73%, 10.20% and 9.97% versus 5.7%, 10.8% and 11.0% reported. Mean simulated PD clearance is approximately 3.2 mL/min across the original 162 scenarios versus 4.4 reported.

A separate 108-run matrix crosses absolute CrCl (0, 1.79, 3 or 5 mL/min), PD membrane clearance coefficient (0.75×, 1×, 1.5×), central and peripheral volumes together (0.75×, 1×, 1.25×), and the two internal daily exchange boundaries (both shifted by −1, 0 or +1 h, with the 24 h day preserved). The table varies one input at a time from the nominal reconstruction and reports nominal sample-clock results.

| Input varied | Plasma geometric mean ratio | Mean PD clearance (mL/min) |
| --- | --- | --- |
| Nominal | 1.399 | 3.189 |
| Absolute CrCl 0–5 mL/min | 1.096–1.638 | 3.187–3.192 |
| PD coefficient 0.75×–1.5× | 1.381–1.415 | 2.782–3.684 |
| Volumes 0.75×–1.25× | 1.372–1.405 | 3.187–3.199 |
| Exchange boundaries ±1 h | 1.399–1.402 | 3.146–3.205 |

Within these ranges, CrCl changes overall plasma bias most and the PD coefficient changes estimated PD clearance most. Volume changes have a larger effect on some individual inferred troughs than on aggregate plasma bias. The CrCl alternatives probe sensitivity around a reported renal measurement. They provide no replacement patient value. Across the full matrix the plasma geometric mean ratio spans 1.061–1.693.

## Abe 2021 AKI and intermittent HD case

[Abe et al., Fundamental Toxicological Sciences 8:229–233](https://doi.org/10.2131/fts.8.229), Results and Figure 3C. The observed Day 1 serum acyclovir/CMMG pair initializes central and metabolite masses. Peripheral acyclovir is assumed at 0.5×, 1× or 1.5× the central concentration. Days 2 and 3 are compared to measured pairs. Day 7 values are censored at 0.1 mg/L. No dose is simulated after the anchor.

For each CrCl and HD clearance combination, 243 scenarios vary two successive draw intervals, session duration, weight and the initial peripheral/central concentration ratio. The three HD sessions start at the modeled pre-HD draws. HD clearance is evaluated at 60, 81.8, 120 and 159 mL/min. CrCl trajectories are hypothetical and use piecewise-linear interpolation between the model times for Days 1, 2, 3 and 7. They are separate from the serum creatinine sequence in the report.

No fixed-CrCl scenario met both criteria (all four Day 2/3 concentrations within twofold and both Day 7 predictions below 0.1 mg/L). In the delayed-recovery scenario (CrCl 0/0/0/20 mL/min), the joint criterion was met in 123, 102, 50 and 21 of 243 runs at increasing HD clearances, respectively. At 81.8 mL/min, one delayed-recovery run met the stricter 1.25-fold early criterion and the Day 7 criterion. Counts describe tested assumptions and cannot be interpreted as probabilities. See also the [dose-history reconstruction](ABE-SERIAL-PREHD.md), which uses a different starting assumption.

## Reproduction

Run from the repository root with the pinned revision available. The Laskin runner writes its CSV and JSON to the current directory.

```sh
repo=$(pwd)
replay_dir=$(mktemp -d)
git show 8fc1c9d:public/assets/pk-engine.js > "$replay_dir/pk-engine.js"
cd "$replay_dir"
node "$repo/research/validation/laskin-iv-figure1.cjs" "$replay_dir/pk-engine.js"
node "$repo/research/validation/shah-capd-replay.cjs" "$replay_dir/pk-engine.js" > shah.json
node "$repo/research/validation/abe-measurement-initialized.cjs" "$replay_dir/pk-engine.js" > abe.json
```
