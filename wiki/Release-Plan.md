# Release and verification plan

## Release identity

The current application metadata identifies **v0.27.0 preview** (released 2026-11-13, [#55](https://github.com/khalilm3264/acyclovirpksim/issues/55)). Configuration schema 2 and AGPL-3.0-only are tracked separately.

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

## Model baseline after the CMMG updates

For the merged model after #85 and #88–#90, the reference revision is `bcee70c0c3498c5c406a3a02c499599efb4f6198`. This identifies a model baseline for reproduction. The manuscript freeze remains tracked in #48.

Record the engine blob as well as the commit. From a clean checkout of the reference revision:

```sh
git checkout --detach bcee70c0c3498c5c406a3a02c499599efb4f6198
git hash-object public/assets/pk-engine.js
node --version
node research/validation/evidence-scorecard.cjs scorecard.csv
node research/validation/ablation-study.cjs ablation.csv
node research/validation/lindstrom-csf.cjs
```

Use Node 24 when reproducing the stored research results and record its full version. Install the locked site dependencies with `npm ci` before running the full site suite. The CSV citation numbers follow the website bibliography, so map them to manuscript references by study identifier and DOI.

The manuscript should distinguish the historical Python case studies, the #85 serum-CMMG revision, the #88 intact-barrier default and the #89 fitted damaged-barrier preset. Recompute CSF CMMG figures with the chosen final model. In an updated analysis, 0.025 is the default and 0.25 can be labeled as the previous setting. Archive each figure's inputs and plotted values beside its model revision.

PR #86 supplies an exchange inspector and replay download. Publish its user-facing wiki entry after the page is deployed. Confirm the production page and the downloaded values before marking this release item complete.
