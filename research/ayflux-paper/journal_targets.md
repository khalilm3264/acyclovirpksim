# Journal strategy for AyFlux — researched 2026-11-09

**Decision principle:** choose the article type from the actual contribution: mechanistic PK model and evaluation, biomedical research software, or kidney-focused clinical/translational investigation. Do not add machine learning merely to meet a perceived editorial requirement.

| Journal | Most relevant category | Fit TODAY | What would improve fit |
|---|---|---|---|
| [CPT: Pharmacometrics & Systems Pharmacology](https://ascpt.onlinelibrary.wiley.com/hub/journal/21638306/aims-and-scope/read-full-aims-and-scope) | Original article on PK model evaluation; human pharmacology and simulation | Strong subject match, but current validation insufficient | Independent clinical PK datasets; full parameter estimation/validation; predictive uncertainty |
| [Computer Methods and Programs in Biomedicine](https://www.us.elsevierhealth.com/computer-methods-and-programs-in-biomedicine-0169-2607.html) | Software/methodology research | Good thematic fit, pending stronger methodological novelty | Reproducible benchmark, software comparison, design tradeoffs, technical testing |
| [JAMIA Open](https://academic.oup.com/jamiaopen/pages/general_instructions) | Application Note (2,000 words / 150-word abstract) | Potentially good if presented as health informatics/research software, not clinical decision support | Documented workflows, usability evaluation and open-source accessibility |
| [Kidney360](https://www.asn-online.org/publications/) | Kidney-focused original investigation | Conditional: current work too exploratory | Nephrologist coauthor, independent dialysis PK data, safety/clinical relevance analysis |
| [Clinical Kidney Journal](https://academic.oup.com/ckj/pages/about) | Clinical/translational original research | Conditional: needs clinically meaningful evaluation | Independently tested HD/PD regimens, better dialysis patient matching and robust uncertainty |
| [Kidney Medicine](https://www.kidney.org/press-room/national-kidney-foundation-announces-launch-kidney-medicine) | Clinical nephrology quantitative research | Conditional: requires clear patient-care research question | Data-supported kidney patient outcomes or evidence of clinical applicability |
| [BMC Nephrology](https://communities.springernature.com/badges/bmc-nephrology) | Nephrology original research | Conditional | Better external clinical validation and kidney-disease relevance |
| [Kidney and Dialysis](https://www.mdpi.com/journal/kidneydial/about) | Dialysis methods and research paper | Reasonable thematic candidate, but research quality still needs improving | Independent case-matched validation, nephrology interpretation, transparency |
| [Journal of Chemical Information and Modeling](https://researcher-resources.acs.org/publish/author_guidelines?coden=jcisd8) | Application Note for chemical/biological modeling software | Stretch **scope match** for renal PK-only simulator | Show genuinely innovative chemical-information or molecular-modeling algorithms, not simply a PK web application |
| [Journal of Open Source Software](https://joss.readthedocs.io/en/latest/submitting.html) | Research-software description, not clinical-results paper | **Not yet** if repository public history is under six months | Public development history >6 months, demonstrable research use, community feedback and easy local tests |

## Rank by strategy

**If the manuscript's primary contribution is PK science:** CPT: Pharmacometrics & Systems Pharmacology, then a suitable pharmacometrics/methods journal. Its original research article guideline is 4,000 words and expects significant original quantitative contribution and reproducible model code.

**If the primary contribution is a software tool:** Computer Methods and Programs in Biomedicine or JAMIA Open Application Note. JCIM's September 2026 Application Note editorial is favorable toward software and web services but confines its scientific scope to chemical informatics/molecular modeling; this is not automatically a fit for an ODE-based renal pharmacokinetic simulator.

**If the intended readers are nephrologists:** Kidney360, Clinical Kidney Journal, Kidney Medicine, or BMC Nephrology, but first develop a renal/dialysis-specific scientific claim with measured data. A simulator screenshot alone is unlikely to satisfy that expectation.

## Word-limit note

JCIM currently has two partly inconsistent indications: author guidelines say Application Notes must be **at most 5,000 words** (with detailed figure-equivalence counting), while the September 2026 Application Note editorial recommends **4,000 words**, allowing justified exceptions. A draft at about 3,500–4,000 words, with methods and extra results in Supporting Information, is prudent; verify with the editor at submission. Hammouda's handwritten 5,000-word reminder is plausible under the formal author-guideline cap.

## Pre-submission questions for Hammouda

1. Is this meant to be a **software Application Note** or a new **validated PK model** manuscript?
2. Which journal readership should dominate: computational methods, pharmacology, or nephrology?
3. Can we obtain patient-level concentration–time data and collaborate with a nephrologist/pharmacometrician?
4. What scientific question demands ML? If none, mechanistic ODE + uncertainty analysis is more appropriate.
5. What constitutes adequate external validation given that default HD clearance was drawn from the Laskin source?

**Publication ethics:** Determine actual author contributions and disclose AI-assisted code/text according to target journal rules. Do not interpret the current nominal comparisons as external validation, propose patient dosing, or imply an ML algorithm exists when it does not.
