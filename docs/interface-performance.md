# Interface performance verification

The PK engine and its equations are unchanged. This update optimizes UI work around it.

## Controlled before/after checks

Baseline source: commit `062cdf9b69840fbfe2c6bb4de73f74f08762bb07`.

| Fixture | Before | After |
| --- | --- | --- |
| 50 identical requests, 120 draws, three scenarios; already-warm engine plus structured-clone transfer | 50 worker-equivalent jobs; 46.67 ms | 0 jobs; 1.96 ms |
| Numeric input event followed by change with the same value | 2 scheduled updates | 1 scheduled update |
| Four concentration charts, with two near the viewport | 4 trace-building jobs | 2 jobs; others deferred until approached |

Times are a single local Node measurement, not browser loading or device performance claims. The repeated-request fixture models warm engine calls plus result cloning; it excludes actual worker scheduling, rendering, network transfer and cold initialization. Results vary by machine. Cache reuse applies only when numerical settings and the fitting scenario match and every requested scenario is present. The three-entry cache is session-only and may evict older runs.

Reproduce by obtaining the previous simulator-ui.js from the baseline commit and running:

```sh
node scripts/benchmark-interface.cjs /path/to/previous-simulator-ui.js
node --test tests/baseline-performance.test.cjs
```

The regression suite covers invalidation after dose/coverage/observation/scenario changes, scenario retention, bounded eviction, obsolete results, duplicate input events, frozen baseline data, scroll-triggered plots and browsers without IntersectionObserver. `scripts/check-visualizations.cjs` additionally checks baseline capture/clear, cached-setting reuse, deferred charts and desktop/mobile page width in Chromium.

Local browser launch was blocked by the executor's socket restriction. GitHub Actions runs the browser suite with the staged Plotly assets. No cold page-load or real input-to-paint timing is claimed by these local measurements.
