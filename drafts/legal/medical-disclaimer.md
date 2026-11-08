# AyFlux — Medical and Scientific Disclaimer (REVIEW DRAFT)

**Status:** Internal draft; requires review before publication.
**Drafted:** November 7, 2026.

## Short notice for the simulator

**Educational simulation only.** AyFlux models possible acyclovir and valacyclovir pharmacokinetic profiles using simplified assumptions. Outputs are not individual patient measurements or clinically validated dose recommendations. Do not use this tool to prescribe medication, diagnose toxicity, adjust dialysis, or make patient-care decisions.

## Full medical and scientific disclaimer

AyFlux is a freely accessible educational simulation intended to help visitors explore the behavior of a pharmacokinetic model under different assumptions about renal clearance, drug administration, and renal replacement therapies. It is not intended to provide medical advice, diagnosis, treatment, dosing recommendations, therapeutic drug monitoring, or individualized safety assessments.

**Simulated concentrations are not measured concentrations.** Predicted plasma, CSF, and CMMG values depend on mathematical structure and uncertain parameters. A two-compartment approximation, assumptions about CSF transfer and delay, renal function estimates, oral absorption, CMMG formation, and dialysis clearance may not describe the behavior of any particular patient.

**The uncertainty bands do not establish clinical reliability.** Ranges generated from hypothetical parameter variability, Monte Carlo simulation, or Bayesian reweighting describe uncertainty within the chosen model, not proven predictive performance, validated 90% clinical coverage, or guaranteed outcomes.

**Reference ranges and thresholds must not be used as stand-alone clinical rules.** Published antiviral susceptibility figures, concentration markers, exposure comparisons, and reported associations with toxicity cannot determine whether a particular dose is effective or safe for an individual. CMMG associations in the literature are not a definitive clinical diagnostic threshold, and viral susceptibility estimates do not substitute for treatment guidelines.

**Dialysis modes are illustrative.** Hemodialysis (HD), peritoneal dialysis (PD), and continuous renal replacement therapy (CRRT) depend on equipment, prescriptions, physiology, and treatment delivery that may differ materially from the modeled scenario. Residual kidney function and timing of treatments can also change over time.

Nothing on AyFlux replaces professional clinical judgment, official product labeling, institutionally reviewed protocols, direct laboratory testing, or consultation with a qualified healthcare professional. Do not use the website for emergency or time-critical decisions.

For an explanation of assumptions and limitations, read https://ayflux.org/learn/model-methods/ and review cited primary studies. Source code is available at https://github.com/khalilm3264/acyclovirpksim.

## Intended-use statement for About page

AyFlux is an open-source educational tool for exploring acyclovir and valacyclovir pharmacokinetic models in renal impairment and dialysis. It is designed for learning about model behavior, not for recommending patient-specific doses or treatment.

## Regulatory review note — not for public site text

Do not make an unsupported assertion that AyFlux is FDA-approved, FDA-cleared, FDA-exempt, or categorically "not a medical device." Its regulatory classification depends on actual functionality, intended use, marketing, users, and applicable law. Ask qualified regulatory counsel to review it before marketing to clinical decision-makers. Reference: FDA Clinical Decision Support Software Guidance (Jan. 2026): https://www.fda.gov/regulatory-information/search-fda-guidance-documents/clinical-decision-support-software
