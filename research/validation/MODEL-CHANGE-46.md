# Model change for #46: non-kidney CMMG clearance 0.25 → 0.5 L/h

**What changed.** `CMMG_NONRENAL_CL` in `public/assets/pk-engine.js` (and the matching term in `interop/ayflux_reference.cpp`) goes from 0.25 to 0.5 L/h at 70 kg, still scaled by (weight/70)^0.75. Nothing else changes. Plasma and CSF acyclovir are unaffected, because CMMG does not feed back to acyclovir. With no kidney function, the nominal CMMG half-life at 70 kg falls from 77.6 h to 38.8 h.

**Why.** Helldén 2007 case 1 ([45]; `HELLDEN-COTARD.md`): measured CMMG fell between dialysis sessions with an apparent half-life of about 35 h, and 0.25 L/h left day-6 CMMG 2.6–3 times too high. **Calibration source:** that one case. **Independent check:** Hara 2008, whose CMMG peak moves from +15% to −5% of the measured value. No other benchmark was used to choose the value.

**How this was checked.** Every script in `research/validation/` plus `research/ayflux-paper/run_study.cjs` was run on `main` at 4c7f8e6 (before) and on this branch (after). Fifteen scripts exit 0 both times. All 144 unit tests pass.

## Scripts with unchanged output

`bataille-csf`, `boelaert-capd`, `collignon-crrt`, `laskin-clearance`, `stathoulopoulou-capd`, `vasquez-hd`, and the `run_study` console output. `compare-odex` differs only in run times and floating-point noise (≤ 2 × 10⁻¹³ mg/L), because it compares acyclovir only.

## Scripts with changed output (all CMMG)

| Benchmark | Endpoint | Observed | Before | After |
|---|---|---:|---:|---:|
| Hara 2008 (`hara-hd`) | CMMG peak, mg/L (ratio) | 7.47 | 8.57 (1.15) | **7.06 (0.95)** |
| | CMMG decline over HD | 77.6% | 58.8% | 59.8% |
| | CMMG peak at CrCl 0 / 2.94 (sensitivity) | — | 10.32 / 6.29 | 8.16 / 5.47 |
| Helldén 2007 (`hellden-cotard`), default dialyzer | RMS log error, 6 points | — | 1.32 | **0.97** |
| | same, Hara-matched dialyzer (159 mL/min) | — | 0.67 | **0.38** |
| | Day-6 CMMG before dialysis, µmol/L (dialyzer 159) | 8.9 | 25.4 | 15.3 |
| Kacířová 2022 (`kacirova-paired`) | CMMG trough, mg/L | 0.27 | 0.11 | 0.11 |
| | CMMG 25 min post-infusion, mg/L | 0.64 | 0.71 | 0.70 |
| Evidence scorecard | Plasma CMMG (2 points): GMR / AAFE | — | 0.674 / 1.627 | 0.661 / 1.647 |
| | All 37 points: GMR / AAFE / within twofold | — | 0.964 / 1.452 / 30 | 0.963 / 1.453 / 30 |
| CMMG evidence (`cmmg-evidence`) | CMMG HD decline, dialyzer matched: Hara / Helldén V | 77.6% / 73% | 81.8% / 64.5% | 82.2% / 65.4% |
| Paper ablation (`run_study`) | Full-model CMMG peak, HD case, mg/L | — | 3.82 | 3.03 |

`ablation-study` and `compare-benchmarks` change only in their CMMG columns, by the Kacířová amounts above. `research/ayflux-paper/results/ablations.csv` and `curves.csv` change only in CMMG columns. The interop fixtures were regenerated (CMMG column only; acyclovir and time columns unchanged).

## Where it moves away from data

[Kably 2025](https://doi.org/10.1093/jac/dkaf070) reports a simulated median CMMG/acyclovir AUC ratio of 129.9% for indexed CKD-EPI eGFR below 30 mL/min/1.73 m² (Table 5). One of the 50 enrolled patients had eGFR below 30. With the model change, AyFlux’s ratio fell from 52% to 49% at absolute CrCl 25 mL/min and from 83% to 74% at CrCl 15 mL/min. The comparison spans different kidney-function measures, and Kably’s population received oral valacyclovir soon after liver transplantation. The two Kacířová CMMG points move by ≤ 0.006 mg/L.

## Effect on users

- **Guided "no kidney function" scenario** (700 mg IV every 8 h, CrCl 0, no dialysis): the CMMG peak by 96 h falls from 158.5 to 118.2 mg/L. It remains an extrapolation far above any studied dose, and the note says so.
- At normal kidney function, CMMG barely changes. Kidney clearance dominates there (12 L/h at CrCl 100).
- The configuration schema is unchanged, and saved files load the same. Results for CMMG at low CrCl differ from v0.27.0.

## Limits

Calibrated on one patient with unreported weight, session times and dialyzer. The renal CMMG coefficient question (Helldén thesis Paper V vs Kably; `CMMG-EVIDENCE.md` §2) is untouched.
