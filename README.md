# AyFlux

**Preview release: v0.20.0 · configuration schema 2 · AGPL-3.0-only.** See [CHANGELOG.md](CHANGELOG.md). This is an educational, not clinically validated application.

AyFlux is an educational acyclovir and valacyclovir pharmacokinetics simulator covering kidney function, intermittent hemodialysis, peritoneal dialysis, and CRRT.

## Project structure

- `public/index.html` — simulator interface and styles
- `public/assets/vendor/plotly-basic-3.3.1.min.js` — locally hosted Plotly Basic v3.3.1 (third-party MIT-licensed code)
- `public/assets/pk-engine.js` — pharmacokinetic modeling engine
- `public/assets/simulator-ui.js` — simulator interactions, rendering, and configuration handling
- `public/assets/ayflux-exchange.js` — versioned, tidy CSV result export for R/OSP comparison
- `public/assets/osp-import.js` — local CSV parser, explicit unit mapping and curve comparison
- `public/assets/research-workspace.js` and `model-integrity.js` — optional research and numerical quality tools
- `public/sw.js` and `manifest.webmanifest` — static offline app shell and install metadata
- `public/assets/simulator-worker.js` — same-origin background calculation worker
- `public/learn/` — educational documentation
- `src/index.js` — Cloudflare Worker security headers and site metadata
- `tests/` — dependency-free model and site regression tests
- `interop/` — base-R CSV comparison helper; `docs/data-exchange.md` describes the result schema

The browser loads Plotly, the PK engine, the CSV exchange helper, release metadata, numerical helpers, the OSP CSV parser, the simulator interface, optional research workspace, and offline registration **in that order**. JavaScript runs from same-origin files instead of inline script blocks, matching the Worker's `script-src 'self'` Content Security Policy. Styling remains inline in the main HTML, allowed by the Worker's existing style policy.

## Development

You can serve `public/` with a local static server. To run the automated checks, use Node.js 22 or newer:

```sh
node --test tests/*.test.cjs
```

The test suite covers loading order, Content Security Policy compatibility, key dosing/renal rules, and basic simulation behavior across dialysis modes. It **does not replace** browser testing or external clinical validation.

## Deployment

Cloudflare Wrangler uses `./public` as the assets directory (see `wrangler.jsonc`).

GitHub Actions runs syntax checks and pharmacokinetic regression tests on pull requests and pushes to `main`. Only successful pushes can deploy. The same workflow retains GitHub Pages hosting and can deploy the Cloudflare Worker.

### Enable test-gated Cloudflare deployments

The GitHub workflow is ready, but **Cloudflare deployment is disabled until explicitly enabled**. Do these steps in order:

1. In Cloudflare, create a **new scoped API token** using the **Edit Cloudflare Workers** template (or the smallest Worker Editor permissions sufficient to deploy the existing `acyclovpksim` Worker). Revoke any token previously disclosed outside a secure secret store.
2. Find your Cloudflare account ID in the Cloudflare dashboard.
3. In this GitHub repository, visit **Settings → Secrets and variables → Actions → Secrets**, and add repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Never commit these values to source files or paste the API token into chat.
4. Disable the existing Cloudflare **Worker Git-triggered builds** (Cloudflare → Workers & Pages → `acyclovpksim` → Settings → Builds → **Disconnect**). This leaves the existing deployment and custom domain in place, but prevents Cloudflare from deploying pushes before GitHub's tests finish.
5. In GitHub, visit **Settings → Secrets and variables → Actions → Variables** and create the **repository variable** `CLOUDFLARE_DEPLOY_ENABLED` with value `true`. The variable only enables the deployment job; it is not a secret.
6. Go to **Actions → Test and deploy AyFlux → Run workflow** on `main`. Verify the `test` job passes before `deploy-cloudflare` succeeds. The deployment uses `wrangler.jsonc` to update the existing Worker. No secrets are needed in the source code.

If the variable is unset or not `true`, the Cloudflare deployment job is skipped, while tests and GitHub Pages continue. If it is enabled but either secret is missing, deployment fails **before invoking Wrangler** with a clear error.

After activation, each push to `main` deploys Cloudflare only after tests pass. Pull requests run tests but never deploy. This protects against regressions caught by the test suite, not all possible browser or clinical issues.

## Data exchange and community contributions

AyFlux can export a detailed CSV and a tidy concentration–time CSV with explicit hours, analyte, scenario, statistic, and mg/L units. The new **Export R / OSP CSV** button is designed for analysis and comparison in R with separately exported PK-Sim or MoBi data. It does **not** export `.pkml` or other OSP model/project files.

- [CSV and R / PK-Sim / MoBi comparison guide](docs/data-exchange.md)
- [Public data exchange guide](https://ayflux.org/learn/interoperability/)
- [Contributing guidelines](CONTRIBUTING.md) and [security reporting](SECURITY.md)

## Research workspace (v0.20.0 preview)

The Research tools tab offers local PK-Sim/MoBi CSV comparisons (with manual column/unit mapping), an exploratory CrCl × HD-clearance heatmap, model-array consistency and time-step diagnostics, an aggregate published-study reference catalog, and a browser print report (choose **Save as PDF**).

These comparisons are **not** native OSP file imports, patient-level validation, or a substitute for clinical advice. The offline service worker caches only public static files on the ayflux.org origin; uploaded CSV contents and configurations are not cached or uploaded by this feature. First online load is required before offline use. Installation support depends on browser features.

## License and safety

AyFlux source: GNU Affero General Public License v3.0 only (AGPL-3.0-only), see [LICENSE](LICENSE). Third-party libraries retain their own licenses.

Project contact: [contact@ayflux.org](mailto:contact@ayflux.org). Website: [ayflux.org](https://ayflux.org/). Source and project copyright notices are in [NOTICE](NOTICE).

**Educational use only.** Not for clinical prescribing, dosing decisions, or patient care.

## Public documentation

The site provides an educational model guide, a separate medical disclaimer at `/disclaimer/`, software citation at `/cite/`, and open-source license notices at `/license/`. The repository root now includes `CITATION.cff`, `NOTICE`, and `THIRD_PARTY_NOTICES.md`. The standard GNU AGPL license text in `LICENSE` remains unchanged.

Terms of Use and Privacy Policy drafts remain outside `public/` pending an accurate public contact address and verification of the live hosting/privacy configuration; they are **not** yet a substitute for attorney review. See `drafts/README.md`.
