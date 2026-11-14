# Turner 2016 external evaluation protocol

Status at this commit is protocol frozen before any AyFlux comparison run. The published results have been read during protocol preparation. This is a retrospective external aggregate evaluation. Individual patient records are unavailable in the article.

## Model and question

Use repository commit `304ce5308ea78907d18b07d8670c164295829eb3` and engine blob `17971df66e0a97b4d382572a582d35c444a3c83f`, with Node 24. Record the full runtime version and source hashes in the results. Disable parameter variability, Bayesian fitting, probenecid and dialysis. Use a single IV infusion over 1 h. Keep actual body weight for the model's volume and allometric terms. Dose weight and PK scaling weight are distinct.

The primary question is whether the frozen default model reproduces systemic exposure in the two Turner groups. A prespecified secondary hypothesis multiplies only the renal acyclovir clearance term by 0.75. This coefficient was suggested by the earlier Laskin/scorecard analysis. Keep nonrenal, formation, distribution and metabolite clearances fixed. The implementation must apply this coefficient directly to the sampled renal term, because the interface clearanceScale also affects other clearances.

This study cannot test the hypothesis that weight scaling should be removed specifically at zero kidney function. Turner excluded serum creatinine above 1.4 mg/dL and studied participants with functioning kidneys.

## Source and reconstruction

Turner RB et al. Antimicrob Agents Chemother. 2016;60:1830–1833. DOI [10.1128/AAC.02010-15](https://doi.org/10.1128/AAC.02010-15). [Full text and Tables 1–2](https://pmc.ncbi.nlm.nih.gov/articles/PMC4775958/), reviewed 2026-11-13. Participants were oncology inpatients receiving prophylaxis, with no active infection at sampling. Seven participants per group, six female and one male per group. Administered doses were based on Devine IBW in the obese group and TBW in the normal-weight group.

| Input, group mean | Obese | Normal weight | Source and implementation |
| --- | ---: | ---: | --- |
| Actual body weight, kg | 120.5 | 61.2 | Table 1, used for PK scaling |
| IBW, kg | 57.1 | 58.5 | Table 1, contextual dose weight |
| BMI, kg/m² | 45.0 | 22.5 | Table 1, descriptive |
| Age, years | 54.3 | 53.0 | Table 1, descriptive in primary manual-kidney run |
| BSA, m² | 2.3 | 1.7 | Table 1 |
| Serum creatinine, mg/dL | 0.78 | 0.76 | Table 1, sensitivity inputs |
| Indexed estimated GFR, mL/min/1.73 m² | 93.4 | 93.7 | Table 1 |
| Administered dose, mg | 285 | 303 | Table 2, use these rounded actual mean doses |
| Infusion, h | 1 | 1 | Methods |

Primary kidney input is reported indexed estimated GFR × BSA / 1.73, entered as a manual CrCl surrogate. State explicitly that estimated GFR and measured CrCl differ, and that the product of group means approximates the mean absolute value. Avoid clipping these computed inputs to a different kidney band.

Prespecified sensitivity analyses use Cockcroft–Gault calculated at group mean age and creatinine with actual, ideal and adjusted weights, where adjusted weight = IBW + 0.4 × (actual − IBW). Compute female and male scenarios separately and average their outputs with weights 6/7 and 1/7. These are synthetic aggregate reconstructions. They do not reproduce the seven actual participants or their covariance. Keep actual model body weight and administered dose fixed throughout.

## Endpoints

| Reported group mean ± SD | Obese | Normal weight |
| --- | ---: | ---: |
| Plasma Cmax, mg/L | 5.8 ± 0.9 | 8.2 ± 1.3 |
| Plasma AUC0–infinity, mg·h/L | 15.2 ± 2.9 | 24.0 ± 9.4 |
| Systemic clearance, L/h | 19.4 ± 5.3 | 14.3 ± 5.4 |

Co-primary descriptive endpoints are Cmax and AUC0–infinity in each group, four comparisons in total. Calculate nominal AUC0–infinity as administered dose divided by total systemic acyclovir clearance for these constant-input, no-dialysis scenarios. Report simulated AUC0–120 and its difference from AUC0–infinity as a tail check. Use an event-aware maximum step of 0.025 h, with a 0.0125 h repeat for Cmax convergence. Report absolute and relative convergence differences.

Report model total systemic clearance separately as a secondary endpoint. The reported AUC and clearance summaries are related fitted quantities. They do not add independent observations. Do not compare AyFlux Vc alone against Turner's fitted V as though the compartment definitions were identical.

The source samples at baseline and 0.5, 1, 1.25, 1.5, 2, 3, 5, 7, 9 and 12 h. Cmax in Table 2 is the primary reported endpoint. A sampled-time maximum can be reported separately. Do not digitize Figure 1 for the primary analysis or replace the tabulated endpoint after seeing agreement.

## Prespecified reporting rules

For every endpoint report prediction, observed group mean, predicted/observed ratio and signed relative error. Present the two groups separately. For the four co-primary comparisons, report counts within inclusive 0.80–1.25 and 0.5–2.0 ratio bands. Both are descriptive research tolerances selected before computation. Neither establishes bioequivalence or clinical predictive validity. Report both bands even if the narrower band fails.

Also report each model's obese/normal ratios for AUC and Cmax, compared with the ratios of the source group means. Keep default and renal ×0.75 results side by side. Do not select a winning variant solely from pooled error. A secondary directional check asks whether the model reproduces lower exposure in the obese group under the study's actual dose allocation.

Do not tune parameters, select the kidney-weight sensitivity that agrees best, infer individual coverage from group SD, or treat hypothetical adjusted-weight dosing as observed treatment. Label any subsequent changes as exploratory and record an amendment before recomputation. If a coding error requires correction, retain both the original protocol commit and the correction history.

## Execution and archive

The future runner should load the engine from the exact frozen commit, verify its blob, and emit the input configuration, runtime, variant definitions, outputs, source endpoint table and convergence checks. Keep the observed cohort outside the original 37-point scorecard for this analysis. Archive the protocol commit SHA with the results. No runner was executed to prepare this protocol.
