# Is AyFlux machine learning? What to say, and what could be added

## The correct description TODAY

AyFlux is an open-source **mechanistic, compartmental pharmacokinetic ODE simulator** with:
- event-aware fourth-order Runge–Kutta (RK4) numerical integration;
- configurable residual renal clearance and extracorporeal clearance;
- exploratory peritoneal membrane transfer and dialysate dynamics;
- stochastic Monte Carlo parameter sampling;
- likelihood-based *importance reweighting* of a fixed ensemble against user-entered observations;
- an illustrative parameter grid search for selected clearance and volume multipliers.

This is **not** an independently trained ML model. Sampling parameter values from predetermined lognormal distributions is not data-trained ML. Reweighting those samples from a small set of observations does not establish generalizable Bayesian population PK or clinically validated patient-specific dosing. Likewise the exploratory CSF proxies do not make the model full PBPK.

## What ML might add — only with a defensible scientific objective

**Option A: Emulation for speed (least clinical risk).** Train a lightweight regressor on thousands of generated AyFlux trajectories to predict exposure summaries (e.g., AUC or Cmax) from dose, weight, renal function and dialysis schedule. Evaluate on held-out combinations of dialysis schedules, not randomly sampled rows of the same trajectory. Compare predictions with the original differential-equation solver and quantify speed, absolute error, interval coverage and out-of-distribution failures. This is an **emulator of existing model behavior**; it does not validate the underlying physiology. Unless speed is a real bottleneck, likely low research priority.

**Option B: Hybrid mechanistic / data-driven residual correction (potential scientific value, highest data requirement).** With independent patient-level concentrations, train a model to predict the log-scale residual between observed concentrations and the mechanistic PK forecast using time, kidney function, dialysis modality, prescription timing and other available covariates. Use patient-level training/validation/test partitions; never split repeated samples from a single individual across sets. Benchmark against an untouched mechanistic baseline and report calibration, errors by kidney subgroup, missing-data handling, and external validation. Avoid extrapolating beyond measured cohorts. Requires ethics/data governance and clinical collaborators.

**Option C: Bayesian statistical calibration (a natural priority, not automatically ML).** Estimate a defensible distribution of PK parameters from clinical observations, explicitly defining priors, likelihood, assay error, identifiability and posterior diagnostics. Separate fit and held-out subjects. This is better aligned with the current AyFlux scientific problem than ML-for-its-own-sake.

## Avoid these claims

- "AI-powered dosing" — there is no trained clinical predictor.
- "Machine-learning-validated pharmacokinetic model" — code does not support this.
- "Population PK model" — the implemented parameter distributions were not shown to have been estimated from a patient population.
- "Personalized Bayesian precision dosing" — until posterior and holdout coverage have been validated.
- "PBPK" — AyFlux currently uses a reduced multi-compartment representation, not a physiological whole-organ PBPK model.

## Question to ask Dr. Hammouda

"Would you prefer the paper to emphasize our deterministic mechanistic PK equations and independent clinical comparisons, or is there a specific prediction or computational bottleneck that would justify adding a machine-learning component? If we pursue ML, I would want an appropriate training dataset, patient-separated external validation and a comparison against the unchanged mechanistic baseline."
