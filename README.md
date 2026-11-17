# AyFlux

[![Build and tests](https://github.com/khalilm3264/acyclovirpksim/actions/workflows/pages.yml/badge.svg?branch=main)](https://github.com/khalilm3264/acyclovirpksim/actions/workflows/pages.yml)

AyFlux is a browser-based simulator for exploring acyclovir and valacyclovir pharmacokinetics, kidney function and dialysis. Enter a dose history and dialysis schedule to compare predicted plasma concentrations, CMMG exposure and CSF concentration estimates.

**[Open AyFlux](https://ayflux.org/)** · [User guide](https://ayflux.org/learn/) · [Methods](https://ayflux.org/learn/model-methods/) · [References](https://ayflux.org/references/)

AyFlux is for education and exploratory research. It has not been validated for prescribing, dialysis decisions or diagnosis of neurotoxicity.

## Getting started

Open the simulator, enter a dose history and dialysis schedule, then inspect the plasma acyclovir graph. Use **Compare with a published study** to overlay a source dataset. The study notes distinguish measured concentrations, author-fitted values and reconstructed inputs.

[First-use walkthrough](docs/quickstart.md) · [Documentation](docs/README.md)

## Source and reproducibility

| Purpose | Location |
| --- | --- |
| Read the model and application code | [Code guide](docs/reading-the-code.md) · [Readable model](src/model/pk-engine.js) |
| Review published-data comparisons | [Validation scripts and notes](research/validation/README.md) |
| Check the independent implementation | [mrgsolve reference](interop/ayflux_reference.cpp) |
| Cite an exact version | [Citation metadata](CITATION.cff) · [Releases](https://github.com/khalilm3264/acyclovirpksim/releases) |

The model, scientific assumptions, validation records and tests are public so results can be inspected and reproduced. Licensed literature full texts are not distributed with the software.

## Run locally

Requires Node.js 22 or later.

```sh
git clone https://github.com/khalilm3264/acyclovirpksim.git
cd acyclovirpksim
npm ci --ignore-scripts --no-audit --no-fund
npm run stage
npx --yes http-server@14.1.1 public -a 127.0.0.1 -p 8000
```

Open `http://localhost:8000`. For a smaller interface, use [AyFlux Lite](https://ayflux.org/lite/). Run `npm test` for the regression suite. Run `npm run build:site` to prepare the compact deployment in `dist/site`.

[Report a problem](https://github.com/khalilm3264/acyclovirpksim/issues/new/choose) · [Contributing](CONTRIBUTING.md) · [Release history](CHANGELOG.md) · [License](LICENSE) · [Third-party notices](THIRD_PARTY_NOTICES.md)
