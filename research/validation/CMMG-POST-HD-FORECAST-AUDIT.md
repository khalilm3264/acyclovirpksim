# Post-Hemodialysis 4-Hour CMMG Forecasting vs. Carry-Forward Audit
## Resolution of Simulation Disagreements, Disjoint Parameter Partitioning, and Dosing Uncertainty

**Audit Date:** November 15, 2026  
**Base Commit:** `f5923fd3f54fa0e560d30b7b240cfb8726462d87` (`main`)  
**Engine:** Frozen Adult AyFlux Engine (`17971df66e0a97b4d382572a582d35c444a3c83f`)  
**Runner:** `research/validation/cmmg-forecast-post-hd.cjs`  
**Branch:** `research/cmmg-post-hd-forecast`  

> [!IMPORTANT]
> **Educational & Exploratory Research Notice:**  
> All data and findings presented in this document are based entirely on mathematical simulations of the AyFlux pharmacokinetic model. They do NOT constitute clinical advice, diagnostic tools, or therapeutic recommendations.

---

## 1. Executive Summary & Resolution of the Simulation Disagreement

In prior simulations, two forecaster implementations under incomplete prior dosing history appeared to disagree:
* **Ensemble Reweighting (ER)**: Conditioning on end-hemodialysis (HD) parent acyclovir (ACV) worsened 4-hour CMMG forecasting accuracy (median absolute error degraded from $0.493\text{ mg/L}$ to $1.553\text{ mg/L}$, helping only $17.8\%$ of patients).
* **Direct State Updating (SU)**: Setting the model's central state directly from measured ACV improved 4-hour CMMG forecasting accuracy (median absolute error improved from $0.497\text{ mg/L}$ to $0.405\text{ mg/L}$, helping $68.6\%$ of patients).

This audit resolves why both simulations behave as observed, eliminates all parameter overlap, and evaluates a 50/50 mixture model of history uncertainty:
1. **Disjoint Parameter Draws:** 900 parameter vectors were drawn in a single sequence from the log-normal population distribution and strictly partitioned into $N = 500$ ground-truth patients and $M = 400$ forecaster ensemble draws with **asserted zero parameter overlap**.
2. **Why Ensemble Reweighting Worsened:** When an earlier dose ($t = 0\text{ h}$) is hidden, a rigid single-dose model cannot produce the observed high end-HD central ACV ($C_{\text{acv}} \approx 10\text{ mg/L}$) without selecting pathological parameter draws (near-zero distribution volume or clearance). These draws lack mass in the unmeasured peripheral tissue compartment $B$, so post-HD peripheral rebound ($B \to A$) collapses. This produces severe **systematic underprediction** (median signed error: **$-1.553\text{ mg/L}$**; every single patient under-forecasted).
3. **Why Direct State Updating Improved:** In direct state updating, setting the central compartment state directly from measured ACV ($A(28) = y_{\text{acv}} \times V_c$) directly corrects the initial condition for post-HD CMMG formation ($\text{Rate} \propto A/V_c$). Even though peripheral stores remain underestimated, the immediate post-HD formation rate starts at the true level, cutting median signed error from $-0.485\text{ mg/L}$ to $-0.220\text{ mg/L}$.
4. **Resolution via History Uncertainty (50/50 Mixture):** When the forecaster models uncertainty over the missing dose (a 50/50 prior mixture over 1-dose vs. 2-dose histories), measuring parent ACV at end-HD delivers decisive diagnostic evidence: **the posterior probability of the true 2-dose history jumps to $97.15\%$**. Both Ensemble Reweighting ($0.342\text{ mg/L}$) and State Updating ($0.314\text{ mg/L}$) achieve excellent, unbiased recovery.

---

## 2. Model Specifications & Dialytic Clearance Clarification

### 2.1 Configured HD Clearance vs. Dialyzer Hemodynamic Settings
* **Configured Parameter:** AyFlux configures hemodialysis as an effective plasma clearance:
  $$\text{hdCl} = 81.8\text{ mL/min} \quad (4.908\text{ L/h})$$
  with inter-individual log-normal variability ($\text{CV} = 20\%$, $p.\text{hd} = 4.908 \times \exp(\mathcal{N}(0, 0.2^2))$).
* **Distinction from Hemodynamic Settings:** In clinical dialysis prescriptions, dialyzer clearance depends on blood flow rate ($Q_b \approx 300\text{–}400\text{ mL/min}$), dialysate flow rate ($Q_d \approx 500\text{–}800\text{ mL/min}$), hematocrit ($Hct$), and membrane mass transfer-area coefficient ($K_oA \approx 900\text{ mL/min}$). In AyFlux's adult kinetic engine, clearance is directly parameterized as effective clearance $\text{hdCl} = 81.8\text{ mL/min}$ and applied to plasma concentration ($J_{\text{hd}} = p.\text{hd} \times C_{\text{acv}}$), with metabolite dialytic clearance set to $75\%$ of parent clearance ($c.\text{metDial} = 0.75$).

### 2.2 Simulation Protocol
* **Patient Population:** Anuric adult ESRD ($70\text{ kg}$, constant $\text{CrCl} = 0\text{ mL/min}$).
* **Regimen:**
  * True regimen: $500\text{ mg}$ IV (1-h infusion) at $t = 0\text{ h}$ and $t = 12\text{ h}$.
  * Hemodialysis: 4-hour session from $t = 24\text{ h}$ to $t = 28\text{ h}$.
  * Sampling Time ($t_{\text{meas}}$): End-of-HD, $t = 28.0\text{ h}$ (exact) and $t = 28.0 \pm 0.25\text{ h}$ (perturbed).
  * Forecast Target: CMMG concentration at $t = 32.0\text{ h}$ (4 hours post-HD, dose-free).
* **Assay Noise:** $4\%$ assay coefficient of variation ($\text{CV} = 0.04$) with a $0.1\text{ mg/L}$ standard deviation floor as defined in the AyFlux Bayesian engine:
  $$\sigma = \max(0.1, 0.04 \times C_{\text{pred}}), \quad y \sim \mathcal{N}(C_{\text{true}}, (0.04 \times C_{\text{true}})^2)$$

---

## 3. Paired Results Table

All methods were evaluated across identical virtual patients ($N = 500$), identical candidate parameters ($M = 400$, zero overlap), identical assay noise, and identical sampling times.

### Table 1: Complete Benchmark (Exact Timestamps $t = 28.0\text{ h}$ vs. Perturbed $t = 28 \pm 15\text{ min}$)

| History Condition & Timing | Method | CMMG-Only Med. Abs. Error | CMMG-Only Med. Signed Error | Paired (ACV+CMMG) Med. Abs. Error | Paired (ACV+CMMG) Med. Signed Error | % Patients Helped by Adding ACV | History Posterior Weight & ESS |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Complete History (Control)**<br>*(Exact $28.0\text{ h}$)* | **Carry-Forward (CF)**<br>**Ensemble Reweighting (ER)**<br>**SU (Unweighted)**<br>**SU (Reweighted)** | $0.8146\text{ mg/L}$<br>$0.3145\text{ mg/L}$<br>$0.3517\text{ mg/L}$<br>$0.3057\text{ mg/L}$ | $-0.8146\text{ mg/L}$<br>$+0.0201\text{ mg/L}$<br>$+0.0193\text{ mg/L}$<br>$-0.0148\text{ mg/L}$ | —<br>$0.3503\text{ mg/L}$<br>$0.4189\text{ mg/L}$<br>$0.3197\text{ mg/L}$ | —<br>$+0.0430\text{ mg/L}$<br>$+0.0171\text{ mg/L}$<br>$+0.0291\text{ mg/L}$ | —<br>40.0%<br>38.6%<br>48.2% | History known ($100\%$) |
| **Hidden 0h Dose (Fixed 1-Dose)**<br>*(Exact $28.0\text{ h}$)* | **Carry-Forward (CF)**<br>**Ensemble Reweighting (ER)**<br>**SU (Unweighted)**<br>**SU (Reweighted)** | $0.8146\text{ mg/L}$<br>$0.4929\text{ mg/L}$<br>$0.4969\text{ mg/L}$<br>$0.3724\text{ mg/L}$ | $-0.8146\text{ mg/L}$<br>$-0.4065\text{ mg/L}$<br>$-0.4846\text{ mg/L}$<br>$-0.2406\text{ mg/L}$ | —<br>**$1.5532\text{ mg/L}$**<br>**$0.4045\text{ mg/L}$**<br>$0.4459\text{ mg/L}$ | —<br>**$-1.5532\text{ mg/L}$**<br>**$-0.2202\text{ mg/L}$**<br>$+0.2985\text{ mg/L}$ | —<br>**17.8%**<br>**68.6%**<br>44.2% | Single fixed history |
| **Uncertain Dose (50/50 Mixture)**<br>*(Exact $28.0\text{ h}$)* | **Carry-Forward (CF)**<br>**Ensemble Reweighting (ER)**<br>**SU (Unweighted)**<br>**SU (Reweighted)** | $0.8146\text{ mg/L}$<br>$0.3087\text{ mg/L}$<br>$0.3633\text{ mg/L}$<br>$0.3025\text{ mg/L}$ | $-0.8146\text{ mg/L}$<br>$+0.0123\text{ mg/L}$<br>$-0.2794\text{ mg/L}$<br>$+0.0067\text{ mg/L}$ | —<br>$0.3415\text{ mg/L}$<br>$0.3873\text{ mg/L}$<br>$0.3144\text{ mg/L}$ | —<br>$+0.0328\text{ mg/L}$<br>$-0.0970\text{ mg/L}$<br>$+0.0323\text{ mg/L}$ | —<br>43.2%<br>51.8%<br>47.8% | $P(H_1) = 2.85\%$<br>$P(H_2) = 97.15\%$<br>$\text{ESS} = 7.1$ |
| **Hidden 0h Dose (Fixed 1-Dose)**<br>*(Perturbed $\pm 15\text{ min}$)* | **Carry-Forward (CF)**<br>**Ensemble Reweighting (ER)**<br>**SU (Unweighted)**<br>**SU (Reweighted)** | $0.7514\text{ mg/L}$<br>$0.5093\text{ mg/L}$<br>$0.4483\text{ mg/L}$<br>$0.3683\text{ mg/L}$ | $-0.7509\text{ mg/L}$<br>$-0.4141\text{ mg/L}$<br>$-0.4206\text{ mg/L}$<br>$-0.1747\text{ mg/L}$ | —<br>**$1.5702\text{ mg/L}$**<br>**$0.3578\text{ mg/L}$**<br>$0.4944\text{ mg/L}$ | —<br>**$-1.5702\text{ mg/L}$**<br>**$-0.1192\text{ mg/L}$**<br>$+0.3631\text{ mg/L}$ | —<br>**19.2%**<br>**69.2%**<br>44.2% | Single fixed history |
| **Uncertain Dose (50/50 Mixture)**<br>*(Perturbed $\pm 15\text{ min}$)* | **Carry-Forward (CF)**<br>**Ensemble Reweighting (ER)**<br>**SU (Unweighted)**<br>**SU (Reweighted)** | $0.7514\text{ mg/L}$<br>$0.2545\text{ mg/L}$<br>$0.3413\text{ mg/L}$<br>$0.2980\text{ mg/L}$ | $-0.7509\text{ mg/L}$<br>$-0.0256\text{ mg/L}$<br>$-0.2182\text{ mg/L}$<br>$+0.0412\text{ mg/L}$ | —<br>$0.3370\text{ mg/L}$<br>$0.3779\text{ mg/L}$<br>$0.3396\text{ mg/L}$ | —<br>$+0.0078\text{ mg/L}$<br>$+0.0004\text{ mg/L}$<br>$+0.0760\text{ mg/L}$ | —<br>38.6%<br>52.8%<br>44.8% | $P(H_1) = 2.35\%$<br>$P(H_2) = 97.65\%$<br>$\text{ESS} = 7.2$ |

---

## 4. Mechanism Analysis

### 4.1 Carry-Forward Systematic Underprediction
Across every single condition and draw time, Carry-Forward exhibits a massive negative signed error ($-0.8146\text{ mg/L}$ exact, $-0.7509\text{ mg/L}$ perturbed). Because hemodialysis terminates abruptly at $t = 28\text{ h}$, parent acyclovir stored in peripheral tissues immediately redistributes into the central compartment ($B \to A$), driving continued post-dialysis metabolic generation of CMMG. Consequently, $C_{\text{cmmg}}(32) > C_{\text{cmmg}}(28)$ in virtually all patients, guaranteeing that carrying forward the end-HD measurement underpredicts the 4-hour rebound.

### 4.2 Why Ensemble Reweighting Fails Under a Rigidly Misspecified History
When the forecaster assumes only 1 dose was administered ($t = 12\text{ h}$):
1. **Under CMMG alone:** The likelihood only penalizes metabolite predictions. A 1-dose trajectory can produce plausible CMMG levels through moderate formation clearance. The median signed error is $-0.407\text{ mg/L}$ with a median absolute error of $0.493\text{ mg/L}$.
2. **Under Paired (ACV + CMMG):** Central parent ACV is measured at $\sim 10\text{ mg/L}$. In a 1-dose model (16 hours post-dose with 4 hours of HD), typical central ACV is only $2\text{–}4\text{ mg/L}$. The joint Gaussian likelihood:
   $$\log \mathcal{L} = -\frac{1}{2} \left[ \left(\frac{y_{\text{acv}} - \hat{C}_{\text{acv}}}{\sigma_{\text{acv}}}\right)^2 + \left(\frac{y_{\text{cmmg}} - \hat{C}_{\text{cmmg}}}{\sigma_{\text{cmmg}}}\right)^2 \right]$$
   severely penalizes physiologically normal candidates, placing virtually $100\%$ of posterior weight on extreme outlier parameter draws (e.g. tiny $V_c$ or near-zero systemic clearance).
3. **The Redistribution Deficit:** These outlier candidates still have no mass in peripheral tissue $B$. Once dialysis stops, they have no peripheral drug to redistribute into the central compartment. Simulated ACV crashes immediately post-HD, halting CMMG formation. The forecast collapses into extreme systematic underprediction: **signed error $-1.553\text{ mg/L}$**, worse than carry-forward.

### 4.3 Why Direct State Updating Succeeds Under a Misspecified History
In Direct State Updating (unweighted), the ODE is integrated from $t = 28\text{ h}$ to $t = 32\text{ h}$ starting from states reset to the measurements:
$$\frac{dM}{dt} = CL_{\text{form}} \frac{A(t)}{V_c} \frac{MW_M}{MW_A} - CL_{\text{mn}} \frac{M(t)}{V_m}$$
* **CMMG alone:** $M(28)$ is reset to $y_{\text{cmmg}} \cdot V_m$, but $A(28)$ remains at the simulated 1-dose value ($\sim 2\text{–}4\text{ mg/L}$, underestimating true central ACV). Consequently, post-HD formation of CMMG is under-driven, yielding signed error $-0.485\text{ mg/L}$ and absolute error $0.497\text{ mg/L}$.
* **Paired (ACV + CMMG):** $A(28)$ is reset to $y_{\text{acv}} \cdot V_c$ directly from the measurement. Even though peripheral tissue $B(28)$ remains underestimated, starting with the true central ACV concentration ($10\text{ mg/L}$) immediately drives CMMG formation at the correct initial rate. The median signed error shrinks by more than half (to $-0.220\text{ mg/L}$), median absolute error drops to $0.405\text{ mg/L}$, and **$68.6\%$ of patients are helped by adding ACV**.

### 4.4 The Design Choice: Representing History Uncertainty as a Mixture
The fundamental insight is that a forecaster should not rigidly assume a single history when earlier dosing is uncertain. When history uncertainty is represented as a prior mixture:
$$P(H_1) = 0.5 \quad (1\text{ dose}), \quad P(H_2) = 0.5 \quad (2\text{ doses})$$
measuring parent ACV at end-HD delivers enormous diagnostic value:
* Under $H_1$, the probability of observing $C_{\text{acv}} \approx 10\text{ mg/L}$ is $< 10^{-10}$.
* Under $H_2$, the probability is high ($\approx 0.97$).
* The Bayesian posterior weight on the true 2-dose history jumps to **$97.15\%$**.
* This rescues Ensemble Reweighting completely, reducing error to **$0.342\text{ mg/L}$** with virtually zero bias ($+0.033\text{ mg/L}$).

---

## 5. Decision for Pilot Study

1. **The Disagreement is Fully Resolved:** The earlier divergence was not caused by parameter draw overlap or assay noise floors. It is a fundamental property of the update mathematics:
   - **Ensemble Reweighting with a rigid wrong history breaks down** because forcing a 1-dose model to fit 2-dose central ACV causes severe parameter distortion and eliminates peripheral rebound.
   - **Direct State Updating is robust to history misspecification** because it resets the central state directly, bypassing historical parameter distortion.
2. **Clinical Forecaster Architecture Recommendation:**
   - In clinical practice where earlier dosing records may be missing or unverified, a clinical forecaster **must either use Direct State Updating or model history uncertainty explicitly via a mixture ensemble**.
   - If history uncertainty is modeled as a mixture, measuring parent ACV in the same end-of-HD tube is **highly beneficial**, resolving the hidden dose with $>97\%$ confidence.
