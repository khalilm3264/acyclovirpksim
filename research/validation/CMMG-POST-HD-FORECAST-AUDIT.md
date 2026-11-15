# Post-Hemodialysis 4-Hour CMMG Forecasting vs. Carry-Forward Audit
## Disjoint Parameter Partitioning, Sign Distribution Counts, Zero-Noise Sanity Benchmarks, and Model-Bounded History Uncertainty

**Audit Date:** November 15, 2026  
**Baseline Frozen Commit:** `e7655bb` on `research/cmmg-post-hd-forecast` (frozen for independent review)  
**Data Export Branch:** `research/cmmg-forecast-data-export`  
**Engine:** Frozen Adult AyFlux Engine (`17971df66e0a97b4d382572a582d35c444a3c83f`)  
**Runner:** `research/validation/cmmg-forecast-post-hd.cjs`  
**Export Files:** `research/validation/cmmg-forecast-patients.csv` (4,500 rows) & `research/validation/cmmg-forecast-results.json`  

> [!IMPORTANT]
> **Educational & Exploratory Research Notice:**  
> All calculations, outputs, and conclusions presented in this document are strictly in silico mathematical simulations of the AyFlux pharmacokinetic model. They do NOT constitute clinical decision support, diagnostic tools, or therapeutic recommendations. Parameter-disjoint draws eliminate candidate overlap in simulation, but virtual patients and forecaster candidates are generated from the same underlying AyFlux PK model; this is not external clinical validation.

---

## 1. Simulation Setup & Provenance

### 1.1 Parameter-Disjoint Partitioning
- **Draw Sequence:** A single deterministic random sequence (seed `44556677`) generated 900 parameter draws from the log-normal adult AyFlux population distribution.
- **Partition:**
  - Virtual Ground-Truth Patients: First $N = 500$ draws (IDs $0 \dots 499$).
  - Candidate Forecaster Draws: Remaining $M = 400$ draws (IDs $500 \dots 899$).
  - **Overlap Check:** Rigorous programmatic assertion (`assert.equal(overlap, 0)`) verified zero parameter-vector sharing across all 500 patients and 400 candidates ($V_c, V_p, CL_{\text{renal}}, CL_{\text{form}}$).
- **Configured HD Clearance:** Effective plasma clearance $\text{hdCl} = 81.8\text{ mL/min}$ ($4.908\text{ L/h}$, $\text{CV} = 20\%$) in the engine, distinct from dialyzer hemodynamic flow settings ($Q_b, Q_d, K_oA$).

### 1.2 Regimen & Dialysis Scenario
- **True Regimen:** Two $500\text{ mg}$ IV infusions (1-hour duration) at $t = 0\text{ h}$ and $t = 12\text{ h}$ in anuric adult ESRD ($70\text{ kg}$, constant $\text{CrCl} = 0\text{ mL/min}$).
- **Hemodialysis Session:** 4-hour session from $t = 24\text{ h}$ to $t = 28\text{ h}$.
- **Sampling & Forecast Window:** End-of-HD sample at $t \approx 28.0\text{ h}$; 4-hour post-dialysis forecast target for CMMG at $t = 32.0\text{ h}$ (dose-free, dialysis-free).

### 1.3 Tested Conditions
1. **Assumed 4% CV Measurement Noise, Exact Timestamps ($t_{\text{meas}} = 28.0\text{ h}$):** $4\%$ CV on observations ($y \sim \mathcal{N}(C, (0.04 C)^2)$) with $0.1\text{ mg/L}$ standard deviation floor; exact sampling time.
2. **Assumed 4% CV Measurement Noise, Perturbed Timestamps ($t_{\text{meas}} = 28.0 \pm 0.25\text{ h}$):** Sampling timestamp jittered uniformly by $\pm 15\text{ min}$ while forecaster assumes $t_{\text{meas}} = 28.0\text{ h}$.
3. **Zero-Noise Sanity Check (Exact $28.0\text{ h}$, 0% CV Observation Noise):** Noiseless measurements ($y_{\text{acv}} = C_{\text{acv}}(28)$, $y_{\text{cmmg}} = C_{\text{cmmg}}(28)$) evaluated against the forecaster's assumed $4\%$ CV / $0.1\text{ mg/L}$ floor likelihood model.

---

## 2. Benchmark Summaries & Paired Error Differences

### Table 1: Primary Metrics Across All Three Conditions

| Condition & Scenario | Method | Median Abs. Error (mg/L) | Median Signed Error (mg/L) | Under / Over / Exact Sign Counts ($N_{\text{under}} / N_{\text{over}} / N_{\text{exact}}$) | Paired Difference vs CMMG-Only ($\Delta |e| = |e_{\text{both}}| - |e_{\text{cmmg}}|$) | % Patients Helped by Adding ACV |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Exact 28.0h (4% CV)**<br>*Complete History* | Carry-Forward (CF)<br>ER (CMMG-only)<br>ER (Both)<br>SU Unweighted (CMMG)<br>SU Unweighted (Both)<br>SU Reweighted (CMMG)<br>SU Reweighted (Both) | 0.8146<br>0.3145<br>0.3503<br>0.3517<br>0.4189<br>0.3057<br>0.3197 | -0.8146<br>+0.0201<br>+0.0430<br>+0.0193<br>+0.0171<br>-0.0148<br>+0.0291 | 489 / 11 / 0<br>244 / 256 / 0<br>240 / 260 / 0<br>242 / 258 / 0<br>246 / 254 / 0<br>255 / 245 / 0<br>240 / 260 / 0 | —<br>—<br>Med: +0.0104, Mean: +0.0861<br>—<br>Med: +0.0563, Mean: +0.0587<br>—<br>Med: +0.0040, Mean: +0.0419 | —<br>—<br>40.0% (200 helped, 268 worse, 32 tie)<br>—<br>38.6% (193 helped, 307 worse, 0 tie)<br>—<br>48.2% (241 helped, 259 worse, 0 tie) |
| **Exact 28.0h (4% CV)**<br>*Hidden 0h Dose (Fixed 1-Dose)* | Carry-Forward (CF)<br>ER (CMMG-only)<br>ER (Both)<br>SU Unweighted (CMMG)<br>SU Unweighted (Both)<br>SU Reweighted (CMMG)<br>SU Reweighted (Both) | 0.8146<br>0.4929<br>**1.5532**<br>0.4969<br>**0.4045**<br>0.3724<br>0.4459 | -0.8146<br>-0.4065<br>**-1.5532**<br>-0.4846<br>**-0.2202**<br>-0.2406<br>+0.2985 | 489 / 11 / 0<br>357 / 143 / 0<br>453 / 47 / 0<br>437 / 63 / 0<br>311 / 189 / 0<br>340 / 160 / 0<br>137 / 363 / 0 | —<br>—<br>Med: +0.5689, Mean: +0.7475<br>—<br>**Med: -0.1392, Mean: -0.0955**<br>—<br>Med: +0.0475, Mean: -0.0070 | —<br>—<br>**17.8%** (89 helped, 389 worse, 22 tie)<br>—<br>**68.6%** (343 helped, 157 worse, 0 tie)<br>—<br>44.2% (221 helped, 279 worse, 0 tie) |
| **Exact 28.0h (4% CV)**<br>*Uncertain (50/50 Mixture)* | Carry-Forward (CF)<br>ER (CMMG-only)<br>ER (Both)<br>SU Unweighted (CMMG)<br>SU Unweighted (Both)<br>SU Reweighted (CMMG)<br>SU Reweighted (Both) | 0.8146<br>0.3087<br>0.3415<br>0.3633<br>0.3873<br>0.3025<br>0.3144 | -0.8146<br>+0.0123<br>+0.0328<br>-0.2794<br>-0.0970<br>+0.0067<br>+0.0323 | 489 / 11 / 0<br>247 / 253 / 0<br>242 / 258 / 0<br>359 / 141 / 0<br>274 / 226 / 0<br>244 / 256 / 0<br>238 / 262 / 0 | —<br>—<br>Med: +0.0080, Mean: +0.0617<br>—<br>Med: +0.0073, Mean: +0.0244<br>—<br>Med: +0.0019, Mean: +0.0396 | —<br>—<br>43.2% (216 helped, 261 worse, 23 tie)<br>—<br>51.8% (259 helped, 241 worse, 0 tie)<br>—<br>47.8% (239 helped, 261 worse, 0 tie) |
| **Perturbed ±15m (4% CV)**<br>*Hidden 0h Dose (Fixed 1-Dose)* | Carry-Forward (CF)<br>ER (CMMG-only)<br>ER (Both)<br>SU Unweighted (CMMG)<br>SU Unweighted (Both)<br>SU Reweighted (CMMG)<br>SU Reweighted (Both) | 0.7514<br>0.5093<br>**1.5702**<br>0.4483<br>**0.3578**<br>0.3683<br>0.4944 | -0.7509<br>-0.4141<br>**-1.5702**<br>-0.4206<br>**-0.1192**<br>-0.1747<br>+0.3631 | 476 / 24 / 0<br>359 / 141 / 0<br>456 / 44 / 0<br>416 / 84 / 0<br>284 / 216 / 0<br>304 / 196 / 0<br>123 / 377 / 0 | —<br>—<br>Med: +0.5973, Mean: +0.7634<br>—<br>**Med: -0.1264, Mean: -0.0911**<br>—<br>Med: +0.0718, Mean: +0.0370 | —<br>—<br>**19.2%** (96 helped, 381 worse, 23 tie)<br>—<br>**69.2%** (346 helped, 154 worse, 0 tie)<br>—<br>44.2% (221 helped, 279 worse, 0 tie) |
| **Perturbed ±15m (4% CV)**<br>*Uncertain (50/50 Mixture)* | Carry-Forward (CF)<br>ER (CMMG-only)<br>ER (Both)<br>SU Unweighted (CMMG)<br>SU Unweighted (Both)<br>SU Reweighted (CMMG)<br>SU Reweighted (Both) | 0.7514<br>0.2545<br>0.3370<br>0.3413<br>0.3779<br>0.2980<br>0.3396 | -0.7509<br>-0.0256<br>+0.0078<br>-0.2182<br>+0.0004<br>+0.0412<br>+0.0760 | 476 / 24 / 0<br>259 / 241 / 0<br>248 / 252 / 0<br>340 / 160 / 0<br>250 / 250 / 0<br>228 / 272 / 0<br>217 / 283 / 0 | —<br>—<br>Med: +0.0270, Mean: +0.0827<br>—<br>Med: +0.0163, Mean: +0.0345<br>—<br>Med: +0.0227, Mean: +0.0520 | —<br>—<br>38.6% (193 helped, 281 worse, 26 tie)<br>—<br>52.8% (264 helped, 236 worse, 0 tie)<br>—<br>44.8% (224 helped, 276 worse, 0 tie) |
| **Zero-Noise Sanity (0% CV)**<br>*Complete History* | Carry-Forward (CF)<br>ER (CMMG-only)<br>ER (Both)<br>SU Unweighted (CMMG)<br>SU Unweighted (Both)<br>SU Reweighted (CMMG)<br>SU Reweighted (Both) | 0.7922<br>0.2208<br>0.2833<br>0.3002<br>0.3347<br>0.1993<br>0.2260 | -0.7922<br>+0.0197<br>+0.0494<br>+0.0218<br>-0.0199<br>-0.0101<br>+0.0231 | 497 / 3 / 0<br>239 / 261 / 0<br>219 / 281 / 0<br>243 / 257 / 0<br>256 / 244 / 0<br>253 / 247 / 0<br>234 / 266 / 0 | —<br>—<br>Med: +0.0281, Mean: +0.0836<br>—<br>Med: +0.0438, Mean: +0.0521<br>—<br>Med: +0.0092, Mean: +0.0287 | —<br>—<br>37.2% (186 helped, 281 worse, 33 tie)<br>—<br>40.6% (203 helped, 297 worse, 0 tie)<br>—<br>46.2% (231 helped, 269 worse, 0 tie) |
| **Zero-Noise Sanity (0% CV)**<br>*Hidden 0h Dose (Fixed 1-Dose)* | Carry-Forward (CF)<br>ER (CMMG-only)<br>ER (Both)<br>SU Unweighted (CMMG)<br>SU Unweighted (Both)<br>SU Reweighted (CMMG)<br>SU Reweighted (Both) | 0.7922<br>0.4233<br>**1.4846**<br>0.4850<br>**0.3526**<br>0.3201<br>0.4338 | -0.7922<br>-0.3489<br>**-1.4846**<br>-0.4810<br>**-0.2541**<br>-0.2287<br>+0.3197 | 497 / 3 / 0<br>355 / 145 / 0<br>454 / 46 / 0<br>459 / 41 / 0<br>334 / 166 / 0<br>332 / 168 / 0<br>119 / 381 / 0 | —<br>—<br>Med: +0.5656, Mean: +0.7555<br>—<br>**Med: -0.1763, Mean: -0.1211**<br>—<br>Med: +0.0393, Mean: -0.0208 | —<br>—<br>**17.8%** (89 helped, 388 worse, 23 tie)<br>—<br>**74.4%** (372 helped, 128 worse, 0 tie)<br>—<br>45.6% (228 helped, 272 worse, 0 tie) |
| **Zero-Noise Sanity (0% CV)**<br>*Uncertain (50/50 Mixture)* | Carry-Forward (CF)<br>ER (CMMG-only)<br>ER (Both)<br>SU Unweighted (CMMG)<br>SU Unweighted (Both)<br>SU Reweighted (CMMG)<br>SU Reweighted (Both) | 0.7922<br>0.2087<br>0.2780<br>0.3296<br>0.3364<br>0.2001<br>0.2267 | -0.7922<br>+0.0199<br>+0.0581<br>-0.2782<br>-0.1393<br>+0.0036<br>+0.0314 | 497 / 3 / 0<br>238 / 262 / 0<br>217 / 283 / 0<br>394 / 106 / 0<br>295 / 205 / 0<br>248 / 252 / 0<br>230 / 270 / 0 | —<br>—<br>Med: +0.0309, Mean: +0.0767<br>—<br>Med: -0.0321, Mean: -0.0057<br>—<br>Med: +0.0105, Mean: +0.0333 | —<br>—<br>38.4% (192 helped, 284 worse, 24 tie)<br>—<br>53.6% (268 helped, 232 worse, 0 tie)<br>—<br>44.6% (223 helped, 277 worse, 0 tie) |

---

## 3. Detailed Mechanism & Sign Analysis

### 3.1 Actual Sign Distribution of Carry-Forward
Rather than assuming universal underprediction from median equality ($\text{med}(e) = -\text{med}(|e|)$), the actual patient counts reveal:
- **Exact Timestamps (4% CV):** 489 underpredicted ($97.8\%$), 11 overpredicted ($2.2\%$), 0 exact.
- **Perturbed Timestamps (4% CV):** 476 underpredicted ($95.2\%$), 24 overpredicted ($4.8\%$), 0 exact.
- **Zero-Noise Sanity (0% CV):** 497 underpredicted ($99.4\%$), 3 overpredicted ($0.6\%$), 0 exact.

**Pharmacokinetic Explanation:** In the AyFlux model, hemodialysis clears both parent acyclovir and CMMG from the central compartment during the 4-hour session. When HD ends at $28\text{ h}$, residual acyclovir in peripheral tissues redistributes back into the central compartment ($B \to A$), continually generating new CMMG via non-renal metabolic clearance ($CL_{\text{form}}$). Consequently, CMMG concentration rises over the subsequent 4 hours in the vast majority of patients ($C_{\text{cmmg}}(32) > C_{\text{cmmg}}(28)$). The rare virtual patients ($0.6\text{–}4.8\%$) who do not underpredict possess combination draws of very high non-renal CMMG elimination ($CL_{\text{mn}}$) and low metabolic formation ($CL_{\text{form}}$), wherein metabolic generation is outpaced by elimination.

### 3.2 Why Ensemble Reweighting Fails Under a Rigid 1-Dose Assumption
When the forecaster rigidly assumes only 1 dose ($12\text{ h}$) was administered:
1. **CMMG-Only Likelihood:** The forecaster matches a moderate CMMG level ($\sim 7\text{ mg/L}$). Plausible 1-dose draws can reach this level with moderate formation clearance, yielding a median absolute error of $0.4929\text{ mg/L}$ ($0.4233\text{ mg/L}$ zero-noise) and signed error of $-0.4065\text{ mg/L}$ ($357$ under / $143$ over).
2. **Joint (ACV + CMMG) Likelihood:** The observed end-HD central ACV is $\sim 10\text{ mg/L}$. In a true 1-dose regimen, central ACV 16 hours post-dose with 4 hours of HD would typically be only $2\text{–}4\text{ mg/L}$. The joint Gaussian likelihood forces the ensemble to select extreme parameter draws (e.g., abnormally small $V_c$ or near-zero clearance).
3. **Peripheral Mass Collapse:** These extreme 1-dose candidates contain almost zero drug mass in the unmeasured peripheral compartment $B$. Once HD terminates, there is no peripheral acyclovir to redistribute into the central compartment. Simulated ACV crashes immediately, halting CMMG formation.
4. **Catastrophic Bias:** As a result, the forecast severely underpredicts: median absolute error jumps to **$1.5532\text{ mg/L}$** ($1.4846\text{ mg/L}$ zero-noise), signed error is **$-1.5532\text{ mg/L}$** ($453$ under / $47$ over), and adding parent ACV worsens the forecast in **$77.8\%$ of patients** (helped only $17.8\%$).

### 3.3 Why Direct State Updating Resists History Misspecification
In Direct State Updating (unweighted), the ODE is integrated from $t = 28\text{ h}$ to $t = 32\text{ h}$ starting from state variables updated from the observed values:
$$\frac{dM}{dt} = CL_{\text{form}} \frac{A(t)}{V_c} \frac{MW_M}{MW_A} - CL_{\text{mn}} \frac{M(t)}{V_m}$$
- **CMMG-Only:** $M(28)$ is reset to $y_{\text{cmmg}} \cdot V_m$, while $A(28)$ is left at the simulated 1-dose value ($2\text{–}4\text{ mg/L}$). The initial rate of CMMG formation is under-driven, yielding median signed error of $-0.4846\text{ mg/L}$ ($437$ under / $63$ over).
- **Paired (ACV + CMMG):** $A(28)$ is reset to $y_{\text{acv}} \cdot V_c$ directly from measured concentration ($10\text{ mg/L}$). Even though peripheral tissue $B(28)$ remains underestimated, starting with the true central ACV concentration immediately drives CMMG formation at the correct initial rate.
- **Quantified Improvement:** Median absolute error drops from $0.4969$ to **$0.4045\text{ mg/L}$** ($0.4850$ to **$0.3526\text{ mg/L}$** zero-noise), signed bias shrinks from $-0.4846$ to **$-0.2202\text{ mg/L}$**, and adding parent ACV helps **$68.6\%$** ($74.4\%$ zero-noise) of virtual patients.

### 3.4 History Uncertainty Evaluated as a Two-Component Mixture
When earlier dosing is treated as uncertain by placing prior mass on both plausible histories ($P(H_1) = 0.5$ for 1 dose, $P(H_2) = 0.5$ for 2 doses):
- **Posterior Probability Shifts:**
  - Exact 28.0h (4% CV): Mean $W(H_1) = 0.0285$, Mean $W(H_2) = 0.9715$, Mean $\text{ESS} = 7.1$
  - Perturbed $\pm 15\text{m}$ (4% CV): Mean $W(H_1) = 0.0235$, Mean $W(H_2) = 0.9765$, Mean $\text{ESS} = 7.2$
  - Zero-Noise Sanity (0% CV): Mean $W(H_1) = 0.0234$, Mean $W(H_2) = 0.9766$, Mean $\text{ESS} = 7.2$
- **Performance:**
  - Under Ensemble Reweighting with Both analytes, median absolute error drops to **$0.3415\text{ mg/L}$** ($0.2780\text{ mg/L}$ zero-noise) with signed error of $+0.0328\text{ mg/L}$ ($242$ under / $258$ over).
  - Under SU Reweighted with Both analytes, median absolute error drops to **$0.3144\text{ mg/L}$** ($0.2267\text{ mg/L}$ zero-noise) with signed error of $+0.0323\text{ mg/L}$ ($238$ under / $262$ over).

---

## 4. Scientifically Bounded Conclusions

1. **Simulation Bounds & Non-Equivalence to Clinical Validation:**
   - The reported $\sim 97\%$ posterior weight on the 2-dose history ($H_2$) is mathematically conditional on the evaluated discrete model space (exactly two candidate histories: $H_1$ vs $H_2$), the chosen equal prior probabilities ($P(H_1) = P(H_2) = 0.5$), and the assumed Gaussian likelihood function. It does NOT represent empirical clinical confidence or prove that a missing dose can be identified in clinical practice where unmodeled variables (variable infusion rates, residual urine output, inter-dialytic dose timing errors, assay cross-reactivity) occur.
   - While parameter-disjoint partitioning ensures candidate forecasters do not share identical vectors with virtual patients, both cohorts are generated from the same underlying two-compartment kinetic model structure. This study evaluates mathematical properties of state-space reweighting versus state updating under controlled structural assumptions; it does NOT constitute external clinical validation.

2. **When Parent Acyclovir Helps vs Worsens the Forecast:**
   - **Where Adding ACV Makes the Forecast Worse:** When a forecaster rigidly imposes a single misspecified historical dosing regimen (e.g., 1 dose instead of 2), conditioning on end-HD parent ACV worsens Ensemble Reweighting in $77.8\text{–}82.2\%$ of simulated cases (median error degrades $0.493 \to 1.553\text{ mg/L}$) due to parameter distortion and loss of peripheral rebound.
   - **Where Adding ACV Improves the Forecast:** When the forecaster either:
     - Applies **Direct State Updating** to the central compartment ($A = y_{\text{acv}} \times V_c$), which bypasses historical parameter selection and improves accuracy in $68.6\text{–}74.4\%$ of cases; OR
     - Represents dosing history as a **mixture model**, allowing the observed parent ACV to weight the candidate regimens, reducing median forecasting error to $0.227\text{–}0.342\text{ mg/L}$.

3. **Status & Invariants:**
   - Baseline commit `e7655bb` remains strictly frozen on `research/cmmg-post-hd-forecast` for Codex's independent code review.
   - All data exports (`cmmg-forecast-patients.csv` and `cmmg-forecast-results.json`) reside on the follow-up branch `research/cmmg-forecast-data-export`.
   - Core model parameters, defaults (`public/assets/pk-engine.js`), and production code remain 100% unmodified.
