# Serum and CSF acyclovir after hemodialysis

Bataille et al. report a 59-year-old woman receiving thrice-weekly hemodialysis. One-hour IV acyclovir infusions of 10 mg/kg followed dialysis on days 0 and 6. Serum and CSF acyclovir measured immediately after dialysis on day 3 were 1.12 and 0.67 µmol/L. Serum acyclovir 24 hours after the second infusion was 17.6 µmol/L. Conversion uses 0.22521 mg/L per µmol/L. The original scanned letter supplies all three observations. The Reactions Weekly summary describes the same case. [Original letter, Lancet 1985;2:724](https://doi.org/10.1016/S0140-6736%2885%2992960-5)

## Reconstruction assumptions

The reference scenario uses 70 kg, zero residual CrCl, HD clearance of 81.8 mL/min and four-hour sessions ending at hours 72 and 144. The first dose begins at hour zero and the second at hour 144, immediately after the documented sessions. The final sample is placed at hour 169, interpreting “24 hours after infusion” as 24 hours after its completion. Initial drug concentrations are zero.

Body weight, residual kidney function, machine clearance, session duration and clock times were unreported. The grid spans 50/70/90 kg, CrCl 0/2/5 mL/min, HD clearance 40/81.8/120 mL/min and session duration 3/4/5 hours. Calendar days are mapped to exact 24-hour intervals. The statement “thrice-weekly” leaves intervening sessions uncertain, so each scenario also runs with an additional illustrative session ending at hour 108. The reference follows the explicitly described day-3 and day-6 sessions.

All 162 scenarios use the existing model coefficients without fitting. Ranges represent the selected assumptions. Serum measurements are compared with modeled central plasma. The CSF-to-serum ratio is calculated at the paired sampling time.

Run `node research/validation/bataille-csf.cjs`. Each scenario must reproduce its concentration endpoints within 0.001 mg/L when the integration step is halved.

| Endpoint | Measured | Reference prediction | Difference | Scenario range |
|---|---:|---:|---:|---:|
| Day-3 serum (mg/L) | 0.252 | 0.720 | 0.468 | 0.079–1.150 |
| Day-3 CSF (mg/L) | 0.151 | 0.342 | 0.191 | 0.058–0.442 |
| Day-7 serum (mg/L) | 3.964 | 5.728 | 1.764 | 3.058–6.051 |
| Day-3 CSF/serum ratio | 0.598 | 0.475 | -0.123 | 0.384–0.741 |

The reference scenario overpredicts all three concentrations and underpredicts the paired CSF/serum ratio. Each observed endpoint falls within its marginal scenario range. Marginal overlap does not establish simultaneous agreement for any particular scenario. Missing dialysis and patient inputs limit interpretation of the discrepancy.

The benchmark uses a 1/64-hour integration step and checks against 1/128 hour. The initial 1/8-hour step failed the prespecified 0.001 mg/L convergence criterion in the sensitivity grid, prompting refinement. Concentration endpoints passed after refinement.
