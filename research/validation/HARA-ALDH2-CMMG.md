# Hara Figure 3 CMMG Accumulation & Google ALDH2 Model Evaluation

**Reference:** Hara K, Suyama K, Itoh H, Nagashima S. *Drug Metab Pharmacokinet.* 2008; 23(5): 306–312. doi:[10.2133/dmpk.23.306](https://doi.org/10.2133/dmpk.23.306).  
**Source Dataset:** Figure 3 (Mean ± SD serum CMMG concentration–time curves across `ALDH2 *1/*1`, `*1/*2`, and `*2/*2` groups, $n=6$ per group, following a single oral dose of 1,000 mg valacyclovir in anuric hemodialysis patients).  
**Model Tested:** Google Hypothesis Reversible-Redundant ALDH2 Kinetic Architecture (`idea_report_4080292048723247105.pdf`, Pages 4–6).  
**Reproduction Script:** `node research/validation/hara-aldh2-cmmg.cjs`  
**Vector Overlay:** [hara-aldh2-overlay.svg](hara-aldh2-overlay.svg)  
**Audited Engine Blob Hash:** `17971df66e0a97b4d382572a582d35c444a3c83f` (`public/assets/pk-engine.js`, frozen).  

---

## 1. Scientific Background & Question

AyFlux previously examined the parent acyclovir terminal half-lives across ALDH2 genotype groups in [PR #151](https://github.com/khalilm3264/acyclovirpksim/pull/151) / [`hara-genotype-terminal.cjs`](hara-genotype-terminal.cjs). While Hara reported an allele-associated increase in parent terminal half-life ($18.1 \pm 4.1\text{ h}$ in `*1/*1` $\to 21.9 \pm 3.2\text{ h}$ in `*1/*2` $\to 26.7 \pm 4.0\text{ h}$ in `*2/*2`, $p = 0.005$), the authors found no statistically significant relationship between ALDH2 genotype and parent $\text{AUC}_{0\text{--}\infty}$ ($p = 0.350$) or CMMG pharmacokinetics.

Google's proposed ALDH2 architecture (`idea_report_4080292048723247105.pdf`) attempts to resolve this pharmacogenomic question by coupling:
1. Reversible oxidation of acyclovir to an unmeasured intermediate acyclovir aldehyde via cytosolic ADH1A ($k_{\text{fwd}} = 0.1203\text{ h}^{-1}$, $k_{\text{rev}} = 0.1965\text{ h}^{-1}$).
2. Irreversible parallel oxidation of the aldehyde to CMMG catalyzed by mitochondrial ALDH2 ($k_{\text{aldh2}} = 4.0049\text{ h}^{-1}$ for `*1/*1`, $0.4005\text{ h}^{-1}$ for `*1/*2`, $0.0400\text{ h}^{-1}$ for `*2/*2`) and redundant cytosolic aldehyde dehydrogenases ($k_{\text{aldh,red}} = 0.2962\text{ h}^{-1}$, e.g. ALDH1A1/B1).

Because this reversible-redundant cascade was calibrated *post hoc* against the parent acyclovir half-lives, the critical test of its physical validity is whether its metabolite equations predict the rate, timing, and genotype ordering of serum CMMG accumulation observed in Hara's Figure 3.

---

## 2. Digitization of Hara Figure 3 & Uncertainty Quantification

Figure 3 was extracted from page 309 of the primary article at native resolution ($988 \times 809\text{ pixels}$). The plot bounding box spans $x \in [116, 984]$ and $y \in [59.5, 642.5]$.  
The Y-axis ticks ($0, 2, 4, 6, 8, 10, 12, 14\ \mu\text{g/mL}$) exhibit a linear spacing of $41.643\text{ pixels/}(\mu\text{g/mL})$.  
The X-axis ticks ($0, 1, 2, 3, 4, 6, 8, 12, 24, 44, 48\text{ h}$) follow a linear scale with $16.35\text{ pixels/hour}$ ($x(t) = 165.5 + 16.35 \times t$).

### Digitized Values Across All Sampling Hours

Concentrations are reported as mean $[\mu\text{g/mL}]$ and converted to $[\mu\text{mol/L}]$ using $MW_{\text{CMMG}} = 239.19\text{ g/mol}$ ($1\ \mu\text{g/mL} = 4.1808\ \mu\text{mol/L}$):

| Time (h) | ALDH2 *1/*1 (Closed Circle) [µg/mL] | ALDH2 *1/*2 (Opened Circle) [µg/mL] | ALDH2 *2/*2 (Opened Triangle) [µg/mL] | Visual Clarity & Ambiguity Notes |
|:---:|:---:|:---:|:---:|:---|
| **0** | 0.00 [0.0] | 0.00 [0.0] | 0.00 [0.0] | Pre-dose baseline; all 3 markers coincide at origin. |
| **1** | 0.22 [0.9] | 0.18 [0.8] | 0.15 [0.6] | **Ambiguous**: markers heavily overlap near detection threshold (<0.3 µg/mL). |
| **2** | 1.91 [8.0] | 1.40 [5.9] | 1.02 [4.3] | Markers separate; initial slope ordering *1/*1 > *1/*2 > *2/*2 begins. |
| **3** | 3.17 [13.3] | 2.29 [9.6] | 1.63 [6.8] | Clear vertical separation; SD bars overlap. |
| **4** | 4.27 [17.9] | 3.06 [12.8] | 2.25 [9.4] | Rapid initial rise in *1/*1. |
| **6** | 4.44 [18.6] | 3.66 [15.3] | 3.11 [13.0] | SD bars reach 6.1 (*1/*1), 4.9 (*1/*2), 4.1 (*2/*2) µg/mL. |
| **8** | 5.19 [21.7] | 4.35 [18.2] | 3.84 [16.1] | Ordering *1/*1 > *1/*2 > *2/*2 maintained through 8 h. |
| **12** | 5.70 [23.8] | 5.18 [21.7] | 4.50 [18.8] | Difference between *1/*1 and *1/*2 begins narrowing. |
| **24** | **7.13 ± 0.05** [29.8] | **7.83 ± 0.05** [32.7] | **5.94 ± 0.09** [24.8] | **Ordering Inversion**: *1/*2 crosses above *1/*1. SD up to 11.5 µg/mL. |
| **44** | **6.60 ± 0.05** [27.6] | **8.52 ± 0.05** [35.6] | **5.92 ± 0.09** [24.8] | *1/*2 remains highest; *1/*1 plateaus/declines; *2/*2 flat. |
| **48** | **6.51 ± 0.05** [27.2] | **8.69 ± 0.05** [36.3] | **5.92 ± 0.09** [24.8] | Pre-dialysis draw. Ordering: *1/*2 > *1/*1 > *2/*2. SD reaches 13.1 µg/mL. |

### Digitization Uncertainty at Key Hours (24, 44, 48 h)
Extraction uncertainty was evaluated by repeating the centroid and boundary pixel analysis:
- **`*1/*1` (closed circle):** Center pixel determined by horizontal and vertical diameter symmetry. Bounded by $\pm 2\text{ px}$ ($\pm 0.05\ \mu\text{g/mL}$).
- **`*1/*2` (opened circle):** Center determined by inner white lumen and outer ring bounds ($y_{\text{center}} = (y_{\text{top}} + y_{\text{bottom}})/2$). Uncertainty is $\pm 2\text{ px}$ ($\pm 0.05\ \mu\text{g/mL}$).
- **`*2/*2` (opened triangle):** Triangle geometry was assessed using both geometric centroid ($y_{\text{apex}} + \frac{2}{3} h$) and midpoint of height ($(y_{\text{apex}} + y_{\text{base}})/2$). The height is $15\text{ px}$ ($0.36\ \mu\text{g/mL}$ total span); centroid estimation yields $5.92\text{--}5.94\ \mu\text{g/mL}$ with an uncertainty of $\pm 0.09\ \mu\text{g/mL}$.

---

## 3. Implementation Check: Google ALDH2 Model AUCs

Simulating Google's equations using the unadjusted specification:
- Dose: 1,000 mg oral valacyclovir base ($3,083.18\ \mu\text{mol}$).
- Reference fat-free mass: $55\text{ kg}$.
- Clearances: $CL_R^A = 0$, $CL_R^M = 0$, $CL_{\text{dial}} = 0$ (pre-dialysis), $CL_{\text{other}}^A = 0.05\text{ L/h}$, $CL_{\text{nr},M} = 0.12\text{ L/h}$.
- Volumes & Transfer: $V_{1,A} = 14.5\text{ L}$, $V_{2,A} = 28.5\text{ L}$, $Q_A = 18.0\text{ L/h}$; $V_{1,M} = 15.0\text{ L}$, $V_{2,M} = 30.0\text{ L}$, $Q_M = 15.0\text{ L/h}$.
- Absorption: $F_{\text{oral}} = 0.545$, $k_a = 0.95\text{ h}^{-1}$.
- Cascade constants: $k_{\text{fwd}} = 0.1203\text{ h}^{-1}$, $k_{\text{rev}} = 0.1965\text{ h}^{-1}$, $k_{\text{aldh,red}} = 0.2962\text{ h}^{-1}$.
- Genotype $k_{\text{aldh2}}$: `*1/*1`: $4.0049\text{ h}^{-1}$; `*1/*2`: $0.4005\text{ h}^{-1}$; `*2/*2`: $0.0400\text{ h}^{-1}$.

### 48-Hour CMMG Cumulative Exposure ($\text{AUC}_{0\text{--}48\text{h}}$) Implementation Check:

| ALDH2 Genotype | Implementation Target ($\mu\text{mol}\cdot\text{h/L}$) | Simulated ($\mu\text{mol}\cdot\text{h/L}$) | Concordance |
|:---|:---:|:---:|:---:|
| **`*1/*1`** | **928.5** | **928.5** | Exact ($\Delta < 0.05$) |
| **`*1/*2`** | **800.4** | **800.4** | Exact ($\Delta < 0.05$) |
| **`*2/*2`** | **675.4** | **675.4** | Exact ($\Delta < 0.05$) |

Numerical convergence was confirmed: halving the integration step from $dt = 0.0005\text{ h}$ to $0.00025\text{ h}$ moved each AUC by $< 0.01\%$.

---

## 4. Observed vs. Predicted Concentrations at 24, 44, and 48 Hours

The table below reports observed concentrations (mean ± digitization uncertainty), Google model predictions, signed errors ($\text{Predicted} - \text{Observed}$), and relative percentage errors:

| Hour | Genotype | Observed CMMG (µg/mL) | Predicted CMMG (µg/mL) | Signed Error (µg/mL) | Observed CMMG (µmol/L) | Predicted CMMG (µmol/L) | Signed Error (µmol/L) | Relative Error (%) |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **24** | `*1/*1` | 7.13 ± 0.05 | 5.15 | **−1.98** | 29.81 | 21.54 | **−8.27** | −27.7% |
| **24** | `*1/*2` | 7.83 ± 0.05 | 4.42 | **−3.41** | 32.74 | 18.47 | **−14.26** | −43.6% |
| **24** | `*2/*2` | 5.94 ± 0.09 | 3.69 | **−2.25** | 24.83 | 15.43 | **−9.40** | −37.9% |
| **44** | `*1/*1` | 6.60 ± 0.05 | 6.59 | **−0.01** | 27.59 | 27.56 | **−0.03** | −0.1% |
| **44** | `*1/*2` | 8.52 ± 0.05 | 6.00 | **−2.52** | 35.62 | 25.10 | **−10.52** | −29.5% |
| **44** | `*2/*2` | 5.92 ± 0.09 | 5.31 | **−0.61** | 24.75 | 22.21 | **−2.54** | −10.3% |
| **48** | `*1/*1` | 6.51 ± 0.05 | 6.74 | **+0.23** | 27.22 | 28.18 | **+0.96** | +3.5% |
| **48** | `*1/*2` | 8.69 ± 0.05 | 6.19 | **−2.50** | 36.33 | 25.88 | **−10.45** | −28.8% |
| **48** | `*2/*2` | 5.92 ± 0.09 | 5.53 | **−0.39** | 24.75 | 23.11 | **−1.64** | −6.6% |

---

## 5. Critical Findings & Mechanistic Evaluation

### 1. Inversion of Genotype Ordering
- **Model Prediction:** By coupling biotransformation directly to ALDH2 catalytic activity, Google's model predicts that CMMG concentrations must strictly follow the enzyme activity hierarchy at all times:
  $$\text{ALDH2 } *1/*1 > *1/*2 > *2/*2$$
- **Clinical Observation:** In Hara's Figure 3, the observed ranking at 24, 44, and 48 hours is:
  $$\text{ALDH2 } *1/*2 > *1/*1 > *2/*2$$
  The heterozygous group (`*1/*2`) exhibits the **highest** mean serum CMMG concentration ($8.52\text{--}8.69\ \mu\text{g/mL}$), exceeding wild-type `*1/*1` ($6.51\text{--}6.60\ \mu\text{g/mL}$) by over $30\%$. Table 2 confirms that observed CMMG $C_{\max}$ was highest in `*1/*2` ($8.75 \pm 4.31\ \mu\text{g/mL}$) vs. `*1/*1` ($7.44 \pm 2.79\ \mu\text{g/mL}$) and `*2/*2` ($6.22 \pm 2.29\ \mu\text{g/mL}$).
- **Mechanism Failure:** The mathematical model cannot generate higher metabolite concentrations in the intermediate-activity heterozygote without invoking unphysiological mechanisms (e.g. inverted bioavailability or altered distribution volumes).

### 2. Discrepancy in the Timing of Accumulation
- **In Vivo Dynamics:** In clinical patients, serum CMMG rises rapidly in the first 24 hours, approaching its plateau ($C_{\max}$) between 24 and 48 hours (median $t_{\max} = 24.0\text{ h}$ for `*1/*1` and `*2/*2`, $48.0\text{ h}$ for `*1/*2`). Between 24 and 48 hours, `*1/*1` concentrations actually decline slightly (from $7.13$ to $6.51\ \mu\text{g/mL}$), and `*2/*2` remains flat at $5.92\ \mu\text{g/mL}$.
- **In Silico Dynamics:** The Google model accumulates metabolite far too slowly over the first 24 hours (predicting only $3.69\text{--}5.15\ \mu\text{g/mL}$, underpredicting by $28\%\text{--}44\%$). The model then continues to climb steadily through 48 hours ($5.53\text{--}6.74\ \mu\text{g/mL}$), missing the rapid early formation and subsequent plateau seen in ESRD patients.

### 3. Failure of Cumulative Exposure Invariance
- Google's proposal claimed that the reversible-redundant cascade preserves cumulative CMMG exposure across genotypes within $\pm 15\%$.
- However, as shown by numerical integration of the author's own equations, the 48-hour CMMG exposure in `*2/*2` ($675.4\ \mu\text{mol}\cdot\text{h/L}$) drops by **$27.3\%$** relative to `*1/*1` ($928.5\ \mu\text{mol}\cdot\text{h/L}$).
- In clinical ESRD, high-efficiency hemodialysis initiated at 48 hours removes $77.6\%$ of circulating CMMG and $69.4\%$ of parent drug. The large fraction of parent drug remaining unconverted in `*2/*2` patients at 48 hours ($28.7\%$ of total dose) would be permanently extracted by dialysis before it can ever form CMMG, permanently depressing cumulative metabolite exposure in mutant homozygotes.

### 4. Overlapping SD Bars & Interindividual Variance
- As Hara noted on page 310, while the early slope ($t \le 12\text{ h}$) visually ranks `*1/*1` > `*1/*2` > `*2/*2`, the standard deviation bars overlap extensively across all three groups at every time point (SD spans up to $\pm 4.3\ \mu\text{g/mL}$).
- The authors concluded that late-phase CMMG concentrations reflect individual patient distribution volume and absorption characteristics rather than ALDH2 polymorphism.

---

## 6. Decision Verdict on Mechanism

> **Decision:** **Do NOT adopt the Google ALDH2 reversible-redundant mechanism into the AyFlux engine.**

1. **Metabolite Predictions Invalidate the Mechanism:** The hypothesis was constructed by tuning microscopic constants to fit macroscopic parent acyclovir half-lives ($18.1 \to 21.9 \to 26.7\text{ h}$). When tested blindly against the metabolite time course, the model fails on genotype ordering (`*1/*2` is highest in vivo), fails on accumulation timing (too sluggish in the first 24 h), and violates clinical exposure bioequivalence (a $27.3\%$ exposure collapse in `*2/*2`).
2. **Lack of Empirical Identifiability:** Without direct experimental measurements of acyclovir aldehyde in human hepatocytes, the microscopic rate constants ($k_{\text{fwd}}, k_{\text{rev}}, k_{\text{aldh,red}}, k_{\text{aldh2}}$) remain structurally unidentifiable.
3. **AyFlux Invariant Preserved:** AyFlux's frozen core engine (`17971df...`) correctly holds model parameters constant and treats ALDH2-associated half-life variance as an unmodeled source of interindividual variability, consistent with Hara's conclusion.

---

## 7. Verification Commands

```sh
# Run standalone comparison script and generate overlay SVG
node research/validation/hara-aldh2-cmmg.cjs

# Run complete regression test suite
npm test
```
