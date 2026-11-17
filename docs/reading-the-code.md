# Reading the AyFlux code

Start with the model, then follow how the page sends settings to it and draws the returned results.

| File | What to look for |
| --- | --- |
| [Readable model](../src/model/pk-engine.js) | `validate` checks settings, `buildDoses` and `scheduleFor` build the treatment course, `drawParams` samples parameters, and `single` solves one curve. `simulateMany` summarizes the repeated draws. |
| [Page controller](../public/assets/simulator-ui.js) | `calculate` submits the current settings. `finishJob` rejects outdated replies. `acceptResults` accepts the current reply, and `curve` prepares the plotted series. |
| [Simulation Worker](../public/assets/simulator-worker.js) | Runs the model outside the page thread and returns the calculation's ID with its results. |
| [Chart controls](../public/assets/charts.js) | Loads the renderer, constructs chart options, and handles zooming and keyboard navigation. |
| [Exchange calculations](../public/assets/ayflux-exchange.js) | Calculates the exchange-level dialysis outputs used by the research views. |
| [Server entry point](../src/index.js) | Serves static assets with the site's security headers. |

In the model, `c` means the entered configuration and `p` means one sampled parameter set. Time is in hours. Drug amounts are in mg, concentrations in mg/L, and model clearance terms in L/h. Entered creatinine clearance is in mL/min. Inside `single`, `a` and `b` are central and peripheral acyclovir amounts; `m` is the CMMG amount. `sc` and `sm` are the CSF concentration proxies, not additional mass pools. The older `RenalPKV7` export name is retained for compatibility; the application release number comes from `ayflux-version.js`.

The model file in `public/assets` is a byte-pinned runtime artifact used by frozen validation protocols. Its readable counterpart is in `src/model`. `npm test` checks that they contain the same executable syntax. Formatting is not a reason to change the frozen model hashes or loosen the validation protocols. Model changes need a separate, documented review.

## Making and checking changes

- `npm run format` formats the authored application JavaScript. The pinned runtime, release metadata, vendor libraries and frozen research artifacts are excluded.
- `npm run format:check` checks the same files without changing them.
- `npm test` checks release metadata, model/source agreement and the regression tests.
- `npm run build:site` prepares `dist/site` for deployment after `npm run stage`. It removes unnecessary JavaScript spacing and comments while retaining license notices. Each compacted file is parsed and compared with its readable source before it is written.
- `node scripts/check-source-equivalence.cjs COMMIT_SHA` compares application syntax with a previous full commit SHA. The readability pass was checked against `a9902d781af86f9d393d40775d2edad7ac51baae`.

Write comments where the reason for a calculation or guard would otherwise be unclear. Keep units and source references next to the relevant assumption. Describe what the code actually does, without adding claims that a result is validated or that a method performs better unless the evidence establishes that.

Licensed literature full texts belong outside this public repository. Ignoring a local folder prevents accidental additions; it does not make tracked files private or remove them from Git history.
