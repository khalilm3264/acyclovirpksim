# Lindström patient 7 and the dosing history

Patient 7 had recurrent herpes simplex encephalitis. The authors describe IV acyclovir 15 mg/kg every 8 hours with concurrent foscarnet. After about two weeks, confusion increased and estimated creatinine clearance (CrCl) had fallen from 109 to 51 mL/min. The acyclovir interval changed to 12 hours. Treatment stopped after another 12 days as clearance declined further. Table 1 supplies the measured serum concentrations and time since the last dose. The supplementary case series supplies the change in interval and discontinuation. [Table 1](https://academic.oup.com/view-large/177892512) · [Authors’ supplement, Europe PMC download](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6857197/supplementaryFiles)

The supplement is `dkz357_supplementary_data.docx`, SHA-256 `52ad65724c3be4c214f893ca73b58f799c79d7e520c55a10809ed9314983ad3e`. This is a descriptive comparison of three visits in the same person. It reuses the concentrations already included in the Lindström cohort.

## Predicted and observed concentrations

Each pair gives acyclovir / CMMG in µmol/L. The first numeric column is measured serum. The other columns are deterministic model plasma predictions.

| Visit | Day, lag after last dose, CrCl | Observed | Every 8 h, constant CrCl | Every 8 h, linear CrCl history | Supplement-informed interval, linear CrCl history |
|---|---|---:|---:|---:|---:|
| 7a | 8, 2.5 h, 109 mL/min | 55 / 18 | 23.03 / 4.86 | 23.03 / 4.86 | 23.03 / 4.86 |
| 7b | 15, 4.5 h, 51 mL/min | 120 / 38 | 31.22 / 12.87 | 30.10 / 12.06 | 30.10 / 12.06 before the switch, or 26.57 / 10.14 after one 12 h interval |
| 7c | 29, 21 h, 35 mL/min | 11 / 11 | 4.95 / 5.30 | 4.75 / 5.01 | 3.93 / 4.04 after 12 days of dosing every 12 h |

Both analytes remain underpredicted. Accounting for the longer interval lowers predicted concentrations at 7c. At 7b, imposing a constant CrCl of 10 or 15 mL/min throughout the simulated dosing history gives acyclovir of 142.89 or 108.45 µmol/L, respectively. The corresponding CMMG values are 151.87 and 89.13 µmol/L, versus 38 measured. These runs assume sustained impairment and cannot estimate instantaneous filtration or establish the cause of the renal decline.

## Reconstruction

Run `node research/validation/lindstrom-patient7-course.cjs` from the repository root. The engine blob used here was `17971df66e0a97b4d382572a582d35c444a3c83f`.

- The model uses a 76 kg man aged 65, IV acyclovir 1,140 mg infused over an assumed hour, no dialysis, and fixed default parameters. The analysis does not model foscarnet exposure or interactions.
- Each visit has its own reconstruction. For placing the three CrCl estimates on a common time axis, assume the last dose began at the start of the stated treatment day and add the published lag. Hold CrCl at 109 mL/min up to the first sample and interpolate linearly between samples. The constant comparator holds the current visit’s estimate throughout.
- The supplement gives approximate durations. The timing of the interval change relative to 7b is uncertain. The two 7b scenarios place the change after that sample or one dosing interval before its last dose. At 7c, count back 24 intervals of 12 hours from the last dose, with 8-hour spacing before that. Allow 21 hours after the last dose without giving a further dose. The source does not provide an administration log to align the three visits into a single exact schedule.
- Each run starts with zero drug at the beginning of treatment or up to 312 hours before the last dose. Repeating the measured-CrCl scenarios with a 240-hour history changes both sample concentrations by less than 0.001 µmol/L. Halving the integration step from 0.25 to 0.125 hours changes the reported predictions by less than 0.1%.
