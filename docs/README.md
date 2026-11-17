# AyFlux documentation

## Use the simulator

| Task | Guide |
| --- | --- |
| Run a first example and compare a published dataset | [Quick start](quickstart.md) |
| Enter settings and use the charts | [User guide](https://ayflux.org/learn/) |
| Review equations, units and limitations | [Model methods](https://ayflux.org/learn/model-methods/) |
| Find a paper or cite the software | [References](https://ayflux.org/references/) · [Citation](../CITATION.cff) |
| Compare exported curves with another program | [Data exchange](data-exchange.md) · [Model comparisons](research-model-comparison.md) |

## Inspect or develop the software

| Task | Starting point |
| --- | --- |
| Find the model, page controller and chart code | [Reading the code](reading-the-code.md) |
| Reproduce a published-data reconstruction | [CAPD example](../research/validation/README.md) · [Study scripts](../research/validation/) |
| Inspect the independent equation implementation | [mrgsolve reference](../interop/ayflux_reference.cpp) · [Comparison runner](../interop/compare_mrgsolve.R) |
| Propose a change | [Contributor guide](../CONTRIBUTING.md) |
| Build or deploy the site | [Local setup](../README.md#run-locally) · [Deployment](deployment.md) |

Use an exact release tag or commit when reproducing a result. A source-data comparison, numerical regression test and independent solver comparison answer different questions; none alone establishes clinical predictive validity.
