# Mobile Loading-State Usability Audit (iPhone & iPad WebKit Emulation)

Audit date: November 14, 2026.  
Original audit base commit: `4db47d9821ec7e0df71a5ee8929a37e934e28183` (`main`, including merged PR #217).
Target branch: `test/mobile-loading-states`.  

---

## 1. Overview & Emulation Scope

This audit evaluates the mobile loading, failure, and recovery feedback states introduced in PR #217 across iPhone and iPad mobile viewports using WebKit engine emulation. Device-profile iOS version labels describe user-agent presets, not the OS version of the test host.

> [!NOTE]
> **Hardware Status & Simulation Methodology Disclosure:**
> - **WebKit Emulation Scope:** Tests were executed in Playwright WebKit (v26.0 build 2215) using **iPhone 14** (iOS 16.0 Mobile Safari profile: $390 \times 664\text{ px}$ portrait, $664 \times 390\text{ px}$ landscape) and **iPad Pro 11** (iPadOS 12.2 Tablet Safari profile: $834 \times 1194\text{ px}$ portrait, $1194 \times 834\text{ px}$ landscape).
> - **Simulation of Page Zoom:** In earlier audit runs, page scaling was simulated using CSS `document.body.style.zoom` and Playwright viewport scaling. This differs from native Mobile Safari `aA` page zoom (50%–300%), which dynamically recalculates CSS layout viewport dimensions.
> - **Unverified Hardware Behaviors:** **Native Safari `aA` page zoom, physical hardware two-finger pinch-to-zoom, and genuine software virtual keyboard interaction and layout shifting remain explicitly unverified** until tested on physical Apple iOS/iPadOS hardware.

---

## 2. Test Matrix & Results

| Phase | Test Condition | Target Element | Expected State & Styling | iPhone 14 (iOS 16.0) | iPad Pro 11 (iPadOS 12.2) |
| :---: | :--- | :--- | :--- | :---: | :---: |
| **1** | **Slow Calculation** (Worker held) | `#plasmaChart .chart-status` | `"Calculating simulation…"`<br>`color: #284f6b`<br>`bg: rgba(244,248,251,.96)`<br>`aria-busy="true"` | **PASSED**<br>Centered & readable in portrait & landscape | **PASSED**<br>Centered & readable in portrait & landscape |
| **2** | **Slow Chart Download** (Worker released, ECharts held) | `#plasmaChart .chart-status` | `"Loading chart…"`<br>`color: #284f6b`<br>`bg: rgba(244,248,251,.96)`<br>`aria-busy="true"` | **PASSED**<br>Immediate transition upon simulation accept | **PASSED**<br>Immediate transition upon simulation accept |
| **3** | **Clean Chart Render** (ECharts released) | `#plasmaChart` | Canvas renders;<br>`.chart-status` removed (`count === 0`);<br>`aria-busy="false"` | **PASSED**<br>Overlay completely cleared; interactive curves visible | **PASSED**<br>Overlay completely cleared; interactive curves visible |
| **4** | **Failed Download** (ECharts request aborted) | `#plasmaChart .chart-status`<br>& `#alerts` | `"Chart unavailable. Check your connection."`<br>`aria-busy="false"`<br>Alert banner with `<a href="/lite/">open AyFlux Lite</a>` | **PASSED**<br>Non-busy error message visible; fallback link present | **PASSED**<br>Non-busy error message visible; fallback link present |
| **5** | **Cleared-Threshold Recovery & Retry** (Threshold entered, download aborted, threshold cleared, dose updated to 725 mg) | `#plasmaChart` | Triggers recalculation,<br>commits new dose,<br>downloads ECharts,<br>renders canvas, removes overlay,<br>clears threshold line & legend | **PASSED**<br>Recalculated & rendered cleanly with updated curve; line & legend gone | **PASSED**<br>Recalculated & rendered cleanly with updated curve; line & legend gone |

---

## 3. Detailed Phase Analysis

### Phase 1: Slow Calculation State
- **Mechanism:** Intercepted and gated `**/assets/simulator-worker.js`.
- **Observations:** `#plasmaChart` displayed `<span class="chart-status" aria-hidden="true">Calculating simulation…</span>`.
- **Readability & Color Verification:**
  - Text color: `#284f6b` (`rgb(40, 79, 107)`).
  - Background: `rgba(244, 248, 251, 0.96)`.
  - Contrast: High-contrast dark blue against pale blue background.
  - Rotation: When rotating between portrait ($390\text{ px}$ width) and landscape ($664\text{ px}$ width), the message remained perfectly centered within the container bounds without text clipping or horizontal overflow.

### Phase 2: Slow Chart Download State
- **Mechanism:** Released the worker gate while keeping `**/assets/vendor/echarts-6.1.0.min.js` held.
- **Observations:** Once simulation calculation completed, `dataIsCurrent` became `true`, and `#plasmaChart .chart-status` transitioned immediately to `"Loading chart…"`.
- **Orientation:** Remained centered and visible across portrait and landscape orientations.

### Phase 3: Clean Render & Overlay Removal
- **Mechanism:** Released `echarts-6.1.0.min.js` gate.
- **Observations:** ECharts loaded and initialized; `drawNextPlot()` executed; `chartMessage(target, '')` was invoked.
- **Verification:**
  - `#plasmaChart .chart-status` count dropped to 0 (`status?.remove()`).
  - Container `aria-busy` attribute toggled to `"false"`.
  - Canvas was present and visible; this runner does not test touch gestures.

### Phase 4: Failed Chart Download Feedback
- **Mechanism:** Aborted network request for `echarts-6.1.0.min.js`.
- **Observations:**
  - `#plasmaChart .chart-status` displayed `"Chart unavailable. Check your connection."`.
  - Container `aria-busy` set to `"false"`.
  - Alert banner in `#alerts` surfaced actionable fallback guidance:
    ```html
    Unable to load interactive charts. Check your connection or <a href="/lite/">open AyFlux Lite</a>.
    ```
  - Both the container overlay and the alert banner remained legible in portrait and landscape without horizontal page overflow.

### Phase 5: Cleared-Threshold Recalculation & Recovery
- **Mechanism:** Entered 10 mg/L threshold into `#timeAboveLevel` while chart download was pending; aborted ECharts download to confirm failure state (`"Chart unavailable. Check your connection."`, `aria-busy="false"`, and Lite fallback); cleared the threshold input field while in failed state; unrouted ECharts network gate and updated dose (`#num_dose = 725`).
- **Observations:** Recalculation initiated; ECharts download succeeded on retry; `#plasmaChart` successfully committed dose 725 mg (`snapshot.config.dose === 725`, `snapshot.updated === true`), drew the updated concentration profile, verified exact equality of plotted points with model output, completely removed the error overlay (`count === 0`), and confirmed that the cleared threshold markLine and legend entry were absent (`hasThresholdLine: false`, `legendHasThreshold: false`).

---

## 4. Screenshot Evidence

All screenshots captured during automated test execution on WebKit are catalogued in `research/validation/results/screenshots/`:

| Device | State | Orientation | Screenshot File |
| :--- | :--- | :---: | :--- |
| **iPhone 14** | Calculating simulation… | Portrait | `phone-calc-portrait.png` |
| **iPhone 14** | Calculating simulation… | Landscape | `phone-calc-landscape.png` |
| **iPhone 14** | Loading chart… | Portrait | `phone-loading-portrait.png` |
| **iPhone 14** | Loading chart… | Landscape | `phone-loading-landscape.png` |
| **iPhone 14** | Chart rendered (clean) | Portrait | `phone-rendered-clean.png` |
| **iPhone 14** | Chart unavailable (failed) | Portrait | `phone-failed-portrait.png` |
| **iPhone 14** | Chart unavailable (failed) | Landscape | `phone-failed-landscape.png` |
| **iPhone 14** | Chart recovered (725 mg) | Portrait | `phone-recovered.png` |
| **iPad Pro 11** | Calculating simulation… | Portrait | `tablet-calc-portrait.png` |
| **iPad Pro 11** | Calculating simulation… | Landscape | `tablet-calc-landscape.png` |
| **iPad Pro 11** | Loading chart… | Portrait | `tablet-loading-portrait.png` |
| **iPad Pro 11** | Loading chart… | Landscape | `tablet-loading-landscape.png` |
| **iPad Pro 11** | Chart rendered (clean) | Portrait | `tablet-rendered-clean.png` |
| **iPad Pro 11** | Chart unavailable (failed) | Portrait | `tablet-failed-portrait.png` |
| **iPad Pro 11** | Chart unavailable (failed) | Landscape | `tablet-failed-landscape.png` |
| **iPad Pro 11** | Chart recovered (725 mg) | Portrait | `tablet-recovered.png` |

---

## 5. Verification Commands

```bash
# Execute mobile loading states test runner
node scripts/check-mobile-loading-states.cjs

# Run full project regression suite
npm test
```

## Independent review and automated verification

The original audit was supplied by Antigravity in commit `12d3916`. Review corrected the full base SHA and screenshot filename prefixes. The runner now asserts text and background colors, busy state, text bounds/centering, horizontal page overflow and updated-dose recovery, including equality of every plotted plasma point with the current model. It rejects uncaught page errors and prints the actual checkout SHA and WebKit executable for each run.

The `Mobile loading states` workflow independently executes these checks on Linux WebKit and uploads the generated screenshots. Screenshots are generated artifacts, not committed source files. A successful workflow establishes these emulated loading-state checks; it does not establish physical Safari behavior, screen-reader usability, native page zoom or clinical validity.
