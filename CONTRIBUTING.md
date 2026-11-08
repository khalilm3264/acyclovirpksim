# Contributing to AyFlux

Thank you for helping improve AyFlux, an **educational** acyclovir and valacyclovir pharmacokinetic simulator. AyFlux is **not clinically validated** and must not be used for patient dosing, diagnosis, dialysis prescriptions, or care decisions.

## Before proposing a change

1. Search existing issues, and open a discussion/issue before starting large model or interface changes.
2. Describe the problem, the proposed behavior, and why it helps educators or researchers.
3. For pharmacokinetic assumptions or clinical statements, cite primary sources (DOI, PMID, or stable publication URL), distinguish measurements from estimates, and state uncertainty and limitations.
4. Do not submit patient-identifying information, real patient datasets without appropriate permission, API tokens, or other secrets.

## Development and pull requests

- Work on a branch; open a focused pull request against `main`. Avoid committing directly to `main`.
- Use **Node.js 22 or newer**. Run `node --test tests/*.test.cjs` and `node --check` on changed JavaScript files.
- Explain any changes to pharmacokinetic equations, units, default values, dialysis scheduling, CMMG or CSF estimates. Add regression tests covering expected and boundary behavior.
- Keep units explicit in code, graphs, CSV columns, and docs: e.g., hours, mg/L, mL/min, and mg/hour. Do not silently convert values.
- Preserve renal edge cases such as zero renal clearance at `CrCl = 0`, and prevent impossible or unphysical negative concentrations from silently reaching users.
- Maintain plain-language educational disclaimers, responsive layouts, colorblind-accessible charts, accessible labels, and keyboard usability.
- Update documentation and data-exchange schema notes when adding or changing exported data.
- Do not add third-party libraries or assets without recording their licenses in `THIRD_PARTY_NOTICES.md`.
- Keep the current AGPL-3.0-only license notices for first-party code; do not modify the verbatim `LICENSE` text.
- Do not commit generated files containing personal health information. Assume uploads and exports may be shared.

## Medical and scientific guardrails

AyFlux is an exploratory teaching model, not a source of validated therapeutic or toxicity thresholds. Avoid wording that turns predicted plasma, CSF, or CMMG concentrations into clinical recommendations. Review claims about renal function and different dialysis modalities against primary literature. New model functionality should explain its data provenance, parameter ranges, assumptions, verification, and remaining validation gaps.

## CSV, PK-Sim, MoBi, and R

- Changes to exchange files should preserve the documented time/units schema or introduce a clearly versioned schema.
- Verify CSV interoperability with representative exported files and tests, including quotation, missing values, header variants, and units.
- **Do not label AyFlux CSV exports as native PK-Sim/MoBi models.** Open Systems Pharmacology uses `.pkml` for model exchange; AyFlux supplies results tables, not equivalent mechanistic models.
- A PK-Sim/MoBi results CSV used for comparison is not clinical validation, and curves from different model structures need careful alignment of dosing, units, compartments, and patient assumptions.

## Reporting security concerns

Please **do not** post vulnerabilities or credential disclosures in public issues. Use [contact@ayflux.org](mailto:contact@ayflux.org) for responsible disclosure. We cannot promise a fixed response time; do not send secrets or identifiable patient data.

## License

By contributing, you agree to provide your contribution under the repository's **GNU AGPLv3-only** license and confirm you have the right to submit it. Preserve attribution and applicable third-party notices.

Project source: https://github.com/khalilm3264/acyclovirpksim
