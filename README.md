# AyFlux

AyFlux is a browser-based simulator for exploring acyclovir and valacyclovir pharmacokinetics, kidney function and dialysis. Enter a dose history and dialysis schedule to compare predicted plasma concentrations, CMMG exposure and CSF concentration estimates.

**[Open AyFlux](https://ayflux.org/)** · [User guide](https://ayflux.org/learn/) · [Methods](https://ayflux.org/learn/model-methods/) · [References](https://ayflux.org/references/)

AyFlux is for education and exploratory research. It has not been validated for prescribing, dialysis decisions or diagnosis of neurotoxicity.

## Source and reproducibility

| Purpose | Location |
| --- | --- |
| Read the model and application code | [Code guide](docs/reading-the-code.md) · [Readable model](src/model/pk-engine.js) |
| Review published-data comparisons | [Validation scripts and notes](research/validation/README.md) |
| Check the independent implementation | [mrgsolve reference](interop/ayflux_reference.cpp) |
| Cite an exact version | [Citation metadata](CITATION.cff) · [Releases](https://github.com/khalilm3264/acyclovirpksim/releases) |

The model, scientific assumptions, validation records and tests are public so results can be inspected and reproduced. Unpublished editorial planning and licensed literature full texts are maintained separately. Removing a file from the current tree does not remove earlier public Git history.

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

[Contributing](CONTRIBUTING.md) · [Release history](CHANGELOG.md) · [License](LICENSE) · [Third-party notices](THIRD_PARTY_NOTICES.md)
