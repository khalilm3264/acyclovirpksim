# CMMG evidence check (#46)

**Written before the #46 model change** (non-kidney CMMG clearance 0.25 → 0.5 L/h; see `MODEL-CHANGE-46.md`). Sections 1–2 are recomputed with the current engine; the conclusions are unchanged. This note records what the available data can and cannot say about CMMG formation, kidney clearance, dialysis removal and accumulation with no kidney function. Reproduce with `node research/validation/cmmg-evidence.cjs`. The results are in `cmmg-evidence-results.json`.

## Sources

- **Hara 2008** ([doi 10.2133/dmpk.23.306](https://doi.org/10.2133/dmpk.23.306)): 18 HD patients (CrCl 0.93 mL/min), one 1,000 mg valacyclovir dose, HD at 48–52 h. Over the session, plasma acyclovir fell 69.4% and serum CMMG 77.6%. This is already the `hara-hd.cjs` benchmark.
- **Helldén 2008 thesis** (Karolinska Institutet; [open copy](https://core.ac.uk/download/70338802.pdf)):
  - Paper V (preliminary, single dose; 6 healthy, 6 CKD and 4 HD patients): one HD session lowered serum acyclovir by 56% and CMMG by 73%. The dose was 50 mg IV; session timing and dialyzer are not given. The linear fit of CMMG kidney clearance against measured CrCl has slope 3.7474 (R² 0.854); the acyclovir fit has slope 1.5392.
  - Paper I: 7 of 49 patients with neuropsychiatric symptoms had serum CMMG above 40 µmol/L, at most 158 µmol/L (about 38 mg/L).
  - The thesis reports **no** CMMG non-kidney clearance and no CMMG half-life between or during dialysis.

## 1. Dialysis removal of CMMG: no change supported

#46 compared Hara's 77.6% CMMG decline with AyFlux's 58.8% (59.8% after the change) and asked whether CMMG dialysis removal is too low. AyFlux also underpredicts Hara's **acyclovir** decline (51.9% vs 69.4%), so most of the gap is the dialyzer clearance assumption. The default 81.8 mL/min comes from Laskin 1982.

| Reconstruction | HD clearance (mL/min) | Acyclovir decline, predicted / observed | CMMG decline, predicted / observed |
|---|---:|---|---|
| Hara, default dialyzer | 81.8 | 51.9% / 69.4% | 59.8% / 77.6% |
| Hara, dialyzer matched to acyclovir | 159 | 69.3% / 69.4% | **82.2% / 77.6%** |
| Helldén Paper V, dialyzer matched to acyclovir* | 96 | 56.0% / 56% | **65.4% / 73%** |

\* Approximation: this uses the Hara reconstruction with the dialyzer tuned to Paper V's acyclovir decline, because Paper V's session timing is not reported.

Once the dialyzer matches each study's acyclovir data, the unchanged CMMG dialysis term (`metDial` 1) overpredicts Hara by 5 points and underpredicts Helldén by 8. The two independent sources bracket the current value, so raising `metDial` (1.5 would match Hara at the old dialyzer) would fix the wrong parameter. The Hara reconstruction's dialyzer clearance is an assumption; individual hdCl is not reported.

## 2. Kidney clearance of CMMG: sources conflict

AyFlux uses CMMG kidney clearance ≈ 2.0 × CrCl and acyclovir ≈ 3.37 × CrCl (mL/min). Helldén's Paper V fits 3.75 × CrCl and 1.54 × CrCl. Raising the CMMG coefficient would lower the CMMG/acyclovir exposure ratio. Kably 2025 suggests AyFlux's ratio is already about half the observed one at both eGFR > 90 and < 30. Paper V is small, preliminary and uses a 50 mg dose, and Kably's population is liver-transplant recipients on oral valacyclovir. Neither is strong enough to override the other, so no change.

## 3. CrCl 0 accumulation: not identifiable from the data in hand at the time

With no kidney function, CMMG leaves only through the non-kidney term (0.25 L/h before the change, volume 0.4 L/kg): a nominal half-life of 77.6 h at 70 kg, 38.8 h at the current 0.5 L/h. Single-dose data fit: the Hara CMMG peak is predicted at 8.57 vs 7.47 mg/L observed. Without repeated-dose data with known dosing and no dialysis in between, the half-life cannot be tested. The guided "no kidney function" scenario (700 mg IV every 8 h, about 162 mg/L CMMG by 96 h) uses a regimen many times the labeled anuric dose, far outside any observed data. Its interface note now says the CMMG height is an untested extrapolation and gives the highest measured symptomatic level (about 38 mg/L).

**Resolved by the next source (2026-11-13):** Helldén's case 1 ([45]) is reconstructed in `HELLDEN-COTARD.md`. With almost no kidney function, measured CMMG fell from 21.1 to 8.9 µmol/L between sessions, an apparent half-life of about 35 h, and the former 0.25 L/h left day-6 CMMG 2.6–3 times too high. Hara, as the independent check, also fits better at 0.5 L/h. The #46 model change raised the non-kidney CMMG clearance to 0.5 L/h (`MODEL-CHANGE-46.md`).