# Synthetic parameter recovery

Uniform discrete prior on clearance and central-volume scale factors (0.6–1.4); only renal and other clearance are scaled. All other parameters fixed. Six noisy fit samples, three noise-free latent holdout times. Same-model, on-grid recovery; not external validation or full-model identifiability.

Run `node research/verification/parameter-recovery.cjs` to regenerate the fixed-seed experiment and `node --test tests/parameter-recovery.test.cjs` for its regression check. The experiment uses the production infusion solver and likelihood weighting, with 441 equally weighted candidate parameter pairs and 24 noisy synthetic datasets. The six fitting times are 0.5, 1, 2, 4, 8 and 12 hours. The three latent holdout times are 3, 6 and 10 hours. These holdout values are never used to compute weights.

| Scale factor | Mean absolute relative error | Maximum absolute relative error | Truth within central 90% interval |
|---|---|---|---|
| clearance | 1.4% | 6.7% | 23/24 |
| volume | 3.6% | 10.0% | 24/24 |

Maximum latent holdout RMSE: 0.165 mg/L.

## Interpretation

This verifies recovery under a deliberately favorable, correctly specified two-parameter model. The truth lies on the candidate grid, the sampling schedule is informative, and all other parameters are known. It does not establish recovery of all parameters in the production prior, performance with sparse clinical data, predictive coverage for measured concentrations, or model identifiability. The 24 replicates provide a regression benchmark, not a calibrated coverage study. The clearance factor scales renal and other clearance only; metabolite formation clearance remains fixed.

AyFlux’s current Bayesian calculation is likelihood weighting of a finite prior ensemble with a prediction-dependent Gaussian assay error (SD = max(0.1 mg/L, assayCV × prediction)). It is not MCMC, continuous optimization or a trained machine-learning model. Its effective sample size describes weight concentration among candidates. Synthetic observations use that same error model without clipping. Holdout RMSE compares predictions with noise-free latent concentrations and must not be interpreted as clinical measurement error.

The existing research-workspace tests cover mass accounting across modalities and time-step convergence. The CAPD reproduction tests include separate time-step checks. These numerical checks and the present recovery test address different failure modes; neither substitutes for comparison against independent patient data.
