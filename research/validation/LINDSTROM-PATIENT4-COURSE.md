# Lindström Patient 4: Schedule Reconstruction & Timing Sensitivity

**Reference:** Lindström et al., *J Antimicrob Chemother* 2019; 74: 3565–3572. doi:[10.1093/jac/dkz357](https://doi.org/10.1093/jac/dkz357).  
**Subject:** Patient 4 (samples `4a`, `4b`, `4c`), Table 1 and supplementary Case series (`dkz357_supplementary_data.docx`, SHA-256 `52ad65724c3be4c214f893ca73b58f799c79d7e520c55a10809ed9314983ad3e`).  
**Engine Blob Hash:** `17971df66e0a97b4d382572a582d35c444a3c83f` (`public/assets/pk-engine.js`, frozen).  
**Script:** `node research/validation/lindstrom-patient4-course.cjs`

---

## 1. Clinical Narrative & Dosing History

Patient 4 was a previously healthy 35-year-old male (98 kg) admitted with herpes simplex encephalitis who presented with fever, headache, and somnolence.

The supplementary case series describes the following multi-phase clinical course:
1. **Initial Therapy (Days 1–3):** Treated with IV acyclovir 15 mg/kg every 8 hours ($15 \times 98 = 1,470\text{ mg}$ per dose as 1-hour infusions).
2. **Acute Renal Failure (Day 3):** "After three days he developed acute renal failure with a creatinine clearance of 30 ml/min, possibly due to inadequate hydration. The same day, he became increasingly confused and agitated."
3. **Dose Reduction (Days 4–5):** "Dosages was adjusted to at first 10 mg/kg q12h on day 4" ($10 \times 98 = 980\text{ mg}$ every 12 hours).
4. **Dose Escalation upon Renal Recovery (Days 6+):** "and was increased to 12 mg/kg q8h on day 6, when renal function returned to normal" ($12 \times 98 = 1,176\text{ mg}$ every 8 hours). Symptoms subsided and he was lucid on day 10.

---

## 2. Timing Discrepancy (Day 2 vs. Day 3 for Visit 4a)

* **Table 1** places the first sample (`4a`) at **Day 2**, with a 6.0-hour post-dose lag, CrCl 30 mL/min, RIFLE Failure (F), and initial dose 15 mg/kg.
* **The Case Narrative** dates the onset of acute renal failure (CrCl 30 mL/min) and confusion to **"after three days"** (Day 3), with dosage adjustment occurring on Day 4.

To evaluate this uncertainty explicitly, three timing interpretations are compared:
- **Table 1 Constant Baseline:** 6 doses of 1,470 mg q8h (40 h of dosing), sampled at 46.0 h.
- **Day 2 Literal:** 4 doses of 1,470 mg q8h (dosing at 0, 8, 16, 24 h), sampled at 30.0 h.
- **Day 3 Narrative:** 9 doses of 1,470 mg q8h (dosing through 64 h), sampled at 70.0 h.

---

## 3. Predicted vs. Observed Concentrations

Concentrations are reported in $\mu\text{mol/L}$ [and $\text{mg/L}$]. Molar masses: acyclovir = $225.21\text{ g/mol}$, CMMG = $239.19\text{ g/mol}$.

| Visit | Timing & Stated CrCl | Observed Serum ACV / CMMG | Table 1 Constant Baseline (P/O Ratio) | Supplement Schedule, Identical CrCl (P/O Ratio) | Supplement Schedule, Dynamic Renal Profile (P/O Ratio) |
|:---|:---|:---:|:---:|:---:|:---:|
| **4a** | Day 2 (or 3), lag 6.0 h<br>$\text{CrCl} = 30\text{ mL/min}$ | **110.0** [24.77] /<br>**57.0** [13.63] | **50.85** [11.45] (0.46) /<br>**30.91** [7.39] (0.54) | **49.85** [11.23] (0.45) /<br>**29.32** [7.01] (0.51) *(Day 2)*<br>**51.02** [11.49] (0.46) /<br>**31.24** [7.47] (0.55) *(Day 3)* | **51.02** [11.49] (0.46) /<br>**31.24** [7.47] (0.55) |
| **4b** | Day 9, lag 7.5 h<br>$\text{CrCl} = 125\text{ mL/min}$ | **25.0** [5.63] /<br>**2.8** [0.67] | **2.97** [0.67] (0.12) /<br>**0.71** [0.17] (0.25) | **2.97** [0.67] (0.12) /<br>**0.71** [0.17] (0.25) | **2.97** [0.67] (0.12) /<br>**0.71** [0.17] (0.25) |
| **4c** | Day 16, lag 8.0 h<br>$\text{CrCl} = 149\text{ mL/min}$ | **10.0** [2.25] /<br>**1.5** [0.36] | **1.81** [0.41] (0.18) /<br>**0.33** [0.08] (0.22) | **1.81** [0.41] (0.18) /<br>**0.33** [0.08] (0.22) | **2.08** [0.47] (0.21) /<br>**0.42** [0.10] (0.28)* |

*\*Note: The dynamic renal profile caps profile knots at the engine's validation limit of 140 mL/min, slightly raising predicted concentrations relative to scalar CrCl 149 mL/min.*

---

## 4. Key Findings

1. **Visit 4a Timing Uncertainty Has Negligible Impact:**
   Whether Visit 4a is simulated after 4 doses on Day 2 (30.0 h), 6 doses (46.0 h), or 9 doses on Day 3 (70.0 h), predicted concentrations vary by only 2% (49.85 vs. 51.02 µmol/L for acyclovir; 29.32 vs. 31.24 µmol/L for CMMG). At CrCl 30 mL/min, acyclovir reaches near steady state within 3–4 doses. The ~2-fold underprediction at 4a ($P/O \approx 0.46\text{--}0.54$) is insensitive to this day 2 vs. day 3 discrepancy.
2. **Schedule Adjustments Do Not Alter Day 9 or Day 16 Predictions Under Identical Renal Assumptions:**
   Under identical constant CrCl (125 mL/min at 4b; 149 mL/min at 4c), the supplement-informed dosing schedule produces predictions that are **identical to the Table 1 baseline to four decimal places**.
   *Mechanism:* In a 98 kg adult with CrCl 125–149 mL/min, acyclovir half-life is $\approx 1.5\text{--}2.0\text{ hours}$. Between the dose escalation on Day 6 and the sample on Day 9 (80 hours), the patient received 10 consecutive doses of 12 mg/kg q8h—spanning over 40 elimination half-lives. Pharmacokinetic memory of earlier doses on Days 1–5 is completely extinguished.
3. **Explaining the Discrepancy at Visits 4b and 4c:**
   At 7.5–8.0 hours post-dose with high renal clearance, a standard two-compartment model predicts near-complete clearance ($\sim 2\text{--}3\ \mu\text{mol/L}$). However:
   - A model concentration profile sweep across the 8-hour dosing interval shows that at **lag = 2.0 h** (1 hour post-infusion), predicted concentrations are **25.92 µmol/L ACV and 3.64 µmol/L CMMG**—closely matching the observed concentrations at 4b (25 µmol/L ACV, 2.8 µmol/L CMMG).
   - This suggests either post-distribution rather than true trough sampling, extended/delayed infusion, or deep peripheral tissue retention in this 98 kg patient that is not captured by standard two-compartment clearance.
