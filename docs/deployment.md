# Deploying AyFlux

This document preserves the deployment setup for the Cloudflare Worker and the GitHub Pages mirror. Review credentials and scopes carefully.

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


## Pre-release checklist

- Run `node --test tests/*.test.cjs` and check syntax of changed JavaScript files.
- Verify the site in Firefox and a mobile-sized viewport, including the footer, research CSV import, and print view.
- Confirm `CLOUDFLARE_DEPLOY_ENABLED` is configured intentionally, never disclose API tokens, and review the Cloudflare deployment job after merging.
- Visit the live site after deployment and ensure that version/citation, learning guides and footer links work.
