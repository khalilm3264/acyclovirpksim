# AyFlux source review (not deployed)

Start with [index.modular.html](index.modular.html). The application has been separated into:

- [css/ayflux.css](css/ayflux.css) — application styles
- [js/pk-engine.js](js/pk-engine.js) — pharmacokinetic calculations
- [js/app.js](js/app.js) — UI and plotting logic
- [vendor/plotly-basic.min.js](vendor/plotly-basic.min.js) — upstream minified Plotly bundle, intentionally left minified

The original combined source is preserved as [index.readable.html](index.readable.html). All files are **review copies**, not replacements for the deployed `public/index.html`. Line breaks were inserted using conservative text-based rules, not an AST-based formatter; some long lines remain, and these files have **not been browser-tested**. In particular, Plotly remains minified and may be difficult to view in GitHub. Test the simulation and dialysis calculations before deploying any review copy.
