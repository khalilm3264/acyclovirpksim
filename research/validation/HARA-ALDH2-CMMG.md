# Hara Figure 3 CMMG Accumulation & Google ALDH2 Model Evaluation

**Reference:** Hara K, Suyama K, Itoh H, Nagashima S. *Drug Metab Pharmacokinet.* 2008; 23(5): 306–312. doi:[10.2133/dmpk.23.306](https://doi.org/10.2133/dmpk.23.306).  
**Source Dataset:** Figure 3 (Mean ± SD serum CMMG concentration–time curves across `ALDH2 *1/*1`, `*1/*2`, and `*2/*2` groups, $n=6$ per group, following a single oral dose of 1,000 mg valacyclovir in anuric hemodialysis patients; printed page 309).  
**Model Tested:** Google Hypothesis Reversible-Redundant ALDH2 Kinetic Architecture (`idea_report_4080292048723247105.pdf`, Pages 4–6).  
**Reproduction Script:** `node research/validation/hara-aldh2-cmmg.cjs`  
**Vector Overlay:** [hara-aldh2-overlay.svg](hara-aldh2-overlay.svg)  
**Audited Engine Blob Hash:** `17971df66e0a97b4d382572a582d35c444a3c83f` (`public/assets/pk-engine.js`, frozen).  

---

## 1. Scientific Context & Question

AyFlux previously examined parent acyclovir terminal half-lives across ALDH2 genotype groups in [PR #151](https://github.com/khalilm3264/acyclovirpksim/pull/151) / [`hara-genotype-terminal.cjs`](hara-genotype-terminal.cjs). Hara reported an allele-associated increase in parent terminal half-life ($18.1 \pm 4.1\text{ h}$ in `*1/*1` $\to 21.9 \pm 3.2\text{ h}$ in `*1/*2` $\to 26.7 \pm 4.0\text{ h}$ in `*2/*2`, $p = 0.005$).

Google proposed a kinetic cascade (`idea_report_4080292048723247105.pdf`) coupling:
1. Reversible oxidation of acyclovir to an unmeasured acyclovir aldehyde via cytosolic ADH1A ($k_{\text{fwd}} = 0.1203\text{ h}^{-1}$, $k_{\text{rev}} = 0.1965\text{ h}^{-1}$).
2. Parallel irreversible oxidation to CMMG via mitochondrial ALDH2 ($k_{\text{aldh2}} = 4.0049\text{ h}^{-1}$ for `*1/*1`, $0.4005\text{ h}^{-1}$ for `*1/*2`, $0.0400\text{ h}^{-1}$ for `*2/*2`) and redundant cytosolic aldehyde dehydrogenases ($k_{\text{aldh,red}} = 0.2962\text{ h}^{-1}$).

Because this cascade was tuned *post hoc* against macroscopic parent acyclovir half-lives, this evaluation tests whether its metabolite equations predict the rate, timing, and genotype ordering of serum CMMG accumulation observed in Hara's Figure 3, and whether it satisfies the author's own 15% cumulative exposure equivalence criterion.

---

## 2. Digitization of Hara Figure 3 & Coordinate Calibration

Figure 3 was extracted from page 309 of the primary article at native resolution ($988 \times 809\text{ pixels}$).

### Axis Calibration
- **Y-axis:**
  - $0\ \mu\text{g/mL}$ tick line: $y = 748.5\text{ px}$
  - $14\ \mu\text{g/mL}$ tick line: $y = 165.5\text{ px}$
  - Linear vertical scale: $\frac{748.5 - 165.5}{14.0} = 41.64286\text{ pixels/}(\mu\text{g/mL})$
  - Conversion formula: $C\ [\mu\text{g/mL}] = \frac{748.5 - y}{41.64286}$
- **X-axis:**
  - $0\text{ h}$ tick line: $x = 164.5\text{ px}$
  - $48\text{ h}$ tick line: $x = 951.7\text{ px}$
  - Linear horizontal scale: $\frac{951.7 - 164.5}{48.0} = 16.399\text{ pixels/hour}$

### Raw Marker Coordinates and Repeated Extractions (24, 44, and 48 Hours)
Each mean marker at 24, 44, and 48 hours was extracted across two independent readings:
- **Reading 1:** Outer feature / bounding envelope extraction.
- **Reading 2:** Visual centroid / inner lumen extraction.

| Hour | Genotype (Marker) | Reading 1 Raw ($y\text{ px}$) | Reading 1 ($C\ \mu\text{g/mL}$) | Reading 2 Raw ($y\text{ px}$) | Reading 2 ($C\ \mu\text{g/mL}$) | Reading Diff ($\Delta$) | Reported Mean $\pm$ Range ($\mu\text{g/mL}$) |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **24** | `*1/*1` (closed circle) | 451.6 | 7.13 | 463.0 | 6.86 | 0.27 | **$7.13 \pm 0.27$** |
| **24** | `*1/*2` (open circle) | 422.4 | 7.83 | 436.2 | 7.50 | 0.33 | **$7.83 \pm 0.33$** |
| **24** | `*2/*2` (open triangle) | 501.0 | 5.94 | 502.5 | 5.91 | 0.03 | **$5.94 \pm 0.03$** |
| **44** | `*1/*1` (closed circle) | 473.6 | 6.60 | 474.5 | 6.58 | 0.02 | **$6.60 \pm 0.02$** |
| **44** | `*1/*2` (open circle) | 393.7 | 8.52 | 395.4 | 8.48 | 0.04 | **$8.52 \pm 0.04$** |
| **44** | `*2/*2` (open triangle) | 502.0 | 5.92 | 502.8 | 5.90 | 0.02 | **$5.92 \pm 0.02$** |
| **48** | `*1/*1` (closed circle) | 477.4 | 6.51 | 478.2 | 6.49 | 0.02 | **$6.51 \pm 0.02$** |
| **48** | `*1/*2` (open circle) | 386.6 | 8.69 | 388.3 | 8.65 | 0.04 | **$8.69 \pm 0.04$** |
| **48** | `*2/*2` (open triangle) | 502.0 | 5.92 | 503.7 | 5.88 | 0.04 | **$5.92 \pm 0.04$** |

### Directional Standard Deviation (SD) Endpoints
SD bars in Figure 3 were plotted directionally:
- **Early points ($2\text{--}12\text{ h}$):** Upper SD bars are published and visible (reaching up to $7.8\ \mu\text{g/mL}$ in `*1/*1`, $7.5\ \mu\text{g/mL}$ in `*1/*2`, and $5.2\ \mu\text{g/mL}$ in `*2/*2`).
- **Late points ($24\text{--}48\text{ h}$):**
  - `*1/*2` exhibits prominent upper SD bars reaching $11.5\ \mu\text{g/mL}$ (24 h), $12.7\ \mu\text{g/mL}$ (44 h), and $13.1\ \mu\text{g/mL}$ (48 h).
  - `*1/*1` exhibits downward-extending SD bars with caps at $4.02\ \mu\text{g/mL}$ (24 h), $4.57\ \mu\text{g/mL}$ (44 h), and $4.67\ \mu\text{g/mL}$ (48 h).
  - `*2/*2` exhibits downward-extending SD bars with caps at $2.46\ \mu\text{g/mL}$ (24 h), $1.28\ \mu\text{g/mL}$ (44 h), and $0.90\ \mu\text{g/mL}$ (48 h).
- **Unreadable / Obscured Endpoints:** Left unplotted (`null`).
- **Unresolvable Early Ordering ($0\text{--}1\text{ h}$):** At $0\text{ h}$, all three groups coincide at origin ($0.0\ \mu\text{g/mL}$). At $1\text{ h}$, all markers lie clustered below $0.25\ \mu\text{g/mL}$ with overlapping line segments; the figure cannot resolve an empirical genotype ordering at $1\text{ h}$. Genotype-specific percentage errors are omitted for hours 0 and 1.

---

## 3. Implementation Check: Google ALDH2 Model AUCs & Concentrations

Simulating Google's equations using the unadjusted specification:
- Dose: 1,000 mg oral valacyclovir base ($3{,}083.18\ \mu\text{mol}$).
- Reference fat-free mass: $55\text{ kg}$.
- Clearances: $CL_R^A = 0$, $CL_R^M = 0$, $CL_{\text{dial}} = 0$ (pre-dialysis), $CL_{\text{other}}^A = 0.05\text{ L/h}$, $CL_{\text{nr},M} = 0.12\text{ L/h}$.
- Volumes & Transfer: $V_{1,A} = 14.5\text{ L}$, $V_{2,A} = 28.5\text{ L}$, $Q_A = 18.0\text{ L/h}$; $V_{1,M} = 15.0\text{ L}$, $V_{2,M} = 30.0\text{ L}$, $Q_M = 15.0\text{ L/h}$.
- Absorption: $F_{\text{oral}} = 0.545$, $k_a = 0.95\text{ h}^{-1}$.
- Cascade constants: $k_{\text{fwd}} = 0.1203\text{ h}^{-1}$, $k_{\text{rev}} = 0.1965\text{ h}^{-1}$, $k_{\text{aldh,red}} = 0.2962\text{ h}^{-1}$.
- Genotype $k_{\text{aldh2}}$: `*1/*1`: $4.0049\text{ h}^{-1}$; `*1/*2`: $0.4005\text{ h}^{-1}$; `*2/*2`: $0.0400\text{ h}^{-1}$.

### Numerical Verification Checks
1. **Target 48-Hour CMMG Cumulative Exposure ($\text{AUC}_{0\text{--}48\text{h}}$):**
   - `*1/*1`: **$928.5\ \mu\text{mol}\cdot\text{h/L}$** (target: $928.5$)
   - `*1/*2`: **$800.4\ \mu\text{mol}\cdot\text{h/L}$** (target: $800.4$)
   - `*2/*2`: **$675.4\ \mu\text{mol}\cdot\text{h/L}$** (target: $675.4$)
2. **Predicted 48-Hour CMMG Concentrations:**
   - `*1/*1`: **$6.74\text{ mg/L}$** ($28.18\ \mu\text{mol/L}$)
   - `*1/*2`: **$6.19\text{ mg/L}$** ($25.88\ \mu\text{mol/L}$)
   - `*2/*2`: **$5.53\text{ mg/L}$** ($23.11\ \mu\text{mol/L}$)
3. **Predicted 12-Hour CMMG Concentrations:**
   - `*1/*1`: **$3.37\text{ mg/L}$** ($14.10\ \mu\text{mol/L}$)
   - `*1/*2`: **$2.70\text{ mg/L}$** ($11.29\ \mu\text{mol/L}$)
   - `*2/*2`: **$2.12\text{ mg/L}$** ($8.85\ \mu\text{mol/L}$)

---

## 4. Observed vs. Predicted Concentration Tables

### Key Hours (24, 44, and 48 Hours)

| Hour | Genotype | Observed CMMG ($\mu\text{g/mL}$) | Predicted CMMG ($\mu\text{g/mL}$) | Signed Error ($\mu\text{g/mL}$) | Observed CMMG ($\mu\text{mol/L}$) | Predicted CMMG ($\mu\text{mol/L}$) | Signed Error ($\mu\text{mol/L}$) | Relative Error (%) |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **24** | `*1/*1` | 7.13 ± 0.27 | 5.15 | **−1.98** | 29.81 | 21.54 | **−8.27** | −27.7% |
| **24** | `*1/*2` | 7.83 ± 0.33 | 4.42 | **−3.41** | 32.74 | 18.47 | **−14.26** | −43.6% |
| **24** | `*2/*2` | 5.94 ± 0.03 | 3.69 | **−2.25** | 24.83 | 15.43 | **−9.40** | −37.9% |
| **44** | `*1/*1` | 6.60 ± 0.02 | 6.59 | **−0.01** | 27.59 | 27.56 | **−0.03** | −0.1% |
| **44** | `*1/*2` | 8.52 ± 0.04 | 6.00 | **−2.52** | 35.62 | 25.10 | **−10.52** | −29.5% |
| **44** | `*2/*2` | 5.92 ± 0.02 | 5.31 | **−0.61** | 24.75 | 22.21 | **−2.54** | −10.3% |
| **48** | `*1/*1` | 6.51 ± 0.02 | 6.74 | **+0.23** | 27.22 | 28.18 | **+0.96** | +3.5% |
| **48** | `*1/*2` | 8.69 ± 0.04 | 6.19 | **−2.50** | 36.33 | 25.88 | **−10.45** | −28.8% |
| **48** | `*2/*2` | 5.92 ± 0.04 | 5.53 | **−0.39** | 24.75 | 23.11 | **−1.64** | −6.6% |

*(Note: If 24 h `*1/*2` is taken at Reading 2, $7.50\ \mu\text{g/mL}$, the signed error is $-3.08\ \mu\text{g/mL}$, $-41.1\%$; if `*1/*1` is taken at Reading 2, $6.86\ \mu\text{g/mL}$, the signed error is $-1.71\ \mu\text{g/mL}$, $-24.9\%$. In both readings, `*1/*2` is visibly highest).*

### Full 11-Point Time Course (0 to 48 Hours)

All predictions and signed errors generated directly from `simulateGoogleAldh2`:

| Hour | Genotype | Observed CMMG ($\mu\text{g/mL}$) | Predicted CMMG ($\mu\text{g/mL}$) | Signed Error ($\mu\text{g/mL}$) | Observed CMMG ($\mu\text{mol/L}$) | Predicted CMMG ($\mu\text{mol/L}$) | Signed Error ($\mu\text{mol/L}$) | Relative Error (%) |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **0** | `*1/*1` | 0.00 [unresolved] | 0.00 | +0.00 | 0.00 | 0.00 | +0.00 | — |
| **0** | `*1/*2` | 0.00 [unresolved] | 0.00 | +0.00 | 0.00 | 0.00 | +0.00 | — |
| **0** | `*2/*2` | 0.00 [unresolved] | 0.00 | +0.00 | 0.00 | 0.00 | +0.00 | — |
| **1** | `*1/*1` | 0.22 [unresolved] | 0.40 | +0.18 | 0.92 | 1.69 | +0.77 | — |
| **1** | `*1/*2` | 0.18 [unresolved] | 0.13 | −0.05 | 0.75 | 0.56 | −0.20 | — |
| **1** | `*2/*2` | 0.15 [unresolved] | 0.07 | −0.08 | 0.63 | 0.29 | −0.33 | — |
| **2** | `*1/*1` | 1.91 | 0.94 | −0.97 | 7.99 | 3.93 | −4.06 | −50.8% |
| **2** | `*1/*2` | 1.40 | 0.46 | −0.94 | 5.85 | 1.93 | −3.92 | −67.0% |
| **2** | `*2/*2` | 1.02 | 0.27 | −0.75 | 4.26 | 1.12 | −3.14 | −73.7% |
| **3** | `*1/*1` | 3.17 | 1.29 | −1.88 | 13.25 | 5.39 | −7.86 | −59.3% |
| **3** | `*1/*2` | 2.29 | 0.78 | −1.51 | 9.57 | 3.28 | −6.30 | −65.8% |
| **3** | `*2/*2` | 1.63 | 0.49 | −1.14 | 6.81 | 2.06 | −4.76 | −69.8% |
| **4** | `*1/*1` | 4.27 | 1.57 | −2.70 | 17.85 | 6.56 | −11.29 | −63.3% |
| **4** | `*1/*2` | 3.06 | 1.06 | −2.00 | 12.79 | 4.42 | −8.37 | −65.4% |
| **4** | `*2/*2` | 2.25 | 0.71 | −1.54 | 9.41 | 2.95 | −6.46 | −68.6% |
| **6** | `*1/*1` | 4.44 | 2.07 | −2.37 | 18.56 | 8.67 | −9.89 | −53.3% |
| **6** | `*1/*2` | 3.66 | 1.53 | −2.13 | 15.30 | 6.38 | −8.92 | −58.3% |
| **6** | `*2/*2` | 3.11 | 1.10 | −2.01 | 13.00 | 4.59 | −8.42 | −64.7% |
| **8** | `*1/*1` | 5.19 | 2.54 | −2.65 | 21.70 | 10.63 | −11.07 | −51.0% |
| **8** | `*1/*2` | 4.35 | 1.95 | −2.40 | 18.19 | 8.14 | −10.05 | −55.3% |
| **8** | `*2/*2` | 3.84 | 1.46 | −2.38 | 16.05 | 6.10 | −9.96 | −62.0% |
| **12** | `*1/*1` | 5.70 | 3.37 | −2.33 | 23.83 | 14.10 | −9.73 | −40.8% |
| **12** | `*1/*2` | 5.18 | 2.70 | −2.48 | 21.66 | 11.29 | −10.36 | −47.8% |
| **12** | `*2/*2` | 4.50 | 2.12 | −2.38 | 18.81 | 8.85 | −9.96 | −52.9% |
| **24** | `*1/*1` | 7.13 ± 0.27 | 5.15 | −1.98 | 29.81 | 21.54 | −8.27 | −27.7% |
| **24** | `*1/*2` | 7.83 ± 0.33 | 4.42 | −3.41 | 32.74 | 18.47 | −14.26 | −43.6% |
| **24** | `*2/*2` | 5.94 ± 0.03 | 3.69 | −2.25 | 24.83 | 15.43 | −9.40 | −37.9% |
| **44** | `*1/*1` | 6.60 ± 0.02 | 6.59 | −0.01 | 27.59 | 27.56 | −0.03 | −0.1% |
| **44** | `*1/*2` | 8.52 ± 0.04 | 6.00 | −2.52 | 35.62 | 25.10 | −10.52 | −29.5% |
| **44** | `*2/*2` | 5.92 ± 0.02 | 5.31 | −0.61 | 24.75 | 22.21 | −2.54 | −10.3% |
| **48** | `*1/*1` | 6.51 ± 0.02 | 6.74 | +0.23 | 27.22 | 28.18 | +0.96 | +3.5% |
| **48** | `*1/*2` | 8.69 ± 0.04 | 6.19 | −2.50 | 36.33 | 25.88 | −10.45 | −28.8% |
| **48** | `*2/*2` | 5.92 ± 0.04 | 5.53 | −0.39 | 24.75 | 23.11 | −1.64 | −6.6% |

---

## 5. Scientific Findings & Mechanistic Evaluation

### 1. Visible Genotype Ordering Discrepancy
- **Model Prediction:** By tying biotransformation directly to ALDH2 catalytic activity, Google's model predicts that CMMG concentrations must strictly follow the enzyme activity hierarchy at all times:
  $$\text{Model: } *1/*1 > *1/*2 > *2/*2$$
- **Plotted Observations:** In Hara's Figure 3, the heterozygous group (`*1/*2`) exhibits the **highest plotted mean** at 24, 44, and 48 hours ($7.50\text{--}7.83\ \mu\text{g/mL}$ at 24 h, $8.48\text{--}8.52\ \mu\text{g/mL}$ at 44 h, and $8.65\text{--}8.69\ \mu\text{g/mL}$ at 48 h). Wild-type `*1/*1` plateaus at $6.51\text{--}6.60\ \mu\text{g/mL}$.
- That ordering discrepancy is visible.

### 2. Limits of Sample Size & Rate Identifiability
- With **six people per group**, the mean curves alone cannot identify which enzyme rate caused the heterozygote mean to be highest.
- Factors such as interindividual differences in oral bioavailability ($F$), distribution volume, or nonrenal clearance could account for the observed separation, and standard deviation bars overlap substantially across groups.

### 3. Failure of Google's Proposed 15% AUC Equivalence Criterion
- Google's design hypothesis posited that redundant cytosolic aldehyde oxidation would buffer CMMG cumulative exposure across genotypes within $\pm 15\%$.
- However, direct integration of Google's unadjusted equations shows that the 48-hour modeled CMMG AUC in `*2/*2` ($675.4\ \mu\text{mol}\cdot\text{h/L}$) is **$27.3\%$ lower** than in `*1/*1` ($928.5\ \mu\text{mol}\cdot\text{h/L}$).
- A $27.3\%$ reduction fails Google's proposed $15\%$ criterion.

### 4. Table 2 Scope Limitations
- Hara's Table 2 reports only CMMG peak concentration ($C_{\max}$) and time to peak ($t_{\max}$):
  - $C_{\max}$: `*1/*1`: $7.44 \pm 2.79$, `*1/*2`: $8.75 \pm 4.31$, `*2/*2`: $6.22 \pm 2.29\ \mu\text{g/mL}$.
  - $t_{\max}$: `*1/*1`: $24.0\text{ h}$, `*1/*2`: $48.0\text{ h}$, `*2/*2`: $24.0\text{ h}$.
- Table 2 reports no $\text{AUC}_{0\text{--}48\text{h}}$ or $\text{AUC}_{0\text{--}\infty}$ values for CMMG. Therefore, Table 2 cannot establish that 48-hour AUC was equal across genotypes.

---

## 6. Decision & Summary

> **Decision:** **Do NOT incorporate the Google ALDH2 architecture into the AyFlux engine.**

1. The proposed fixed model predicts `*1/*1 > *1/*2 > *2/*2` at all times, whereas the plotted clinical means show `*1/*2` highest at 24, 44, and 48 hours.
2. The $27.3\%$ lower modeled AUC in `*2/*2` fails Google's own $15\%$ buffer criterion.
3. With $n=6$ per group, the concentration curves alone cannot identify which microscopic rate caused the difference.
4. AyFlux correctly preserves its frozen engine parameters (`17971df...`) without ad hoc ALDH2 adjustments.

---

## 7. Verification Commands

```sh
# Run standalone comparison script and generate overlay SVG
node research/validation/hara-aldh2-cmmg.cjs

# Run complete regression test suite
npm test
```
