# Development roadmap

This is a **living plan**, not a promise of release dates, clinical utility, or completion. The priority is scientific transparency, reliable numerical behavior, and a compact interface.

## v0.21.0 preview additions

- An optional user-entered CrCl time trajectory, interpolated into the acyclovir and CMMG renal elimination models
- A dual-axis CrCl / modeled renal drug-clearance chart instead of an uninformative constant renal-clearance trace
- A single CSV export button with a format selector; detailed CSV includes the entered CrCl at every time sample
- Uniform spacing between sidebar fields, buttons, blocks and mobile layouts; short-page footer alignment
- A refreshed GitHub README, roadmap and verification documentation

The CrCl trajectory is a **hypothetical model input**, never a prediction of kidney injury or recovery.

## Scientific follow-up following the source audit

**Priority P0: review and recalibrate the exploratory CSF CMMG partition parameter.** AyFlux currently defaults to 0.25, whereas [Smith et al., 2010 (PMID 20038622)](https://pubmed.ncbi.nlm.nih.gov/20038622/) reported CSF/plasma AUC ratios around 0.025 for CMMG in a very small cohort. These are not perfectly equivalent estimands, but the order-of-magnitude difference means current simulated CSF CMMG results should remain explicitly caution-labeled. Do not silently replace a model coefficient or treat one small study as sufficient validation: define a parameter-identification and independent-evaluation protocol first.

**Priority P1: expand the mrgsolve model-equation parity suite** from single IV, no dialysis to repeated dose events, HD transitions, oral valacyclovir, and then PD mass-transfer conservation; keep each extension independently testable.

**Priority P1: make a matched OSPSuite aciclovir PBPK comparator** with a documented individual, administered route, time horizon, total versus unbound plasma output and renal physiology. Compare only after these are aligned, and distinguish model structural differences from numerical errors.

## Current / near-term

| Priority | Workstream | Deliverable | Definition of done |
| --- | --- | --- | --- |
| P0 | Reliability | Verify dynamic CrCl and existing constant renal clearance | Old configurations load unchanged; 0 CrCl means zero renal clearance; correct time-dependent renal and CMMG terms; mass-balance and convergence tests |
| P0 | Browser usability | Uniform spacing, footer alignment, compact export controls | Firefox, Chrome and mobile smoke tests; controls don't overflow; clear labels and keyboard access |
| P0 | Model integrity | Stronger numerical diagnostics | Time-grid checks, dose event boundaries, PD drain accounting, anomaly reporting and unit tests |
| P1 | Reproducibility | Versioned research export bundle | All parameters, medication/dialysis events, units, model version, result time series and assumptions included |
| P1 | Data exchange | Broader PK-Sim/MoBi result CSV compatibility | Configurable column mapping, unit conversion, transparent interpolation, error metrics and tests with sample exports |
| P1 | References | Auditable parameter/source table | Each PK parameter lists units, nominal value, uncertainty assumption, evidence source and limitations |
| P1 | Reporting | Research summary improvements | Clear scenario assumptions, charts, interval labels, source citations, limitations, and printable PDF |
| P2 | Offline | Install and offline UX verification | Cached public assets update safely; no patient/CSV data are sent to servers |
| P2 | Accessibility | Contrast and assistive-technology review | Focus/labels, keyboard navigation, chart alternatives, reduced-motion consideration |

## Research-oriented extensions to investigate

- **Renal trajectory editor:** interpolate user-entered CrCl time points, optionally display entered CrCl and modeled renal clearance on separate axes, and show concentration changes without implying a renal recovery forecast.
- **HD and CRRT:** investigate time-varying prescriptions, interruptions, delivered treatment, post-dialysis rebound and extracorporeal model parameter provenance.
- **PD:** refine per-exchange dwell/fill, membrane mass balance and dialysate concentration comparisons using public measurements.
- **CMMG and CNS:** explicitly separate observed exposure–toxicity associations from speculative CNS model assumptions; assess parameter identifiability.
- **Open Systems Pharmacology:** explore whether a mapping to OSP models is scientifically meaningful. Native PK-Sim/MoBi import/export is **not currently supported**.
- **Educational case library:** synthetic examples illustrating how parameter changes alter modeled concentrations, without dosing recommendations.

## Validation criteria before any clinical claims

1. Publish equations, units, nominal parameters and uncertainties, with primary citations.
2. Test conservation of mass, time-step convergence, event boundaries, zero renal clearance, and negative states.
3. Use independent measurements not used for fitting, with a prespecified analysis protocol and disclosed cohort properties.
4. Quantify prediction error, calibration and generalizability and explicitly characterize failure cases.
5. Obtain domain-expert and appropriate regulatory/clinical review before making any patient-care claims.

**No validation plan or comparison between two simulators should be represented as evidence of clinical readiness.**

## How to propose a change

Create a [feature request](https://github.com/khalilm3264/acyclovirpksim/issues/new/choose) describing the use case, units, input/output examples, primary references, failure cases, and a feasible test. Source changes should follow [CONTRIBUTING.md](https://github.com/khalilm3264/acyclovirpksim/blob/main/CONTRIBUTING.md).
