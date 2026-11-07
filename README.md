# AyFlux

AyFlux is an educational acyclovir and valacyclovir pharmacokinetics simulator covering kidney function, intermittent hemodialysis, peritoneal dialysis, and CRRT.

## Project structure

- `public/index.html` — simulator interface and styles
- `public/assets/vendor/plotly-basic-3.3.1.min.js` — locally hosted Plotly Basic v3.3.1 (third-party MIT-licensed code)
- `public/assets/pk-engine.js` — pharmacokinetic modeling engine
- `public/assets/simulator-ui.js` — simulator interactions, rendering, and configuration handling
- `public/learn/` — educational documentation
- `src/index.js` — Cloudflare Worker security headers and site metadata
- `tests/` — dependency-free model and site regression tests

The browser loads the Plotly library, PK engine, and interface script **in that order**. JavaScript runs from same-origin files instead of inline script blocks, matching the Worker's `script-src 'self'` Content Security Policy. Styling remains inline in the main HTML, allowed by the Worker's existing style policy.

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

## License and safety

AyFlux source: GNU Affero General Public License v3.0, see [LICENSE](LICENSE). Third-party libraries retain their own licenses.

**Educational use only.** Not for clinical prescribing, dosing decisions, or patient care.
