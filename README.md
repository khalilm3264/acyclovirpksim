# AyFlux

AyFlux simulates blood concentrations of acyclovir after intravenous acyclovir or oral valacyclovir. Enter a dose history, body weight, kidney function and a dialysis schedule to see how the predicted concentration changes over time. It also estimates exposure to the metabolite CMMG.

**[Open the simulator](https://ayflux.org/)** · [Lite version](https://ayflux.org/lite/) · [User guide](https://ayflux.org/learn/) · [Scientific sources](https://ayflux.org/references/)

### Start with a published case

On the **Plasma acyclovir** graph, use **Compare with a published study**. Compare the reported blood concentrations with the model curve. In the Boelaert peritoneal dialysis study, look at the concentration just before the next dose. That is where the model and the published estimate can differ even when dialysate recovery appears similar.

AyFlux is for education and pharmacokinetic research. Individual predictions have not been validated for prescribing, dialysis decisions or diagnosis of neurotoxicity.

### Read the paper alongside the code

| What to find | Where to start |
| --- | --- |
| Equations for drug distribution, metabolism and removal | [Model engine](public/assets/pk-engine.js) · [Methods in plain language](https://ayflux.org/learn/model-methods/) |
| Published concentrations and comparisons | [Study definitions](public/assets/study-library.js) · [Validation notes and scripts](research/validation/README.md) |
| Papers and software citation | [Bibliography](public/references/ayflux.bib) · [Cite AyFlux](CITATION.cff) |

### Run locally

With Node.js 22 or later:

```sh
git clone https://github.com/khalilm3264/acyclovirpksim.git
cd acyclovirpksim
npm ci --ignore-scripts --no-audit --no-fund
node scripts/stage-visualizations.cjs
node scripts/stage-poppins.cjs
npx --yes http-server@14.1.1 public -a 127.0.0.1 -p 8000
```

Open `http://localhost:8000`. Run the regression suite with `node --test tests/*.test.cjs`.

[Contributing](CONTRIBUTING.md) · [Release history](CHANGELOG.md) · [AGPL-3.0-only license](LICENSE) · [Third-party notices](THIRD_PARTY_NOTICES.md)

## Reading the code

Start with the [code guide](docs/reading-the-code.md) and the [readable model](src/model/pk-engine.js). Application JavaScript is formatted for review; deployment output stays compact.
