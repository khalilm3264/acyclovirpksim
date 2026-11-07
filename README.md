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

The GitHub Pages workflow also publishes `./public`. On pull requests it runs tests; on pushes to `main`, it deploys to GitHub Pages only if tests pass. Cloudflare deployments are configured separately and are not automatically gated by this GitHub Pages workflow.

## License and safety

AyFlux source: GNU Affero General Public License v3.0, see [LICENSE](LICENSE). Third-party libraries retain their own licenses.

**Educational use only.** Not for clinical prescribing, dosing decisions, or patient care.
