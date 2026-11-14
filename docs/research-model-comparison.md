# Independent model comparisons: AyFlux, mrgsolve and OSPSuite-R

> **For educational research and software verification only.** These workflows do not validate a patient-specific model or dosing regimen. Published reference curves, model-to-model similarity, and solver agreement are distinct evidence categories.

## 1. mrgsolve: independent implementation of the same equations

Files:

- `interop/ayflux_reference.cpp` — a compact **C++ ODE definition for mrgsolve**, independently coded from the equations in `public/assets/pk-engine.js`.
- `interop/compare_mrgsolve.R` — run and compare deterministic IV curves.
- `interop/fixtures/iv_700mg_constant_crcl50.csv` — AyFlux RK4 output, 700 mg IV over 1 h, single dose, 70 kg, CrCl 50 mL/min, 24 hours.
- `interop/fixtures/iv_700mg_dynamic_crcl50_to10_to95.csv` — same regimen with user-entered CrCl knots `(0 h,50), (12 h,10), (24 h,95)`.
- `interop/fixtures/iv_700mg_anuric_hd8_to12.csv` — same regimen with CrCl 0 and HD at 81.8 mL/min from 8 to 12 h, followed through hour 24. The nominal CMMG dialysis-clearance multiplier is 1.

Run from the repository root with R and a working C++ toolchain:

```r
install.packages("mrgsolve")
```

```bash
Rscript interop/compare_mrgsolve.R
```

The script writes comparison CSVs to `interop/results/` and prints acyclovir/CMMG RMSE, max absolute difference, and normalized RMSE. Its **2% normalized RMSE investigation threshold** is only a unit/regression check: not a clinical equivalence margin or proven scientific accuracy. mrgsolve uses its own ODE solver; AyFlux uses RK4 integration with event boundaries. Small solver discrepancies are expected.

The three fixtures cover nominal IV acyclovir and plasma CMMG with constant CrCl, a piecewise-linear CrCl profile, or one anuric HD session. The HD fixture includes the pre-HD distribution phase, dialysis and twelve hours of follow-up. At hours 8, 12 and 24 its parent concentrations are 10.173, 5.491 and 4.248 mg/L, with CMMG at 6.028, 3.970 and 6.564 mg/L.

`node interop/check-mrgsolve-fixtures.cjs` checks all 97 time points per case against the current production engine before CI runs the independent R comparison.

The parameters for this comparison are directly copied as a hypothesis from AyFlux, not independently estimated from patient data. Agreement therefore means **implementation parity**, not independent pharmacokinetic validation.

Official API documentation: [mrgsolve model specifications](https://mrgsolve.org/user-guide/specification.html), [mread](https://mrgsolve.org/docs/reference/mread.html), [ev infusion events](https://mrgsolve.org/docs/reference/ev.html).

## 2. OSPSuite-R: compare a different PBPK model

File: `interop/compare_ospsuite.R`.

Use the [official OSPSuite-R installation instructions](https://www.open-systems-pharmacology.org/OSPSuite-R/); the package requires its supported R and operating-system runtime environment. Its Aciclovir example `.pkml` is distributed with the ospsuite package.

```bash
Rscript interop/compare_ospsuite.R
```

Optionally, supply a reviewed PK-Sim/MoBi simulation exported as `.pkml`:

```bash
Rscript interop/compare_ospsuite.R /path/to/aciclovir-model.pkml
```

The script uses the official `loadSimulation()`, `runSimulations()`, and `getOutputValues()` APIs, checks the returned unit metadata, converts time to **hours** and acyclovir concentration to **mg/L**, then writes `interop/results/ospsuite_aciclovir_plasma.csv`.

Import that CSV at [ayflux.org](https://ayflux.org/) > **Research tools** > **Compare an external PK-Sim / MoBi CSV**. Select `time_hours`, `concentration_mg_L`, hours, mg/L, plasma acyclovir, and compare.

**Crucial limitation:** the supplied OSPSuite Aciclovir example is *not* guaranteed to match AyFlux's current dose, route, simulated individual, kidney function, plasma location or duration. This script creates a comparable **unit convention and plotting artifact**, not a scientifically matched study or a valid clinical RMSE. Before drawing model comparisons, explicitly match the regimen, individual, molecular species (total vs unbound) and plasma sampling compartment in PK-Sim/MoBi, or document every difference.

The default OSP output path is `Organism|PeripheralVenousBlood|Aciclovir|Plasma (Peripheral Venous Blood)`, per official documentation. If a different model lacks this path, the script stops rather than silently substituting a dissimilar compartment. Alternative outputs and their units must be reviewed explicitly.

Official examples: [OSPSuite-R simulation guide](https://www.open-systems-pharmacology.org/OSPSuite-R/articles/run-simulation.html), [getOutputValues reference](https://www.open-systems-pharmacology.org/OSPSuite-R/reference/getOutputValues.html).

## 3. Evidence versus model assumptions

- Original measured PK evidence includes [Laskin et al., 1982, renal-failure kinetics](https://pubmed.ncbi.nlm.nih.gov/7075109/) and [Burgess & Gill, 1990, CAPD](https://pubmed.ncbi.nlm.nih.gov/2243158/).
- [Smith et al., 2010](https://pubmed.ncbi.nlm.nih.gov/20038622/) measured plasma/CSF acyclovir and metabolites in a small healthy/CKD cohort. Their CSF/plasma AUC ratio for **CMMG was about 0.025**. AyFlux used 0.25 until #47 and now uses 0.025. Lindström 2019 is the independent check (`research/validation/LINDSTROM-CSF.md`): 0.025 fits every sample with an intact blood–brain barrier, but CSF CMMG runs several times higher with barrier damage, which AyFlux does not model.
- [Shah et al., 1986](https://pubmed.ncbi.nlm.nih.gov/3717158/) provides an additional CAPD case study but is not proof of AyFlux's PD mass-transfer assumptions.

The user-facing [equation and parameter provenance guide](https://ayflux.org/learn/model-methods/#equations) identifies coded formulas and which constants remain illustrative. If any numerical parameter is changed, update both the independent model, deterministic fixtures and expected output, documenting a rationale with sources and tests.

## Status and reproducibility

The three deterministic AyFlux CSV fixtures are generated from the existing browser PK model with `variability = 0` and `draws = 1`. The comparison scripts are **separate, optional research tools**, not website/server dependencies, and require local installation of their R packages. This repository does not distribute the OSPSuite Aciclovir PBPK model itself.

`Rscript interop/compare_mrgsolve.R` can be run in CI to verify mathematical parity. OSPSuite-R requires a separate approved environment and remains a manual workflow; no claim of completed PBPK validation is made merely by shipping the script.
