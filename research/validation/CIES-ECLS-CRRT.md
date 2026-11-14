# Cies 2015: neonatal dialysate-delivered acyclovir during ECLS and CRRT

## Source and scope

Cies JJ, Moore WS II, Miller K, et al. *Therapeutic Drug Monitoring of Continuous-Infusion Acylovir for Disseminated Herpes Simplex Virus Infection in a Neonate Receiving Concurrent Extracorporeal Life Support and Continuous Renal Replacement Therapy*. Pharmacotherapy. 2015;35(2):229–233. [DOI 10.1002/phar.1526](https://doi.org/10.1002/phar.1526); [PMID 25556960](https://pubmed.ncbi.nlm.nih.gov/25556960/).

The supplied original is named `cies2014.pdf`: the copyright/online year is 2014, but the volume year is 2015. It is already privately catalogued as `cies2015`. The six-page PDF contains printed pp. 229–233 plus a copyright sheet; SHA-256 `b56596fb869aca759c42415afe92618025cf6d3ec35f1775f07d791768281d78`. Pages 230–231 were visually checked against the text extraction.

The previous private source note already recorded the two measured concentrations and dialysate route. This audit adds the page-specific regimen and circuit timeline, unresolved calendar timing, and the distinction between observed concentrations, treatment targets and inferred circuit effects. It is a source audit, not a simulated benchmark or an engine change. The copyrighted original remains private.

## Reported timeline

The patient was a 14-day-old female at presentation, with disseminated HSV-1, hepatic injury, renal failure and fluid overload (pp. 229–230). No patient weight is reported.

| Reported time origin | Drug, circuit or sample event | Evidence and limits |
| --- | --- | --- |
| Presentation / initial treatment | IV acyclovir 20 mg/kg per dose every 8 h | Clinical course, pp. 230–231 column continuation. Initial dose count and infusion duration are not specified. |
| Hospital day 1 | Hypotension, fluid resuscitation and vasoactive support; serum creatinine 1.14 mg/dL reported during the initial deterioration | p. 230. This is not a measured ACV concentration or a measured renal clearance. |
| Day 2 into day 3 | ECLS cannulation for hemodynamic support and to facilitate CRRT after renal failure with fluid overload | p. 230. Separate circuit start clocks and any interruptions are not given. |
| With conversion to ECLS and CRRT | Empiric increase to IV acyclovir 30 mg/kg per dose every 8 h; 12 doses over 4 days | p. 230. Authors cite concern about additional circuit distribution volume and elimination; neither mechanism is independently measured in this patient. Exact administration times and the last intermittent dose clock are absent. |
| Hospital day 9 repeat viral test | HSV viral load still 1 × 10⁸ copies/mL; decision to change intermittent dosing to continuous delivery through CRRT dialysate | p. 230. The four-day dose course, circuit conversion and day-9 decision are all retained as printed. Do not fill the intervening calendar gap or assign an exact switch hour. |
| Start of dialysate-delivered treatment, t = 0 | ACV added to Duosol Bicarb 35 K2/Ca3 dialysate at 5.5 µg/mL = 5.5 mg/L | p. 230; also pp. 229 and 232. This is the dialysate preparation concentration, not a measured patient level, IV infusion rate or mg/kg/day dose. No patient-specific dialysate flow or delivered mass rate is given. |
| t = 24 h from starting dialysate delivery | Patient ACV 8.8 mg/L | p. 230 clinical course; repeated in p. 229 abstract. Reported as serum. Sampling site relative to either circuit is not specified. |
| t = 72 h from starting dialysate delivery | Patient ACV 5.3 mg/L | Same sources and time origin. Reported as serum. No simultaneous inlet/outlet or effluent samples are reported. |
| Subsequent outcome | Intracerebral hemorrhage attributed by the authors to ECLS; technological support withdrawn before repeat viral load could assess the continuous-delivery response | p. 231. Exact event time and treatment-stop clocks are not provided. |

The two measured ACV draws are 48 h apart **during ongoing drug delivery and combined extracorporeal support**. Their decline cannot be treated as a drug-free elimination interval, post-HD rebound pair, circuit extraction measurement or terminal half-life estimate. No numerical ACV measurement during the earlier intermittent regimen is reported; the unchanged viral load is not a substitute for a measured low ACV trough.

## Circuit context and assay

On p. 231, the ECLS circuit description specifies 1/4-inch-diameter, 3/32-inch-thick PVC/super Tygon tubing and a Quadrox-iD Peds oxygenator. Crystalloid and albumin priming were displaced with a blood-product prime and additives. No patient-specific total circuit volume or ECLS flow is reported.

The CRRT section (p. 231) describes a Prismaflex system and HF1000 AN69 filters. It states that continuous venovenous hemofiltration or hemodiafiltration was selected according to clinical condition and the nephrologist. It does **not** assign one modality, its changes, or blood/dialysate/replacement/ultrafiltration flows to each ACV draw. Priming options are described; do not convert them into a patient-specific delivered fluid volume. The authors acknowledge fluctuating CRRT/ultrafiltration flow rates (p. 232).

The clinical course and abstract call the two results **serum** concentrations (pp. 229–230); the assay section calls the analyte measurements **plasma** concentrations while describing calibration and specimen dilution in blank serum (p. 231). Preserve this internal matrix terminology rather than silently resolving it. LC–MS/MS at NMS Labs is described, with a 0.02–2.0 µg/mL calibration range and additional dilution for higher concentrations. Thus values above 2.0 µg/mL are not, by themselves, evidence that the reported results exceed the assay's usable diluted range.

## Observations versus targets

| Quantity | Status |
| --- | --- |
| 8.8 mg/L at +24 h and 5.3 mg/L at +72 h | Two reported patient ACV measurements |
| 5.5 mg/L in dialysate | Prepared drug-input concentration |
| Plasma/serum ACV ≥3 mg/L | Authors' treatment target, based on cited literature |
| CSF ACV ≥1 mg/L and CSF:plasma relation approximately 30–50% | Target and literature-based rationale, not patient CSF measurements |
| Plasma ACV 50–70 mg/L associated with neurotoxicity in cited reports | Discussion of other evidence, not this patient's measured concentrations |
| 1 × 10⁸ copies/mL | HSV viral load, not ACV concentration |

Both sampled values exceed the stated 3 mg/L target; two draws do not independently establish that the concentration remained above it at every intervening moment. The paper's proposed equilibration near the dialysate concentration is an author interpretation, not an observed full concentration–time profile.

## Use in AyFlux

Dialysate was a **source of ACV input** as well as part of extracorporeal treatment. The supported IV/oral input routes cannot directly reproduce this administration method. A valid future reconstruction would require a specified circuit-to-patient drug-input model, actual flows and their changes, patient weight, circuit volume, dose-switch history and sampling sites. Concurrent ECLS and CRRT, changing critical illness and sparse draws prevent attributing clearance, distribution volume, sequestration or concentration change to either circuit separately.

Keep these observations outside pooled predictive accuracy metrics. No clearance, rebound fraction, circuit-specific effect or model parameter is estimated from them. See the separate [Collignon CRRT audit](COLLIGNON-CRRT.md) for a different primary report; do not transfer its circuit assumptions to this neonate.
