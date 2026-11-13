# Release and verification plan

## Release identity

The current application metadata identifies **v0.26.0 preview**. The main branch includes later changes; **v0.27.0 is planned** under [#55](https://github.com/khalilm3264/acyclovirpksim/issues/55). Configuration schema 2 and AGPL-3.0-only are tracked separately.

## Before merging

- [ ] Describe the actual behavior and identify dependencies or overlapping PRs.
- [ ] Keep existing configuration files readable and validate imported values and units.
- [ ] Run syntax checks and the relevant regression, numerical and browser suites.
- [ ] For model changes, test CrCl zero, IV/oral dosing, HD/PD/CRRT, event boundaries, mass balance and time-step convergence.
- [ ] Distinguish original observed samples, source-author fitted estimates, reconstructed inputs and synthetic results.
- [ ] Update user guidance, source notes and bibliography where behavior or evidence changes.
- [ ] Check mobile layout, keyboard access, exports, share links and offline behavior when affected.

## Before issuing v0.27.0

- [ ] Resolve or explicitly defer release blockers and record remaining scientific limitations.
- [ ] Freeze the manuscript commit and archive the corresponding settings, scripts and outputs ([#48](https://github.com/khalilm3264/acyclovirpksim/issues/48)).
- [ ] Align changelog, application identity, citation files, site labels and export metadata.
- [ ] Run `node scripts/references.cjs --check` and the sitemap check after staging dependencies.
- [ ] Verify CI and deployment, then check the production interface and links.
- [ ] Publish the reviewed wiki pages and confirm they match the source in `wiki/`.
- [ ] Create a version tag/release only after these checks; record the actual release date.

## Reproducibility and interpretation

Numerical verification, matching an external simulator and comparison with measured data are different checks. Report the model version, population, treatment schedule, units, source version, fitting/evaluation split and unavailable inputs. Small cases and author-fitted reference values should retain those labels.

See [Roadmap](Roadmap), [Research modules](Research-Modules), [References](References) and [Home](Home).
