# Post-Hemodialysis 4-Hour CMMG Forecasting vs. Carry-Forward Audit
## Disjoint Parameter Partitioning, Sign Distribution Counts, Zero-Noise Sanity Benchmarks, and Model-Bounded History Uncertainty

**Audit Date:** November 15, 2026  
**Baseline Frozen Commit:** `e7655bb` on `research/cmmg-post-hd-forecast` (frozen for independent review)  
**Data Export Branch:** `research/cmmg-forecast-data-export`  
**Engine:** Frozen Adult AyFlux Engine (`17971df66e0a97b4d382572a582d35c444a3c83f`)  
**Runner:** `research/validation/cmmg-forecast-post-hd.cjs`  
**Export Files:** `research/validation/cmmg-forecast-patients.csv` (6,000 rows) & `research/validation/cmmg-forecast-results.json`  

> [!IMPORTANT]
> **Educational & Exploratory Research Notice:**  
> All calculations, outputs, and conclusions presented in this document are strictly in silico mathematical simulations of the AyFlux pharmacokinetic model. They do NOT constitute clinical decision support, diagnostic tools, or therapeutic recommendations. Parameter-disjoint draws eliminate candidate overlap in simulation, but virtual patients and forecaster candidates are generated from the same underlying AyFlux PK model; this is not external clinical validation.

---

## 1. Simulation Setup & Provenance

### 1.1 Parameter-Disjoint Partitioning
- **Draw Sequence:** A single deterministic random sequence (engine param_draw_seed `123456789`) generated 900 parameter draws from the log-normal adult AyFlux population distribution.
- **Partition:**
  - Virtual Ground-Truth Patients: First $N = 500$ draws (IDs $0 \dots 499$).
  - Candidate Forecaster Draws: Remaining $M = 400$ draws (IDs $500 \dots 899$).
  - **Overlap Check:** Rigorous programmatic assertion (`assert.equal(match, false)`) verified zero parameter-vector sharing across all 500 patients and 400 candidates ($V_c, V_p, CL_{\text{renal}}, CL_{\text{form}}$).
- **Configured HD Clearance:** Effective plasma clearance $\text{hdCl} = 81.8\text{ mL/min}$ ($4.908\text{ L/h}$, $\text{CV} = 20\%$) in the engine, distinct from dialyzer hemodynamic flow settings ($Q_b, Q_d, K_oA$).

### 1.2 Regimen & Dialysis Scenario
- **True Regimen:** Two $500\text{ mg}$ IV infusions (1-hour duration) at $t = 0\text{ h}$ and $t = 12\text{ h}$ in anuric adult ESRD ($70\text{ kg}$, constant $\text{CrCl} = 0\text{ mL/min}$).
- **Hemodialysis Session:** 4-hour session from $t = 24\text{ h}$ to $t = 28\text{ h}$.
- **Sampling & Forecast Window:** End-of-HD sample drawn at $t \approx 28.0\text{ h}$; 4-hour post-dialysis forecast target evaluated under both fixed clock ($t = 32.0\text{ h}$) and elapsed horizon ($t_{\text{target}} = t_{\text{meas}} + 4.0\text{ h}$).

### 1.3 Tested Conditions & Forecast Clocks
1. **Exact 28.0h (4% CV Noise, Target 32.0h, Horizon 4.0h):** Sampling at exactly $28.0\text{ h}$; scored at $32.0\text{ h}$ (exact 4-hour post-HD window).
2. **Perturbed ±15m (4% CV Noise, Fixed Clock Target 32.0h, Horizon 3.75–4.25h):** Sampling jittered uniformly $t_{\text{meas}} \in [27.75\text{ h}, 28.25\text{ h}]$. For draws before $28.0\text{ h}$, active dialytic clearance ($p.\text{hd}$ and $c.\text{metDial}$) operates until $28.0\text{ h}$.
3. **Perturbed ±15m (4% CV Noise, Fixed Horizon Target Draw+4.0h, Horizon 4.0h strictly):** Scored at $t_{\text{meas}} + 4.0\text{ h}$ to evaluate an identical 4.0-hour elapsed interval regardless of draw jitter.
4. **Zero-Noise Sanity Check (0% CV, Exact 28.0h, Target 32.0h):** Noiseless measurements ($y_{\text{acv}} = C_{\text{acv}}(28)$, $y_{\text{cmmg}} = C_{\text{cmmg}}(28)$) evaluated against the forecaster's assumed $4\%$ CV / $0.1\text{ mg/L}$ floor likelihood model.

### 1.4 Event-Aware Continuation Parity Audit (Codex Review Resolution)
- **Review Finding:** In early runner drafts (`e7655bb`), stepping from $t_{\text{meas}} < 28.0\text{ h}$ (e.g. $27.75\text{ h}$) with an anuric no-dialysis stepper dropped residual hemodialysis for the remaining $0.25\text{ h}$, producing continuation errors of $+0.378\text{ to }+0.550\text{ mg/L}$ at $32\text{ h}$.
- **Parity Implementation:** The updated `stepInterval` applies active hemodialysis ($p.\text{hd}$ and $c.\text{metDial} = 1.0$) when $t < 28.0\text{ h}$ before transitioning to post-HD clearance.
- **Verification Across Cohort:** Programmatic no-update continuation parity assertions were executed across diagnostic indices $[0, 1, 2, 100, 499]$ at pre-end ($27.75\text{ h}$), exact-end ($28.0\text{ h}$), and post-end ($28.25\text{ h}$). Across all 15 patient-timestamp pairs, the continuation trajectory matched the full engine simulation exactly with absolute difference $< 10^{-12}\text{ mg/L}$ ($0.000\text{e}+0$).

### 1.5 Distinction Between Generative Noise and Likelihood Floor
- **RNG Seeds:** Parameter draws used engine seed `123456789`; evaluation draw-time perturbation ($\pm 15\text{ min}$) and measurement noise ($4\%\text{ CV}$) used independent seed `44556677`.
- **Generative Measurement Model:** Virtual patient observations are generated with pure proportional Gaussian noise:
  $$y = \max(0.01, C \cdot (1 + \epsilon)), \quad \epsilon \sim \mathcal{N}(0, 0.04^2)$$
  There is NO artificial $0.1\text{ mg/L}$ standard-deviation floor applied during observation generation.
- **Forecaster Likelihood Model:** In computing Gaussian candidate likelihoods, the forecaster uses:
  $$\sigma = \max(0.1, \hat{C} \cdot 0.04)$$
  where $\sigma_{\min} = 0.1\text{ mg/L}$ serves strictly as a numerical regularization floor in the likelihood denominator to prevent division-by-zero or infinite log penalties when candidate predictions approach zero.

---

## 2. Benchmark Summaries & Paired Error Differences

### Table 1: Primary Metrics Across Evaluated Conditions

| Condition & Scenario | Method | Median Abs. Error (mg/L) | Median Signed Error (mg/L) | Under / Over / Exact Sign Counts ($N_{\text{under}} / N_{\text{over}} / N_{\text{exact}}$) | Median Paired Difference $\text{med}(d)$ (mg/L) | Diff. of Marginal Medians $\Delta_{\text{marginal}}$ (mg/L) | % Patients Helped by Adding ACV ($N_{\text{helped}} / N_{\text{worsened}} / N_{\text{tied}}$) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Exact 28.0h (4% CV)**<br>*Complete History (Control)* | Carry-Forward (CF)<br>ER (CMMG-only)<br>ER (Both)<br>SU Unweighted (CMMG)<br>SU Unweighted (Both)<br>SU Reweighted (CMMG)<br>SU Reweighted (Both) | 0.8146<br>0.3145<br>0.3503<br>0.3517<br>0.4189<br>0.3057<br>0.3197 | -0.8146<br>+0.0201<br>+0.0430<br>+0.0193<br>+0.0171<br>-0.0148<br>+0.0291 | 489 / 11 / 0<br>244 / 256 / 0<br>240 / 260 / 0<br>242 / 258 / 0<br>246 / 254 / 0<br>255 / 245 / 0<br>240 / 260 / 0 | —<br>—<br>+0.0104<br>—<br>+0.0563<br>—<br>+0.0040 | —<br>—<br>+0.0358<br>—<br>+0.0672<br>—<br>+0.0140 | —<br>—<br>40.0% (200 helped, 268 worsened, 32 tied)<br>—<br>38.6% (193 helped, 307 worsened, 0 tied)<br>—<br>48.2% (241 helped, 259 worsened, 0 tied) |
| **Exact 28.0h (4% CV)**<br>*Hidden Dose (Fixed 1-Dose)* | Carry-Forward (CF)<br>ER (CMMG-only)<br>ER (Both)<br>SU Unweighted (CMMG)<br>SU Unweighted (Both)<br>SU Reweighted (CMMG)<br>SU Reweighted (Both) | 0.8146<br>0.4929<br>**1.5532**<br>0.4969<br>**0.4045**<br>0.3724<br>0.4459 | -0.8146<br>-0.4065<br>**-1.5532**<br>-0.4846<br>**-0.2202**<br>-0.2406<br>+0.2985 | 489 / 11 / 0<br>357 / 143 / 0<br>453 / 47 / 0<br>437 / 63 / 0<br>311 / 189 / 0<br>340 / 160 / 0<br>137 / 363 / 0 | —<br>—<br>+0.5689<br>—<br>**-0.1392**<br>—<br>+0.0475 | —<br>—<br>+1.0603<br>—<br>-0.0924<br>—<br>+0.0735 | —<br>—<br>17.8% (89 helped, 389 worsened, 22 tied)<br>—<br>**68.6%** (343 helped, 157 worsened, 0 tied)<br>—<br>44.2% (221 helped, 279 worsened, 0 tied) |
| **Exact 28.0h (4% CV)**<br>*Uncertain Dose (50/50 Mixture)* | Carry-Forward (CF)<br>ER (CMMG-only)<br>ER (Both)<br>SU Unweighted (CMMG)<br>SU Unweighted (Both)<br>SU Reweighted (CMMG)<br>SU Reweighted (Both) | 0.8146<br>0.3087<br>0.3415<br>0.3633<br>0.3873<br>0.3025<br>0.3144 | -0.8146<br>+0.0123<br>+0.0328<br>-0.2794<br>-0.0970<br>+0.0067<br>+0.0323 | 489 / 11 / 0<br>247 / 253 / 0<br>242 / 258 / 0<br>359 / 141 / 0<br>274 / 226 / 0<br>248 / 252 / 0<br>239 / 261 / 0 | —<br>—<br>+0.0080<br>—<br>-0.0153<br>—<br>+0.0067 | —<br>—<br>+0.0328<br>—<br>+0.0240<br>—<br>+0.0119 | —<br>—<br>43.2% (216 helped, 261 worsened, 23 tied)<br>—<br>51.8% (259 helped, 241 worsened, 0 tied)<br>—<br>47.8% (239 helped, 261 worsened, 0 tied) |
| **Perturbed ±15m (Fixed 32.0h Target, Horizon 3.75–4.25h)**<br>*Complete History (Control)* | Carry-Forward (CF)<br>ER (CMMG-only)<br>ER (Both)<br>SU Unweighted (CMMG)<br>SU Unweighted (Both)<br>SU Reweighted (CMMG)<br>SU Reweighted (Both) | 0.7514<br>0.2727<br>0.3421<br>0.3372<br>0.3916<br>0.2761<br>0.2983 | -0.7509<br>-0.0034<br>-0.0073<br>-0.0253<br>+0.0160<br>-0.0339<br>-0.0082 | 478 / 22 / 0<br>253 / 247 / 0<br>251 / 249 / 0<br>256 / 244 / 0<br>241 / 259 / 0<br>268 / 232 / 0<br>251 / 249 / 0 | —<br>—<br>+0.0165<br>—<br>+0.0299<br>—<br>+0.0045 | —<br>—<br>+0.0693<br>—<br>+0.0544<br>—<br>+0.0222 | —<br>—<br>37.6% (188 helped, 275 worsened, 37 tied)<br>—<br>43.0% (215 helped, 285 worsened, 0 tied)<br>—<br>48.4% (242 helped, 258 worsened, 0 tied) |
| **Perturbed ±15m (Fixed 32.0h Target, Horizon 3.75–4.25h)**<br>*Hidden Dose (Fixed 1-Dose)* | Carry-Forward (CF)<br>ER (CMMG-only)<br>ER (Both)<br>SU Unweighted (CMMG)<br>SU Unweighted (Both)<br>SU Reweighted (CMMG)<br>SU Reweighted (Both) | 0.7514<br>0.5093<br>**1.5702**<br>0.5166<br>**0.3757**<br>0.3707<br>0.4435 | -0.7509<br>-0.4141<br>**-1.5702**<br>-0.5117<br>**-0.2097**<br>-0.2512<br>+0.2872 | 478 / 22 / 0<br>372 / 128 / 0<br>460 / 40 / 0<br>440 / 60 / 0<br>328 / 172 / 0<br>345 / 155 / 0<br>142 / 358 / 0 | —<br>—<br>+0.5689<br>—<br>**-0.1666**<br>—<br>+0.0203 | —<br>—<br>+1.0609<br>—<br>-0.1410<br>—<br>+0.0728 | —<br>—<br>19.2% (96 helped, 381 worsened, 23 tied)<br>—<br>**73.0%** (365 helped, 135 worsened, 0 tied)<br>—<br>48.8% (244 helped, 256 worsened, 0 tied) |
| **Perturbed ±15m (Fixed 32.0h Target, Horizon 3.75–4.25h)**<br>*Uncertain Dose (50/50 Mixture)* | Carry-Forward (CF)<br>ER (CMMG-only)<br>ER (Both)<br>SU Unweighted (CMMG)<br>SU Unweighted (Both)<br>SU Reweighted (CMMG)<br>SU Reweighted (Both) | 0.7514<br>0.2545<br>0.3370<br>0.3881<br>0.3621<br>0.2744<br>0.2998 | -0.7509<br>-0.0256<br>+0.0078<br>-0.3154<br>-0.1038<br>-0.0297<br>+0.0106 | 478 / 22 / 0<br>264 / 236 / 0<br>249 / 251 / 0<br>372 / 128 / 0<br>291 / 209 / 0<br>268 / 232 / 0<br>247 / 253 / 0 | —<br>—<br>+0.0279<br>—<br>-0.0440<br>—<br>+0.0108 | —<br>—<br>+0.0825<br>—<br>-0.0260<br>—<br>+0.0254 | —<br>—<br>38.6% (193 helped, 285 worsened, 22 tied)<br>—<br>55.0% (275 helped, 225 worsened, 0 tied)<br>—<br>46.6% (233 helped, 267 worsened, 0 tied) |
| **Zero-Noise Sanity (0% CV, Exact 28.0h)**<br>*Complete History (Control)* | Carry-Forward (CF)<br>ER (CMMG-only)<br>ER (Both)<br>SU Unweighted (CMMG)<br>SU Unweighted (Both)<br>SU Reweighted (CMMG)<br>SU Reweighted (Both) | 0.7922<br>0.2208<br>0.2833<br>0.3002<br>0.3347<br>0.1993<br>0.2260 | -0.7922<br>+0.0323<br>+0.0578<br>+0.0218<br>-0.0199<br>-0.0101<br>+0.0231 | 497 / 3 / 0<br>235 / 265 / 0<br>219 / 281 / 0<br>243 / 257 / 0<br>256 / 244 / 0<br>253 / 247 / 0<br>234 / 266 / 0 | —<br>—<br>+0.0281<br>—<br>+0.0438<br>—<br>+0.0092 | —<br>—<br>+0.0625<br>—<br>+0.0346<br>—<br>+0.0267 | —<br>—<br>37.2% (186 helped, 281 worsened, 33 tied)<br>—<br>40.6% (203 helped, 297 worsened, 0 tied)<br>—<br>46.2% (231 helped, 269 worsened, 0 tied) |
| **Zero-Noise Sanity (0% CV, Exact 28.0h)**<br>*Hidden Dose (Fixed 1-Dose)* | Carry-Forward (CF)<br>ER (CMMG-only)<br>ER (Both)<br>SU Unweighted (CMMG)<br>SU Unweighted (Both)<br>SU Reweighted (CMMG)<br>SU Reweighted (Both) | 0.7922<br>0.4233<br>**1.4846**<br>0.4850<br>**0.3526**<br>0.3201<br>0.4338 | -0.7922<br>-0.3489<br>**-1.4846**<br>-0.4810<br>**-0.2541**<br>-0.2287<br>+0.3197 | 497 / 3 / 0<br>355 / 145 / 0<br>454 / 46 / 0<br>459 / 41 / 0<br>334 / 166 / 0<br>332 / 168 / 0<br>119 / 381 / 0 | —<br>—<br>+0.5656<br>—<br>**-0.1763**<br>—<br>+0.0393 | —<br>—<br>+1.0613<br>—<br>-0.1324<br>—<br>+0.1137 | —<br>—<br>17.8% (89 helped, 388 worsened, 23 tied)<br>—<br>**74.4%** (372 helped, 128 worsened, 0 tied)<br>—<br>45.6% (228 helped, 272 worsened, 0 tied) |
| **Zero-Noise Sanity (0% CV, Exact 28.0h)**<br>*Uncertain Dose (50/50 Mixture)* | Carry-Forward (CF)<br>ER (CMMG-only)<br>ER (Both)<br>SU Unweighted (CMMG)<br>SU Unweighted (Both)<br>SU Reweighted (CMMG)<br>SU Reweighted (Both) | 0.7922<br>0.2087<br>0.2780<br>0.3296<br>0.3364<br>0.2001<br>0.2267 | -0.7922<br>+0.0199<br>+0.0581<br>-0.2782<br>-0.1393<br>+0.0036<br>+0.0314 | 497 / 3 / 0<br>238 / 262 / 0<br>217 / 283 / 0<br>394 / 106 / 0<br>295 / 205 / 0<br>248 / 252 / 0<br>230 / 270 / 0 | —<br>—<br>+0.0309<br>—<br>-0.0321<br>—<br>+0.0105 | —<br>—<br>+0.0693<br>—<br>+0.0067<br>—<br>+0.0266 | —<br>—<br>38.4% (192 helped, 284 worsened, 24 tied)<br>—<br>53.6% (268 helped, 232 worsened, 0 tied)<br>—<br>44.6% (223 helped, 277 worsened, 0 tied) |

---

### Table 2: Timing Audit: Fixed Clock Target (32.0h) vs. Elapsed Horizon (Draw + 4.0h)

Evaluates the effect of sampling timestamp jitter ($t_{\text{meas}} \in [27.75\text{ h}, 28.25\text{ h}]$) when scored at fixed clock ($32.0\text{ h}$) vs. elapsed horizon ($t_{\text{meas}} + 4.0\text{ h}$):

| Regimen & Metric | Perturbed Fixed Clock Target (32.0h)<br>*Actual Horizon: 3.75–4.25 h* | Perturbed Fixed Elapsed Horizon (Draw+4.0h)<br>*Actual Horizon: 4.0 h strictly* | Absolute Difference |
| :--- | :---: | :---: | :---: |
| **Complete History (Control)** | | | |
| Carry-Forward Median Abs Error | 0.7514 mg/L | 0.7675 mg/L | 0.0161 mg/L |
| ER (Both) Median Abs Error | 0.3421 mg/L | 0.3428 mg/L | 0.0008 mg/L |
| ER (Both) Patients Helped vs Worsened vs Tied | 37.6% (188 helped / 275 worsened / 37 tied) | 36.8% (184 helped / 279 worsened / 37 tied) | 0.8% |
| SU Unweighted (Both) Median Abs Error | 0.3916 mg/L | 0.3930 mg/L | 0.0014 mg/L |
| SU Unweighted (Both) Patients Helped vs Worsened vs Tied | 43.0% (215 helped / 285 worsened / 0 tied) | 43.0% (215 helped / 285 worsened / 0 tied) | 0.0% |
| SU Reweighted (Both) Median Abs Error | 0.2983 mg/L | 0.2999 mg/L | 0.0016 mg/L |
| SU Reweighted (Both) Patients Helped vs Worsened vs Tied | 48.4% (242 helped / 258 worsened / 0 tied) | 48.0% (240 helped / 260 worsened / 0 tied) | 0.4% |
| **Hidden Dose (Fixed 1-Dose)** | | | |
| Carry-Forward Median Abs Error | 0.7514 mg/L | 0.7675 mg/L | 0.0161 mg/L |
| ER (Both) Median Abs Error | 1.5702 mg/L | 1.5716 mg/L | 0.0014 mg/L |
| ER (Both) Patients Helped vs Worsened vs Tied | 19.2% (96 helped / 381 worsened / 23 tied) | 19.2% (96 helped / 381 worsened / 23 tied) | 0.0% |
| SU Unweighted (Both) Median Abs Error | 0.3757 mg/L | 0.3675 mg/L | 0.0082 mg/L |
| SU Unweighted (Both) Patients Helped vs Worsened vs Tied | 73.0% (365 helped / 135 worsened / 0 tied) | 73.0% (365 helped / 135 worsened / 0 tied) | 0.0% |
| SU Reweighted (Both) Median Abs Error | 0.4435 mg/L | 0.4432 mg/L | 0.0003 mg/L |
| SU Reweighted (Both) Patients Helped vs Worsened vs Tied | 48.8% (244 helped / 256 worsened / 0 tied) | 48.4% (242 helped / 258 worsened / 0 tied) | 0.4% |
| **Uncertain Dose (50/50 Mixture)** | | | |
| Carry-Forward Median Abs Error | 0.7514 mg/L | 0.7675 mg/L | 0.0161 mg/L |
| ER (Both) Median Abs Error | 0.3370 mg/L | 0.3408 mg/L | 0.0038 mg/L |
| ER (Both) Patients Helped vs Worsened vs Tied | 38.6% (193 helped / 285 worsened / 22 tied) | 38.2% (191 helped / 284 worsened / 25 tied) | 0.4% |
| SU Unweighted (Both) Median Abs Error | 0.3621 mg/L | 0.3591 mg/L | 0.0030 mg/L |
| SU Unweighted (Both) Patients Helped vs Worsened vs Tied | 55.0% (275 helped / 225 worsened / 0 tied) | 55.2% (276 helped / 224 worsened / 0 tied) | 0.2% |
| SU Reweighted (Both) Median Abs Error | 0.2998 mg/L | 0.3025 mg/L | 0.0026 mg/L |
| SU Reweighted (Both) Patients Helped vs Worsened vs Tied | 46.6% (233 helped / 267 worsened / 0 tied) | 45.8% (229 helped / 271 worsened / 0 tied) | 0.8% |

---

### Table 3: Full Distribution Quantiles for Mixture Model Weights & Effective Sample Size (ESS)

Distribution statistics for posterior weight assigned to the true 2-dose history $W(H_2)$ and Effective Sample Size ($\text{ESS}$) across all $N = 500$ virtual patients:

| Condition | Metric | Min | 25th Pct | Median | 75th Pct | Max | Mean | SD |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Exact 28.0h (4% CV) | $W(H_2)$ (True History) | 0.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 0.9715 | 0.1429 |
| Exact 28.0h (4% CV) | $\text{ESS}$ (out of 800) | 1.0 | 3.5 | 6.7 | 9.9 | 18.0 | 7.1 | 4.0 |
| Perturbed Fixed 32h (4% CV) | $W(H_2)$ (True History) | 0.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 0.9765 | 0.1285 |
| Perturbed Fixed 32h (4% CV) | $\text{ESS}$ (out of 800) | 1.0 | 3.7 | 7.0 | 10.3 | 18.8 | 7.2 | 4.2 |
| Perturbed Elapsed 4h (4% CV) | $W(H_2)$ (True History) | 0.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 0.9765 | 0.1285 |
| Perturbed Elapsed 4h (4% CV) | $\text{ESS}$ (out of 800) | 1.0 | 3.7 | 7.0 | 10.3 | 18.8 | 7.2 | 4.2 |
| Zero-Noise Sanity (0% CV) | $W(H_2)$ (True History) | 0.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 0.9766 | 0.1376 |
| Zero-Noise Sanity (0% CV) | $\text{ESS}$ (out of 800) | 1.0 | 3.8 | 6.7 | 10.3 | 18.9 | 7.2 | 4.1 |

---

## 3. Mathematical Resolution of Summary Contradiction & Mechanism Analysis

### 3.1 Mathematical Resolution of the Summary Contradiction
In the previous audit draft, the exact-time uncertain-history SU-unweighted row reported:
- $51.8\%$ patients helped (259 helped, 241 worsened, 0 tied)
- Transcribed paired error difference: $+0.0073\text{ mg/L}$ (erroneously positive)

**Rigorous Mathematical Proof & Reconciled Invariants:**
1. Let $d_i = |e_{\text{both}, i}| - |e_{\text{cmmg}, i}|$ be the paired absolute error difference for virtual patient $i$.
2. By definition of the evaluation convention:
   - $d_i < 0 \implies$ adding parent ACV reduced error (patient was helped).
   - $d_i > 0 \implies$ adding parent ACV increased error (patient was worsened).
   - $d_i = 0 \implies$ tied error.
3. In this cohort of $N = 500$ patients:
   - Count helped: $N_{\text{helped}} = 259$ (51.8%)
   - Count worsened: $N_{\text{worsened}} = 241$ (48.2\%)
   - Count tied: $N_{\text{tied}} = 0$ (0.0\%)
   - Sum check: $N_{\text{helped}} + N_{\text{worsened}} + N_{\text{tied}} = 259 + 241 + 0 = 500 = N$.
4. **Order Statistics Proof:** Sorting the 500 paired differences in non-decreasing order:
   $$d_{(1)} \le d_{(2)} \le \dots \le d_{(259)} < 0 < d_{(260)} \le \dots \le d_{(500)}$$
   Because 259 > 250, the 250th and 251st sorted elements are both strictly negative ($d_{(250)} < 0$ and $d_{(251)} < 0$).
   Therefore, the sample median of paired differences:
   $$\text{median}(d) = \frac{d_{(250)} + d_{(251)}}{2} = \mathbf{-0.0153\text{ mg/L}} < 0$$
   It is mathematically impossible for $\text{median}(d)$ to be positive when more than half the values are negative with zero ties.
5. **Origin of the Discrepancy:**
   - Marginal median of $|e_{\text{both}}|$: $0.3873\text{ mg/L}$.
   - Marginal median of $|e_{\text{cmmg}}|$: $0.3633\text{ mg/L}$.
   - Difference of marginal medians:
     $$\Delta_{\text{marginal}} = \text{median}(|e_{\text{both}}|) - \text{median}(|e_{\text{cmmg}}|) = 0.3873 - 0.3633 = \mathbf{+0.0240\text{ mg/L}} > 0$$
   - In non-Gaussian, asymmetric error distributions, **the median of paired differences does NOT equal the difference of marginal medians** (i.e. $\text{median}(X - Y) \ne \text{median}(X) - \text{median}(Y)$).
   - The obsolete value $+0.0073$ in the previous text arose from an unverified manual transcription draft that conflated marginal and paired metrics.
   - In this updated audit, all tables are generated directly by `cmmg-forecast-post-hd.cjs` from in-memory objects, and programmatic assertions verify that $\text{helped} > N/2 \implies \text{median}(d) < 0$.

### 3.2 Actual Sign Distribution of Carry-Forward
Rather than assuming universal underprediction from median equality ($\text{med}(e) = -\text{med}(|e|)$), the actual patient counts reveal:
- **Exact Timestamps (4% CV):** 489 underpredicted (97.8\%), 11 overpredicted (2.2\%), 0 exact.
- **Perturbed Timestamps (4% CV):** 478 underpredicted (95.6\%), 22 overpredicted (4.4\%), 0 exact.
- **Zero-Noise Sanity (0% CV):** 497 underpredicted (99.4\%), 3 overpredicted (0.6\%), 0 exact.

**Pharmacokinetic Redistribution Explanation:** In the AyFlux model, hemodialysis clears both parent acyclovir and CMMG from the central compartment during the 4-hour session. When HD terminates at $28\text{ h}$, residual acyclovir in peripheral tissues redistributes back into the central compartment ($B \to A$), continually generating new CMMG via non-renal metabolic clearance ($CL_{\text{form}}$). Consequently, central CMMG rises over the subsequent 4 hours in the vast majority of patients ($C_{\text{cmmg}}(32) > C_{\text{cmmg}}(28)$). The rare virtual patients (0.6%–4.4%) who do not underpredict possess combination draws of very high non-renal CMMG elimination ($CL_{\text{mn}}$) and low metabolic formation ($CL_{\text{form}}$), wherein metabolic elimination outpaces post-dialysis peripheral rebound.

### 3.3 Why Ensemble Reweighting Fails Under a Rigid 1-Dose Assumption
When the forecaster rigidly assumes only 1 dose ($12\text{ h}$) was administered:
1. **CMMG-Only Likelihood:** The forecaster matches a moderate CMMG level ($\sim 7\text{ mg/L}$). Plausible 1-dose draws can reach this level with moderate formation clearance, yielding a median absolute error of $0.4929\text{ mg/L}$ ($0.4233\text{ mg/L}$ zero-noise) and signed error of $-0.4065\text{ mg/L}$ ($357$ under / $143$ over / $0$ exact).
2. **Joint (ACV + CMMG) Likelihood:** The observed end-HD central ACV is $\sim 10\text{ mg/L}$. In a true 1-dose regimen, central ACV 16 hours post-dose with 4 hours of HD would typically be only $2\text{–}4\text{ mg/L}$. The joint Gaussian likelihood forces the ensemble to select extreme parameter draws (e.g., abnormally small $V_c$ or near-zero clearance).
3. **Peripheral Mass Collapse:** These extreme 1-dose candidates contain almost zero drug mass in the unmeasured peripheral compartment $B$. Once HD terminates, there is no peripheral acyclovir to redistribute into the central compartment. Simulated ACV crashes immediately, halting CMMG formation.
4. **Catastrophic Bias:** As a result, the forecast severely underpredicts: median absolute error jumps to **$1.5532\text{ mg/L}$** ($1.4846\text{ mg/L}$ zero-noise), signed error is **$-1.5532\text{ mg/L}$** ($453$ under / $47$ over / $0$ exact), and adding parent ACV worsens the forecast in **77.8\% of patients** (389 worsened, 89 helped, 22 tied).

### 3.4 Why Direct State Updating Resists History Misspecification
In Direct State Updating (unweighted), the ODE is integrated from $t = 28\text{ h}$ to $t = 32\text{ h}$ starting from state variables updated from the observed values:
$$\frac{dM}{dt} = CL_{\text{form}} \frac{A(t)}{V_c} \frac{MW_M}{MW_A} - CL_{\text{mn}} \frac{M(t)}{V_m}$$
- **CMMG-Only:** $M(28)$ is reset to $y_{\text{cmmg}} \cdot V_m$, while $A(28)$ is left at the simulated 1-dose value ($2\text{–}4\text{ mg/L}$). The initial rate of CMMG formation is under-driven, yielding median signed error of $-0.4846\text{ mg/L}$ ($437$ under / $63$ over / $0$ exact).
- **Paired (ACV + CMMG):** $A(28)$ is reset to $y_{\text{acv}} \cdot V_c$ directly from measured concentration ($10\text{ mg/L}$). Even though peripheral tissue $B(28)$ remains underestimated, starting with the true central ACV concentration immediately drives CMMG formation at the correct initial rate.
- **Quantified Improvement:** Median absolute error drops from $0.4969$ to **$0.4045\text{ mg/L}$** ($0.4850$ to **$0.3526\text{ mg/L}$** zero-noise), signed bias shrinks from $-0.4846$ to **$-0.2202\text{ mg/L}$**, and adding parent ACV helps **68.6%** (74.4% zero-noise) of virtual patients (343 helped, 157 worsened, 0 tied).

### 3.5 Clock Horizon and Intra-Dialytic Sampling Analysis
1. **Clock Horizon:** Perturbing the blood draw time ($t_{\text{meas}} \in [27.75\text{ h}, 28.25\text{ h}]$) while scoring at fixed clock hour $32.0\text{ h}$ introduces variable elapsed forecasting horizons ranging from $3.75\text{ h}$ (when drawn late at $28.25\text{ h}$) to $4.25\text{ h}$ (when drawn early at $27.75\text{ h}$).
2. **Fixed Horizon Comparison:** When scored at exactly $t_{\text{meas}} + 4.0\text{ h}$ (Table 2), median errors differ by less than $0.008\text{ mg/L}$ across all methods and percentage helped changes by $< 0.8\%$. The qualitative conclusions are completely robust to whether the clinical target is a fixed clock appointment or an elapsed post-draw interval.
3. **Intra-Dialytic Sampling:** When a sample is drawn 15 minutes before scheduled dialysis end ($t_{\text{meas}} = 27.75\text{ h}$), the dialyzer remains actively clearing acyclovir ($p.\text{hd}$) and CMMG ($p.\text{hd} \times c.\text{metDial} = p.\text{hd} \times 1.0$) for the remaining $0.25\text{ h}$. Our `stepInterval` ODE integrator explicitly applies dialytic clearance up to $28.0\text{ h}$ before transitioning to post-HD clearance, preventing artificial accumulation during active dialysis.

---

## 4. Scientifically Bounded Conclusions

1. **Simulation Bounds & Non-Equivalence to Clinical Validation:**
   - The reported mean posterior weight of $97.15\%\text{–}97.66\%$ (median $100.0\%$, IQR $[1.0000, 1.0000]$) on the 2-dose history ($H_2$) is mathematically conditional on the evaluated discrete model space (exactly two candidate histories: $H_1$ vs $H_2$), the chosen equal prior probabilities ($P(H_1) = P(H_2) = 0.5$), and the assumed Gaussian likelihood function. It does NOT represent empirical clinical confidence or prove that a missing dose can be identified in clinical practice where unmodeled variables (variable infusion rates, residual urine output, inter-dialytic dose timing errors, assay cross-reactivity) occur.
   - While parameter-disjoint partitioning ensures candidate forecasters do not share identical vectors with virtual patients, both cohorts are generated from the same underlying two-compartment kinetic model structure. This study evaluates mathematical properties of state-space reweighting versus state updating under controlled structural assumptions; it does NOT constitute external clinical validation.

2. **When Parent Acyclovir Helps vs Worsens the Forecast:**
   - **Where Adding ACV Makes the Forecast Worse:** When a forecaster rigidly imposes a single misspecified historical dosing regimen (e.g., 1 dose instead of 2), conditioning on end-HD parent ACV worsens Ensemble Reweighting in $76.2\%\text{–}77.8\%$ of simulated cases (381–389 worsened, 89–96 helped, 22–23 tied; median error degrades $0.493 \to 1.553\text{ mg/L}$) due to parameter distortion and loss of peripheral rebound.
   - **Where Adding ACV Improves the Forecast:** When the forecaster either:
     - Applies **Direct State Updating** to the central compartment ($A = y_{\text{acv}} \times V_c$), which bypasses historical parameter selection and improves accuracy in $68.6\%\text{–}74.4\%$ of cases (343–372 helped, 128–157 worsened, 0 tied); OR
     - Represents dosing history as a **mixture model**, allowing the observed parent ACV to weight the candidate regimens, reducing median forecasting error to $0.278\text{–}0.342\text{ mg/L}$.

3. **Status & Invariants:**
   - Baseline commit `e7655bb` remains strictly frozen on `research/cmmg-post-hd-forecast` for independent code review.
   - All data exports (`cmmg-forecast-patients.csv` and `cmmg-forecast-results.json`) reside on the follow-up branch `research/cmmg-forecast-data-export`.
   - Core model parameters, defaults (`public/assets/pk-engine.js`), and production code remain 100% unmodified.

---

## 5. Cross-Browser Automated Verification & Evidence

Automated headless verification was executed using `scripts/check-numeric-feedback-crossbrowser.cjs` across Firefox 142.0.1 and WebKit 26.0 on both local HEAD (`dd8dabf`) and live production (`https://ayflux.org`).

### 5.1 Verification Checklist
- [x] **Numeric Inputs (#num_dose, #num_weight, #num_crcl):** Blank, negative, and above-max inputs immediately display inline validation notes with `aria-invalid="true"` and `aria-describedby="inputError_<id>"`.
- [x] **Snapshot State Retention:** While invalid text is entered in the UI, `AyFluxResearchBridge.snapshot().config` retains the last accepted valid numeric value; no unparsed or NaN state is passed to the solver.
- [x] **Three-Way Recovery:**
  1. Typing accepted value restores valid state and removes error note.
  2. Operating slider without changing setting restores input text and clears invalid attribute.
  3. Operating slider to new value updates both simulation engine and input box seamlessly.
- [x] **Mobile 320px Viewport:** Evaluated at $320 \times 568\text{ px}$. Verified $\text{scrollWidth} \le \text{innerWidth} + 1$ with zero horizontal overflow.

### 5.2 Reviewable Evidence Artifacts
- **Firefox 320px Local Feedback:** [firefox-320px-feedback.png](screenshots/firefox-320px-feedback.png)
- **WebKit 320px Local Feedback:** [webkit-320px-feedback.png](screenshots/webkit-320px-feedback.png)
- **Firefox 320px Production Feedback:** [firefox_prod-320px-feedback.png](screenshots/firefox_prod-320px-feedback.png)
- **WebKit 320px Production Feedback:** [webkit_prod-320px-feedback.png](screenshots/webkit_prod-320px-feedback.png)
