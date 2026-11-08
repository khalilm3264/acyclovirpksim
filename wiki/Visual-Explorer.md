# Visual explorer

The [visual explorer](https://ayflux.org/explore/) combines two-input parameter grids, selected-scenario curves, drug accounting, and an optional 3D surface. Open it from **Research tools** after a successful main simulation to copy the current settings. A direct visit uses defaults when no copied settings are available.

## Generate a grid

Select different X and Y inputs, their ranges, an output metric, and resolution. Available axes include CrCl, body weight, dose, dose interval, and HD duration. Output choices include plasma acyclovir AUC and peak, peak CSF acyclovir, and peak plasma CMMG.

| Resolution | Simulated scenarios | Use |
| --- | ---: | --- |
| 7 × 7 | 49 | Initial exploration |
| 11 × 11 | 121 | More detail |
| 15 × 15 | 225 | Finer sampling with more calculation |

Each cell is a separate deterministic run over the selected full horizon. The explorer turns off uncertainty sampling and observation fitting. Calculations run in a Web Worker with progress reporting and cancellation.

Some combinations are intentionally unavailable: a CrCl sweep requires constant kidney function; dose and interval sweeps require repeat dosing; HD-duration sweeps require HD and cannot exceed its repeat interval. These constraints prevent changing an input that conflicts with a fixed custom event schedule or profile.

## Inspect a scenario

Select a heatmap cell to calculate its plasma acyclovir, CSF acyclovir, and plasma CMMG curves. Use **Show starting scenario** to return to the copied baseline. Changing grid inputs clears the grid; the previous selected scenario remains below until another selection is calculated, as indicated by its label.

The accounting-time slider changes the displayed drug balance for the selected scenario. The Sankey diagram shows acyclovir-equivalent amounts and is accompanied by an exact-value table and residual check.

Important accounting distinctions:

- Oral input counts model-bioavailable acyclovir equivalent, not the entire tablet mass.
- CMMG formation is cumulative conversion, not the metabolite mass currently present.
- Drug remaining in PD fluid differs from drug discarded at modeled exchange/session boundaries.
- CSF is excluded from this mass balance because it is an effect model, not an integrated mass compartment.
- Remaining central/peripheral amounts avoid double-counting drug that recirculated between compartments.

The diagram is withheld when its mass-balance tolerance check fails.

## Optional 3D surface

Click **Open 3D surface** after generating a grid. This loads the full Plotly bundle only when requested and uses its WebGL surface renderer. X and Y are the selected inputs; height and color represent the selected output.

Dragging rotates the camera and scrolling zooms. Neither reruns the PK grid. Selecting a sampled point opens the corresponding scenario; **Reset 3D view** restores the camera. **Hide 3D** purges the plot to release its rendering resources.

The surface interpolates visually between sampled results. It does not add simulations, estimate an optimum, or show an uncertainty surface. Use the heatmap or CSV for exact sampled values.

## Performance

Grid generation costs grow with the number of scenarios, time horizon, and numerical step requirements. First-use 3D cost also includes downloading and initializing the full chart library. Device, network, browser, and GPU affect actual speed; there is no guaranteed frame rate or loading time.

The heatmap, SVG concentration curves, and SVG accounting diagram work without the optional 3D bundle. If it fails to load or WebGL is unavailable, continue with those views. See [Performance and troubleshooting](Performance-and-Troubleshooting).

[Home](Home)
