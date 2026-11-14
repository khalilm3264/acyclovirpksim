# AyFlux 0.26.0: canonical CAPD engine research results

**Status:** Reproducible implementation checks and source-anchored exploratory comparisons, **not clinical validation**. Published plasma troughs are author-fitted values, not independent individual measurements. The published dialysate percentage represents daily recovered dose; AyFlux percent below is cumulative drained mass across five days divided by five administered doses.

## Study and method

- Boelaert et al. (1987), *J Antimicrob Chemother* 20:69-76. https://doi.org/10.1093/jac/20.1.69
- Subjects 1, 4, 5 were prespecified with no reported urinary recovery; manual CrCl=0 is an **assumption**, not a measured CrCl.
- Patient-specific weights/doses (kg; mg): 1 (46.5;110), 4 (59;142), 5 (48;122).
- Five IV one-hour infusions at 0, 24, 48, 72 and 96 h; 120-h horizon.
- Exchange-specific CAPD per day: 2 L, 1.36% dextrose, dwell lengths **4/4/4/12 hours**.
- Engine: `public/assets/pk-engine.js`, deterministic, no fitting, one draw, event-aware RK4 at 0.25 h with 0.125 h convergence repeat.
- Reproduce: `node research/validation/boelaert-capd.cjs`; `node --test tests/capd-publication.test.cjs`.
- Canonical source-derived numerical output: [v0.26.0 JSON](boelaert-v026-reference-results.json). CI: [CAPD workflow](../../.github/workflows/capd-research.yml).

## Numerical summary

| Subject | Published mean daily dialysate recovery (% dose) | AyFlux five-day drained mass (% cumulative dose) | Published fitted day-five trough (mg/L) | AyFlux day-five trough (mg/L) |
|---|---:|---:|---:|---:|
| 1 | 10.6 | 12.90 | 1.42 | 1.74 |
| 4 | 13.6 | 10.85 | 0.68 | 2.00 |
| 5 | 12.3 | 12.61 | 0.65 | 1.91 |

The correspondence in dialysate recovery is only descriptive. Plasma trough predictions are markedly higher than author-fitted values for subjects 4 and 5.

### Five-day AUC and ablations

| Subject | With source-matched PD (mg h/L) | No PD (mg h/L) | Four equal six-hour dwells (mg h/L) |
|---|---:|---:|---:|
| 1 | 332.05 | 377.66 | 332.56 |
| 4 | 361.74 | 402.36 | 362.05 |
| 5 | 360.13 | 408.29 | 360.65 |

AUC is **integrated over all 120 hours**. The timing ablation changes dosing-relative exchange boundaries; similarity in five-day AUC does not imply identical detailed concentration or dialysate profiles. Transport multiplier variations (0.7/1.3) changed the five-day model AUC but did not establish transport parameter accuracy.

Every dedicated CAPD mass-accounting test passed, including comparison against disabled PD, nonnegative state amounts, and 0.125-h time-step convergence. The maximum mass-accounting residual is rounded to zero at 4 decimal places in the archived summary; it is not a guarantee of exact analytical conservation.

## Research limitations

1. No serial raw subject-level plasma concentrations were independently extracted from the paper.
2. Individual effluent volumes, actual residual renal function, and membrane properties were not available for matching.
3. The PD mass-transfer parameters were not estimated from held-out measurements; the model could achieve similar dialysate recovery for incorrect mechanistic reasons.
4. Source and simulated dialysate-recovery percentages use related but differently aggregated periods.
5. External predictive validity, CNS CMMG distribution, and matched alternative-model comparisons remain unverified.
6. **No change** to default clinical model equations, parameters, safety thresholds, or schema 2 was made for this release.

## External CAPD follow-up

Shah reported daily dialysate recovery in one patient treated with IV acyclovir. At an assumed absolute CrCl of 1.7 mL/min, modeled recovery ranged from 6.76–6.80% of the day's dose on day 1, 10.27–10.42% on day 4 and 10.04–10.19% on day 7 across all 54 possible orders of the reported bags. The corresponding observations were 5.7%, 10.8% and 11.0%. Mean modeled peritoneal clearance was 3.19–3.23 mL/min against the published 4.4 mL/min. The analysis uses nominal 6/6/12-hour dwells and modeled ultrafiltration. The order of the bags has little effect within these assumptions. [Source](https://doi.org/10.1016/S0272-6386(86)80193-7) · [Reproduction script](shah-mixed-exchanges.cjs)

Burgess and Gill reported a mean IV half-life of 13.2 hours during CAPD in four participants. Model half-life estimates across three terminal sampling windows were 17.31–18.40 hours at assumed CrCl 0 mL/min and 11.86–12.40 hours at 5 mL/min. The reconstruction uses four 1.5-L exchanges and approximate weights derived from rounded published endpoints. Individual residual clearance and the original terminal fit windows remain unknown. [Source](https://doi.org/10.1002/j.1552-4604.1990.tb03585.x) · [Reproduction script](burgess-iv-terminal.cjs)

Run both scripts from the repository root with Node. Both use the frozen engine. Comparing a new model calibration would require prespecified endpoints and independent measurements of concentration, effluent volume and recovered drug mass.

### Davenport 1992 washout during rapid-cycle PD

Case 1 had blood acyclovir of 17 µmol/L approximately 42 hours after the last dose and 10 µmol/L another 96 hours later, with 1.5-L PD cycles every two hours. The two measurements give an interval half-life of 125 hours. At the first measurement, CSF was 8.1 µmol/L. The patient had received both oral and IV acyclovir before treatment stopped. The source does not report dialysate recovery. [Primary paper, pp. 647–649](https://doi.org/10.1016/S0272-6386(12)70234-2)

The conditional comparison scales the model's terminal curve to the first measurement. A one-hour IV input initializes the linear model, and the reported blood concentration is compared with modeled plasma assuming their ratio stays constant. The analysis assumes uninterrupted two-hour dwells with 1.5% dextrose, nominal membrane transport, modeled ultrafiltration, and stable renal function. At assumed weights of 50–90 kg and CrCl zero, modeled concentrations after another 96 hours are 0.25–0.55 µmol/L during PD, or 0.49–0.80 with dialysis disabled. The discrepancy persists without PD and therefore cannot identify peritoneal clearance from these blood samples. Sample clocks, matrix comparability, prior distribution, residual renal function and actual exchanges limit the comparison. [Reproduction script](davenport-dialysis-washout.cjs)

Case 2 had three successive daily HD concentration pairs of 13→5, 8→3 and 5→2 µmol/L. These are falls of 61.5%, 62.5% and 60.0%. The next predialysis values exceeded the preceding postdialysis values by 60.0% and 66.7%. The paper gives neither exact postdisconnect sampling times nor effluent mass. The rises describe the intervals between sessions and cannot measure early rebound kinetics. The first blood value was paired with CSF of 6 µmol/L.
