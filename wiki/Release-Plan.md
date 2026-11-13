# Release and verification plan

## Versioning

AyFlux uses semantic-style versions for app releases, e.g., `v0.25.0`. Its configuration `schemaVersion: 2` is separately tracked; an application release does not automatically change the file schema. The GNU AGPLv3 is the **license** version, not the application version.

## Before merging

- [ ] Explain the change, including intended model or interface behavior.
- [ ] Keep existing saved configurations readable; if a new config field is optional, supply a documented default.
- [ ] Run `node --test tests/*.test.cjs` and JavaScript syntax checks.
- [ ] Test example zero-renal-clearance, normal CrCl, HD, PD, CRRT, oral and IV scenarios.
- [ ] For numerical changes, compare against previous constant-input outputs and check mass balance and convergence.
- [ ] Ensure UI fields validate units, ranges, event order and missing values.
- [ ] Review desktop/mobile Firefox and Chrome layouts, footer position and accessibility.
- [ ] Do not include protected health information or secrets in screenshots, demos or exports.
- [ ] Update `CHANGELOG.md`, `CITATION.cff`, documentation and export labels when a new release is issued.

## After merging

- [ ] Verify the GitHub Actions test and Cloudflare deployment jobs.
- [ ] Check https://ayflux.org/ in a browser, including the Research tools tab, CSV import/export and print report.
- [ ] Check service-worker update and an offline reload after the site has been successfully cached.
- [ ] Confirm help pages, citation, license, source links and custom-domain email contact.
- [ ] Create a GitHub release tag only after the production site and release artifacts are checked.

## Future milestones

**Milestone A — reliable research UX:** formalize input-validation tests, dynamic kidney profile tests, uniform layout, explicit units and accessibility.

**Milestone B — reproducible model comparison:** schema-documented result exchange, model/source identifiers, curated example comparisons, R workflows and PDF reports.

**Milestone C — external scientific assessment:** obtain appropriately sourced independent empirical datasets, publish prespecified evaluation criteria, distinguish fitted and held-out results, and disclose limitations.

There are **no fixed dates** for these milestones. None makes AyFlux clinical decision support without further evidence, review and applicable compliance work.

See [Roadmap](Roadmap) · [Home](Home).

