# Research modules and evidence

| Resource | What it evaluates | Scope |
| --- | --- | --- |
| [Adult simulator](https://ayflux.org/) | Entered dosing, kidney function and dialysis scenarios | Exploratory compartmental model with assumed parameters |
| [Visual explorer](https://ayflux.org/explore/) | Mass accounting, parameter grids, sensitivity and optional 3D views | Model behavior; visual agreement is not clinical validation |
| [Pediatric IV module](https://ayflux.org/research/pediatric/) | Published Abdalla model with covariate and Zeng comparisons | Separate model; do not infer pediatric dialysis or neonatal support |
| [Pediatric evidence review](https://ayflux.org/research/pediatric/evidence) | Source-specific support and limitations | Bibliographic/model evidence review |
| [Sampling experiment](https://ayflux.org/research/sampling/) | Exposure and parameter recovery from sampling schedules | Synthetic verification |
| [Published-evidence scripts](https://github.com/khalilm3264/acyclovirpksim/tree/main/research/validation) | CAPD, HD, CRRT, serum and CSF endpoints | Study-specific reconstructions with disclosed unavailable inputs |
| [Independent R workflows](https://github.com/khalilm3264/acyclovirpksim/tree/main/interop) | mrgsolve equation parity and OSP result exchange | Implementation/model comparisons |

## Reading a comparison

Identify whether each reference value is an original observation, a source-author fitted estimate, an aggregate summary or a reconstructed quantity. Match time origin, concentration units, administration route and dialysis prescription. A published case report provides evidence for that case; it does not establish population performance.

CSF CMMG partition and CMMG behavior at CrCl zero remain active scientific issues. The adult CSF filter is an exploratory lagged partition model, not the LeiCNS PBPK model. See [Model methods](https://ayflux.org/learn/model-methods/) and [Roadmap](Roadmap).
