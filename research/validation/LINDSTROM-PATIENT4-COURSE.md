# Lindström patient 4 and the onset of kidney injury

Patient 4 weighed 98 kg. The supplement describes IV acyclovir at 15 mg/kg every 8 hours, acute renal failure after about three days, and dose changes to 10 mg/kg every 12 hours on day 4 and 12 mg/kg every 8 hours on day 6 as kidney function recovered. Table 1 dates the first sample to day 2. Neither source gives an administration log or the onset time of the fall in clearance. [Table 1](https://academic.oup.com/view-large/177892512) · [Authors’ case series](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6857197/supplementaryFiles)

## Serum concentrations

Each pair is acyclovir / CMMG in µmol/L. The Table 1 reconstruction holds the visit's dose schedule and estimated CrCl constant. The supplement reconstruction changes the dose and interval on the reported treatment days. At 4a it uses four or nine doses as alternative placements on the calendar. Both use the published six-hour lag. At 4b and 4c it uses the reported 7.5- and 8-hour lags.

| Visit | Observed | Table 1, constant CrCl | Supplement, constant CrCl | Supplement, assumed change in CrCl |
|---|---:|---:|---:|---:|
| 4a | 110 / 57 | 50.85 / 30.91 (six doses) | 49.85 / 29.32 (four) or 51.02 / 31.24 (nine) | 33.96–50.88 / 13.88–30.95 (nine doses, onset sensitivity below) |
| 4b | 25 / 2.8 | 2.97 / 0.71 | 2.97 / 0.71 | 2.97 / 0.71 |
| 4c | 10 / 1.5 | 1.81 / 0.33 | 1.81 / 0.33 | 2.08 / 0.42 |

At constant CrCl 30 mL/min, the nine-dose concentrations exceed the four-dose values by about 2.35% for acyclovir and 6.55% for CMMG. The timing of the kidney injury matters more. To isolate its effect, hold the sample at 70 hours and start CrCl at an assumed 125 mL/min. A linear drop to 30 over 0.25 hours beginning at hour 24, 48 or 64 predicts 50.88 / 30.95, 48.42 / 27.33 or 33.96 / 13.88, respectively. Holding CrCl at 30 from the first dose gives 51.02 / 31.24. Every scenario falls below both observations.

By visits 4b and 4c, the two schedules agree to the displayed precision when clearance and sample lag match. The concentrations do not identify another sample time, infusion duration or cause of the residual discrepancy.

## Assumptions and reproduction

- A treatment day starts every 24 hours. Each IV infusion lasts an assumed hour. Simulations start with zero drug, use no dialysis and retain nominal model parameters.
- For 4b and 4c the changing-clearance scenario assumes 30 mL/min through hour 72, a linear recovery to 125 at hour 120, then constant 125 through hour 199.5. It increases linearly to 140 at hour 368. The profile input accepts at most 140 mL/min. The constant comparison uses Table 1’s 149 mL/min directly in the engine. Initial CrCl, the recovery trajectory and clock times are assumptions.
- Run `node research/validation/lindstrom-patient4-course.cjs`. The output includes all displayed scenarios. Halving the step from 0.125 to 0.0625 h changes each endpoint by less than 0.1%. For the last visit, shortening the modeled pre-dose history from 312 to 240 h changes each supplement prediction by less than 0.001 µmol/L.
- Supplement file `dkz357_supplementary_data.docx`, SHA-256 `52ad65724c3be4c214f893ca73b58f799c79d7e520c55a10809ed9314983ad3e`. These three visits belong to the existing Lindström cohort.
