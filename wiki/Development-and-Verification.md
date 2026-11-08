# Development and verification

AyFlux's public interface is a static web application with a shared JavaScript PK engine. The repository also contains deployment code, regression tests, and independent comparison scripts.

## Source map

| Path | Responsibility |
| --- | --- |
| `public/assets/pk-engine.js` | Shared model, schedules, simulation, and uncertainty calculations |
| `public/assets/simulator-ui.js` | Full simulator controls and rendering |
| `public/assets/simulator-worker.js` | Background full-simulator calculation |
| `public/assets/research-workspace.js` | Comparison and reporting tools |
| `public/lite/` | Compact Canvas interface |
| `public/explore/` | Grid planning, worker, SVG views, and optional 3D |
| `public/learn/` | Hosted user and methods guides |
| `interop/` | R and mrgsolve comparison workflows and fixtures |
| `tests/` | Node regression tests |
| `.github/workflows/` | Tests, optional asset staging, and deployment |
| `wiki/` | Source copies of these wiki pages; separate publication is required |

## Run locally

Use Node.js 22 or newer for the test workflow and Python 3 for this example static server:

```sh
git clone https://github.com/khalilm3264/acyclovirpksim.git
cd acyclovirpksim
python3 -m http.server 8000 --directory public
```

Open `http://localhost:8000`. Serve from `public` at the root because the app uses root-relative paths. Opening HTML directly with `file://` can break workers and asset loading.

To include the optional visualization bundles and fonts used by deployment, run the repository's pinned staging commands before starting the server:

```sh
npm install --no-save --ignore-scripts --no-audit --no-fund plotly.js-cartesian-dist-min@3.3.1 plotly.js-dist-min@3.3.1 @fontsource/poppins@5.3.0
node scripts/stage-cartesian.cjs
node scripts/stage-visualizations.cjs
node scripts/stage-poppins.cjs
```

The current [workflow](https://github.com/khalilm3264/acyclovirpksim/blob/main/.github/workflows/pages.yml) is authoritative if pinned versions change.

## Verification layers

| Check | What it establishes |
| --- | --- |
| Syntax and regression tests | Expected behavior for tested code paths and fixtures |
| Mass balance and convergence | Numerical consistency under the tested settings |
| Browser smoke tests | Selected interactions and exports work in the tested browser |
| CodeQL | Static analysis findings for the scanned source |
| mrgsolve parity | Independent implementation agreement within its documented scope |
| OSP curve comparison | Differences between selected model outputs after alignment |
| Independent empirical validation | A separate scientific evaluation; not established by the checks above |

Run the Node suite with:

```sh
node --test tests/*.test.cjs
```

For changes to equations or event handling, exercise zero renal clearance, constant and varying renal inputs, oral/IV events, dialysis transitions, conservation, and time-step convergence. Read [CONTRIBUTING.md](https://github.com/khalilm3264/acyclovirpksim/blob/main/CONTRIBUTING.md) and use a focused branch and pull request.

## Releases and citation

Application identity is in `public/assets/ayflux-version.js`; configuration schema is tracked separately. Keep release metadata, changelog, and citation consistent. Do not confuse application version, JSON schema version, and the AGPL license version.

See [Release plan](Release-Plan), [deployment notes](https://github.com/khalilm3264/acyclovirpksim/blob/main/docs/deployment.md), and [wiki publishing](https://github.com/khalilm3264/acyclovirpksim/blob/main/docs/wiki-publishing.md).

[Home](Home)
