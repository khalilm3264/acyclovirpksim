# Pre-Execution Protocol: Manders 2026 & Sadjadi 2018 External Evaluations

This protocol freezes all inclusion rules, reconstruction inputs, kidney-function surrogates, model variants, and reporting endpoints **before executing any simulation** on either study. Both studies were read from the local `ayflux-sources` full texts (`manders2026-continuous-infusion.pdf`, `sadjadi2018-pd-case.pdf`) prior to protocol preparation; neither has been executed in the runner before this commit. This evaluation changes no model equation, parameter, or default in `public/assets/pk-engine.js`, and leaves the 37-point scorecard unchanged.

## Pinned Model & Engine Constraints

- **Model commit:** `304ce5308ea78907d18b07d8670c164295829eb3` (`v0.27.0`)
- **Engine file:** `public/assets/pk-engine.js` (Git blob SHA `17971df66e0a97b4d382572a582d35c444a3c83f`), whose plasma and CSF acyclovir equations are identical to frozen manuscript commit `8fc1c9d` (blob `cb07505a2b9e619ee3351bb0bf66d5610a611a6f`; post-freeze commits `#47`/`#89` changed only CMMG CSF partition / damaged-barrier presets).
- **Engine validator bounds (`validate()`):** `horizon <= 336 h` (`14 days`) and `MAX_DOSE_MG['Acyclovir IV'] = 2000 mg` (`infusion <= 24 h`). Continuous `30 mg/kg/day` (and `20 mg/kg/day`) infusions are therefore entered as contiguous `12 h` infusion blocks (`15 × weight` mg over `12 h`, every `12 h`, yielding identical constant infusion rate $R_0 = 1.25 \times \text{weight}$ mg/h and `< 1400 mg` per block) so every configuration passes `engine.validate(...)` without modifying engine limits.

---

## Part A: Manders et al. 2026 Continuous IV Infusion Case Series

- **Source:** Manders IG, van Tuinen EL, Weisfelt M, et al. *Continuous Intravenous Acyclovir as Outpatient Parenteral Antimicrobial Therapy for HSV and VZV Neurological Infections: A Case Series With Pharmacokinetic and Cost Evaluation, and Review of Literature.* Rev. Med. Virol. 2026;36:e70206. DOI [10.1002/rmv.70206](https://doi.org/10.1002/rmv.70206).
- **Regimen description:** All patients initially received intermittent IV acyclovir `10 mg/kg` three times daily (`1 h` infusion q8h, `333.33...` or `10 × weight` mg/dose), then switched to continuous IV acyclovir `30 mg/kg/day` (unless reduced during AKI). Steady-state plasma acyclovir was measured during continuous infusion.
- **Prespecified primary plasma set (`n = 6`, Cases A, B, C, D, E, G):**
  - **Exclusions fixed before running:** `Case H` (`80 F, 72.5 kg`) has `NA` steady-state plasma acyclovir. `Case F` (`48 F, 91 kg`) plasma acyclovir (`43.4 mg/L`) is excluded from the primary plasma set because the authors explicitly report it as a sampling-contamination outlier drawn directly from the acyclovir-infused PICC lumen (CSF acyclovir `2.5 mg/L` remained in the expected range).

| Case | Sex | Age (y) | Weight (kg) | Intermittent `10 mg/kg` q8h | Continuous `30 mg/kg/day` (`12 h` blocks) | Total duration (simulated `h`) | eGFR before | eGFR during | eGFR after | Observed plasma $C_{\text{ss}}$ (mg/L) |
| --- | --- | ---: | ---: | --- | --- | --- | ---: | ---: | ---: | ---: |
| Case A | Female | 16 | 54.4 | `544 mg` × 6 d (`18` doses) | `816 mg / 12 h` × 8 d (`16` blocks) | 14 d (`336 h`) | `>90` (Schwartz) | `>90` (Schwartz) | `NA` | `2.9` |
| Case B | Female | 35 | 75.0 | `750 mg` × 4 d (`12` doses) | `1125 mg / 12 h` × 7 d (`14` blocks) | 11 d (`264 h`) | `>90` | `>90` | `NA` | `2.9` |
| Case C | Female | 77 | 60.0 | `600 mg` × 3 d (`9` doses) | `900 mg / 12 h` × 11 d (`22` blocks) | 14 d (`336 h`) | `78` | `79` | `82` | `5.1` |
| Case D | Male | 78 | 89.0 | `890 mg` × 2 d (`6` doses) | `1335 mg / 12 h` × 12 d (`24` blocks; 16 d actual) | 18 d (`336 h` max) | `79` | `81` | `82` | `6.4` |
| Case E | Female | 78 | 81.5 | `0 d` (`0` doses) | `1222.5 mg / 12 h` × 10 d (`20` blocks) | 10 d (`240 h`) | `58` | `80` | `73` | `8.1` |
| Case G | Female | 21 | 69.0 | `690 mg` × 6 d (`18` doses) | `1035 mg / 12 h` × 8 d (`16` blocks) | 14 d (`336 h`) | `>90` | `>90` | `NA` | `6.1` |

- **Case D horizon check:** `Case D` lasts `18 d` (`432 h`), exceeding `pk-engine.js`'s `336 h` horizon cap (`2 d` intermittent + `12 d` continuous = `288 h` of continuous infusion). The runner must verify that simulated $C_{\text{ss}}$ at `horizon = 336 h` agrees with analytical steady state $C_{\text{ss}} = R_0 / CL_{\text{total}}$ within `0.01%` (showing `288 h` is indistinguishable from `384 h` continuous infusion).
- **Prespecified kidney-function surrogates (`crclSource: 'manual'`, neither BSA nor serum creatinine is tabulated in Table 1):**
  1. `during-raw` **(primary):** `During acyclovir` numeric eGFR (`90, 90, 79, 81, 80, 90 mL/min`).
  2. `before-raw` **(sensitivity):** `Before start` numeric eGFR (`90, 90, 78, 79, 58, 90 mL/min`).
  3. `during-censored-105` **(sensitivity):** substituting `105 mL/min` for right-censored `>90` in Cases A, B, and G (`105, 105, 79, 81, 80, 105 mL/min`).
  4. `during-bsa-scaled` **(sensitivity):** scaling `During acyclovir` indexed eGFR (`90, 90, 79, 81, 80, 90 mL/min/1.73 m²`) by Mosteller $\text{BSA} / 1.73$, where $\text{BSA} = \sqrt{\text{height(cm)} \times \text{weight(kg)} / 3600}$ using sex-typical reference heights (`165 cm` female, `178 cm` male).
- **Prespecified secondary CSF check (`Case F`):**
  - `48` F, `91.0 kg`, observed CSF acyclovir $= 2.5\text{ mg/L}$ during transient prerenal AKI (`eGFR` `76` before start, `25` during acyclovir, `76` after; dose temporarily reduced from `30` to `20 mg/kg/day`).
  - Simulated at `336 h` steady state across the `2 × 2 × 2` bounding grid: `{30 mg/kg/day (1365 mg / 12 h), 20 mg/kg/day (910 mg / 12 h)} × {25 mL/min, 76 mL/min} × {intact csfRatio = 0.30, damaged csfRatio = 0.37}`.
- **Prespecified model variants:**
  1. `default`: unmodified nominal `drawParams` at actual body weight.
  2. `renal-x0.75`: multiplying only `params.renal` by `0.75` (`0.1515 × CrCl × (W/70)^0.75` in L/h), matching Turner 2016 and Table 6 post hoc ablation.
  3. `no-allometric`: removing the `(W/70)^0.75` allometric exponent on `q`, `other`, `renal`, `form`, `mr`, and `mn` (multiplying each by `(70/W)^0.75`, matching `research/validation/ablation-study.cjs`, while keeping volumes `vc`, `vp`, `vm` linear in `W`).
- **Prespecified endpoints, solver check, and reporting rules:**
  - Endpoint: simulated plasma concentration at end of simulation (`t = horizon`, `step = 0.025 h`), verified against a `step = 0.0125 h` repeat (`< 0.1%` difference) and against analytical steady state $R_0 / (CL_{\text{renal}} + CL_{\text{other}} + CL_{\text{form}})$ (`< 0.1%` difference).
  - For all combinations of the `4` kidney surrogates × `3` model variants, report per-case predicted concentration and predicted/observed ratio, geometric mean ratio (GMR = $\exp(\text{mean}(\ln(\text{pred}/\text{obs})))$), geometric mean absolute fold error (AAFE = $\exp(\text{mean}(|\ln(\text{pred}/\text{obs})|))$), count within inclusive `0.80–1.25`, and count within twofold (`0.50–2.00`). Keep all three variants side by side without post hoc parameter tuning.

---

## Part B: Sadjadi et al. 2018 PD/HD Neurotoxicity Case Audit

- **Source:** Sadjadi S-A, Regmi S, Chau T. *Acyclovir Neurotoxicity in a Peritoneal Dialysis Patient: Report of a Case and Review of the Pharmacokinetics of Acyclovir.* Am. J. Case Rep. 2018;19:1459–1462. DOI [10.12659/AJCR.911520](https://doi.org/10.12659/AJCR.911520).
- **Reconstructability audit (prespecified classification: diagnostic boundary exploration, NOT a point-level validation benchmark):**
  - Reported age differs between Abstract (`83 M`) and Case Report text (`80 M`); body weight and height are **unreported**.
  - Maintenance cyclic PD prescription (`APD` since 2012) has **unreported fill volume, number of cycles, dwell duration, and dextrose concentration**.
  - Inpatient IV acyclovir (`5 mg/kg/day` × 2 d) does not state dosing frequency or infusion duration, followed by oral acyclovir tablets (`200 mg BID` × 1 d), an oral route outside AyFlux's supported routes (`Acyclovir IV` and `Valacyclovir oral`).
  - After neurotoxicity admission, PD was switched to two consecutive daily `4 h` high-flux polysulfone HD sessions (`Qb = 350 mL/min`, `Qd = 600 mL/min`), after which *"IV acyclovir was resumed and serum levels of acyclovir were checked. They were found to be elevated at 2.1 and 6.3 mcg/mL"* — without reporting the resumed daily dose (`2.5` vs `5 mg/kg/day`), dosing frequency, dialyzer urea/acyclovir KoA, or timing of either blood draw relative to infusion or HD.
- **Prespecified bounded sensitivity grid (resumed IV acyclovir in anuria):**
  - `crcl = 0 mL/min` (`crclSource = 'manual'`), `step = 0.025 h`, `horizon = 120 h` (`5` once-daily 1 h IV doses at `t = 0, 24, 48, 72, 96 h`).
  - Grid axes: weights `{50, 70, 90} kg` × doses `{2.5, 5.0} mg/kg/day` × schedules `{No dialysis, Daily 4 h HD (hdStart=12, hdRepeat=24, hdDuration=4, default hdCl=81.8 mL/min), Alternate-day 4 h HD (hdStart=12, hdRepeat=48, hdDuration=4, default hdCl=81.8 mL/min)}` × variants `{default, no-allometric (multiplying q, other, renal, form, mr, mn by (70/W)^0.75 per ablation-study.cjs while keeping volumes vc, vp, vm and weight-based mg/kg doses proportional to W)}`.
  - Report final-day pre-dose trough (`120 h`) and post-infusion peak (`97 h`), verifying step convergence against `0.0125 h`, alongside whether the bounded `[trough, peak]` brackets span the reported `2.1` and `6.3 mg/L` measurements.
