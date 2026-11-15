# Post-Hemodialysis 4-Hour CMMG Forecasting vs. Carry-Forward Audit

**Audit Date:** November 15, 2026  
**Base Commit:** `f5923fd3f54fa0e560d30b7b240cfb8726462d87` (`main`)  
**Engine:** Frozen Adult AyFlux Engine (`17971df66e0a97b4d382572a582d35c444a3c83f`)  
**Script:** `research/validation/cmmg-forecast-post-hd.cjs`  

> [!IMPORTANT]
> **Educational & Exploratory Research Notice:**  
> All data and findings presented in this document are based entirely on mathematical simulations of the AyFlux pharmacokinetic model. They do NOT constitute clinical advice, diagnostic tools, or therapeutic recommendations.

---

## 1. Study Rationale & Research Question

In anuric end-stage renal disease (ESRD) patients receiving intravenous acyclovir (ACV), hemodialysis (HD) rapidly removes both acyclovir and its neurotoxicity-associated metabolite, 9-carboxymethoxymethylguanine (CMMG). Upon completion of hemodialysis, acyclovir rebounds from peripheral tissues into the central vascular compartment, continuing to metabolically form CMMG via alcohol and aldehyde dehydrogenases. 

Clinicians often obtain a post-dialysis blood sample to monitor drug levels. A fundamental computational pharmacometrics question is:
> **When earlier dosing history is incomplete, does measuring parent ACV in the same end-of-dialysis tube improve the next 4-hour CMMG forecast enough to survive assay noise?**

This audit compares three forecasting approaches:
1. **Carry-Forward (CF):** Assuming CMMG concentration 4 hours post-dialysis equals the end-of-dialysis measurement ($\widehat{CMMG}(32) = CMMG_{\text{meas}}(28)$).
2. **Model Updated from CMMG Alone:** Bayesian likelihood reweighting of the AyFlux Monte Carlo ensemble using only the measured CMMG concentration at $t = 28\text{ h}$.
3. **Model Updated from Both Analytes (ACV + CMMG):** Joint Bayesian likelihood reweighting using paired ACV and CMMG measurements from the same end-of-dialysis blood draw ($t = 28\text{ h}$).

---

## 2. Methodology & Simulation Design

### 2.1 Model Scenario & Patient Parameters
- **Patient Profile:** Adult anuric ESRD patient:
  - Total body weight: $70\text{ kg}$
  - Residual Creatinine Clearance ($\text{CrCl}$): $0\text{ mL/min}$ (constant)
  - Hemodialysis Clearance ($\text{hdCl}$): $81.8\text{ mL/min}$
- **Hemodialysis Schedule:** A 4-hour intermittent HD session from $t = 24\text{ h}$ to $t = 28\text{ h}$.
- **Forecast Horizon:** 4-hour dose-free post-dialysis interval from $t = 28\text{ h}$ (dialysis end) to $t = 32\text{ h}$ (forecast target).
- **Regimens Evaluated:**
  - **Scenario A (Single Prior Dose):** 500 mg IV (1-h infusion) at $t = 12\text{ h}$ (12 hours before HD).
  - **Scenario B (Repeated Prior Doses):** 500 mg IV (1-h infusion) at $t = 0\text{ h}$ and $t = 12\text{ h}$ (multi-dose tissue accumulation prior to HD).
- **Ensemble Sizes:**
  - Ground Truth Cohort: $N = 500$ distinct virtual patients drawn from the log-normal population distribution ($\text{variability} = 1.0$).
  - Forecaster Monte Carlo Ensemble: $M = 400$ independent parameter draws.

### 2.2 Measurement Conditions & Assay Noise
Measurements simulated at dialysis completion ($t = 28\text{ h}$):
1. **Exact Measurements (0% noise):** Sanity check assessing ideal mathematical limit.
2. **Assumed 4% Assay CV:** Realistic bioanalytical assay noise:
   $$C_{\text{meas}} = C_{\text{true}}(28) \times (1 + \epsilon), \quad \epsilon \sim \mathcal{N}(0, 0.04^2)$$
   The exact same simulated measurements are fed to all forecasting methods.
3. **History Scenarios:**
   - **Complete History:** The forecaster knows all doses administered.
   - **Incomplete / Hidden History:**
     - In Scenario A: Forecaster assumes 250 mg was administered instead of 500 mg (50% under-specified dose).
     - In Scenario B: The earlier dose at $t = 0\text{ h}$ is unrecorded/hidden from the forecaster (forecaster only knows the $t = 12\text{ h}$ dose).

---

## 3. Handling of Unmeasured Tissue Concentrations

The AyFlux adult PK engine implements a coupled 3-compartment system:
$$\frac{dA}{dt} = \text{input} - (CL_{\text{nr}} + CL_{\text{renal}} + CL_{\text{form}}) \frac{A}{V_c} - Q \left(\frac{A}{V_c} - \frac{B}{V_p}\right) - CL_{\text{dial}} \frac{A}{V_c}$$
$$\frac{dB}{dt} = Q \left(\frac{A}{V_c} - \frac{B}{V_p}\right)$$
$$\frac{dM}{dt} = CL_{\text{form}} \frac{A}{V_c} \times \frac{MW_{\text{CMMG}}}{MW_{\text{ACV}}} - (CL_{\text{M,nr}} + CL_{\text{M,renal}} + CL_{\text{M,dial}}) \frac{M}{V_m}$$

Where:
- $A$: Central acyclovir mass (sampled in plasma)
- $B$: **Unmeasured peripheral tissue acyclovir mass**
- $M$: CMMG metabolite mass (sampled in plasma)

### How Each Method Treats Unmeasured Peripheral Tissue ($B$):
1. **Carry-Forward:**
   - Completely ignores compartment dynamics and tissue states ($dA/dt = 0, dM/dt = 0$). Assumes zero post-dialysis concentration change.
2. **CMMG-Only Bayesian Update:**
   - Evaluates likelihood $P(CMMG_{\text{meas}} \mid \theta_j)$. It does **not** reset or reconstruct state $B(28)$ directly; rather, each draw simulates forward from $t = 0$.
   - When history is incomplete, peripheral tissue mass $B(28)$ is underestimated across all draws. However, likelihood reweighting simply favors draws with higher formation rate ($CL_{\text{form}}$) or lower metabolite clearance ($CL_{\text{M,nr}}$). This acts as a phenomenological multiplier that scales the future CMMG trajectory without severely distorting the central volume $V_c$.
3. **Both Analytes (ACV + CMMG) Bayesian Update:**
   - Evaluates joint likelihood $P(ACV_{\text{meas}} \mid \theta_j) \times P(CMMG_{\text{meas}} \mid \theta_j)$.
   - When earlier doses are hidden, the true central ACV concentration at $t = 28\text{ h}$ is much higher than any draw in the under-dosed ensemble can naturally produce.
   - To reconcile the unexpectedly high observed ACV, the joint likelihood strongly forces weights onto **extreme outlier parameter draws** (e.g., extremely small central volume $V_c$ or near-zero nonrenal clearance).
   - Because peripheral tissue mass $B(28)$ is unmeasured and under-represented, the model fails to capture the true post-dialysis redistribution flux $Q (B/V_p - A/V_c)$ from deep tissues into plasma. The resulting parameter degeneracy causes the predicted CMMG trajectory to diverge sharply over the subsequent 4 hours.

---

## 4. Simulation Results Matrix

*All values represent Monte Carlo simulations across $N = 500$ virtual patients.*

| Scenario | Assay CV & History Condition | History Status | Median Absolute Error: Carry-Forward (mg/L) | Median Absolute Error: CMMG Alone (mg/L) | Median Absolute Error: Both Analytes (mg/L) | CMMG Alone Beats CF (%) | Both Analytes Beats CF (%) | Adding ACV Degrades Forecast (%) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Single Prior Dose** (500 mg IV @ 12h) | Exact (0% noise) + Complete History | Complete | 0.5529 | 0.1119 | 0.0597 | 97.2% | 98.0% | 27.0% |
| **Single Prior Dose** (500 mg IV @ 12h) | 4% Assay CV + Complete History | Complete | 0.5586 | 0.1296 | 0.1027 | 94.0% | 95.0% | 37.8% |
| **Single Prior Dose** (500 mg IV @ 12h) | 4% Assay CV + Incomplete History (Assumed 250 mg) | **Incomplete** | **0.5575** | **0.2347** | **0.8895** | **88.6%** | **24.0%** | **84.2%** |
| **Repeated Prior Doses** (500 mg IV @ 0h, 12h) | Exact (0% noise) + Complete History | Complete | 0.7922 | 0.2109 | 0.1051 | 92.6% | 96.0% | 29.0% |
| **Repeated Prior Doses** (500 mg IV @ 0h, 12h) | 4% Assay CV + Complete History | Complete | 0.8078 | 0.3042 | 0.2463 | 84.8% | 85.4% | 43.8% |
| **Repeated Prior Doses** (500 mg IV @ 0h, 12h) | 4% Assay CV + Incomplete History (0h dose hidden) | **Incomplete** | **0.8235** | **0.4177** | **1.3691** | **77.8%** | **29.4%** | **79.2%** |

---

## 5. Key Findings & Synthesis

### 1. Does a 4-hour CMMG model forecast beat Carry-Forward?
- **YES, by a wide margin, provided the model is updated from CMMG alone.**
- Because post-dialysis acyclovir redistributes from tissues and continues to form CMMG while CMMG elimination in anuria is slow, CMMG concentrations rise dynamically over the 4 hours post-HD. 
- Carry-forward incurs large systematic errors ($0.56\text{–}0.82\text{ mg/L}$). Updating the model from CMMG alone beats carry-forward in **78% to 97%** of patients across all scenarios, even with 4% assay noise and unrecorded prior doses.

### 2. Does measuring parent ACV improve the CMMG forecast under complete history?
- **YES.** When all previous doses are documented, measuring parent ACV provides valuable information regarding the remaining precursor pool available for ongoing CMMG synthesis. Under 4% assay CV, median error decreases from $0.13\text{ mg/L} \to 0.10\text{ mg/L}$ (single dose) and from $0.30\text{ mg/L} \to 0.25\text{ mg/L}$ (repeated doses).

### 3. Does measuring parent ACV improve the CMMG forecast when dosing history is incomplete?
- **NO. Measuring parent ACV severely degrades the forecast.**
- When earlier doses are hidden:
  - In the repeated-dose scenario, adding ACV increases median forecast error from **$0.42\text{ mg/L}$ up to $1.37\text{ mg/L}$** (a >3-fold error inflation).
  - In **79.2% to 84.2%** of virtual patients, adding ACV makes the forecast worse than CMMG alone.
  - Furthermore, the joint ACV+CMMG model becomes substantially worse than simple Carry-Forward ($1.37\text{ mg/L}$ vs. $0.82\text{ mg/L}$ error; beating CF in only 29.4% of cases).

### Conclusion for the Computational Question:
When prior dosing history is incomplete, **measuring parent acyclovir in the same end-of-dialysis blood tube does NOT improve the subsequent CMMG forecast.** Under unrecorded cumulative dosing, the mismatch between observed central acyclovir and unmeasured, unmodeled peripheral tissue stores causes Bayesian likelihood degeneracy, making a **CMMG-only update** far more robust against both history misspecification and 4% assay noise.
