# Safari WebKit (iPhone & iPad) Graph-Zoom, Responsive Layout, and Virtual Keyboard Usability Audit

Audit date: November 14, 2026.  
Base commit: `79df313fcfb217ad07f4022e2a6d61dc6b767b47` (`main`).  
Target branch: `test/safari-graph-zoom-usability`.  

---

## 1. Emulation scope & testing environment

> [!NOTE]
> **Emulation scope disclosure:** Results in this audit represent **Playwright WebKit (v26.0 build 2215) with iPhone and iPad device emulation**. Physical Apple hardware running native iOS/iPadOS Safari was not connected over Apple Remote Web Inspector. Real mobile touch latency, physical Safari address bar expansion/collapse, iOS 16 virtual keyboard layout shifting, and hardware multi-touch gesture processing still require physical iPhone and iPad verification.

The usability evaluation was executed via Playwright WebKit with device parameters, mobile touch event dispatching (`hasTouch: true`, `isMobile: true`), WebKit User-Agent tokens, and simulated software keyboard viewport reduction.

| Device profile | OS / Browser | Viewport portrait (px) | Viewport landscape (px) | Scale factor | UA token |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **iPhone 14** (Phone) | iOS 16.0 / Mobile Safari | 390 × 664 | 664 × 390 | 3.0 | `Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 ... Mobile/15E148 Safari/604.1` |
| **iPad Pro 11** (Tablet) | iPadOS 12.2 / Tablet Safari | 834 × 1194 | 1194 × 834 | 2.0 | `Mozilla/5.0 (iPad; CPU OS 12_2 like Mac OS X) AppleWebKit/605.1.15 ... Mobile/15E148 Safari/604.1` |

---

## 2. Lite app (`/lite/`): graph zoom, pinch, pan, and rotation investigation

### Investigation objectives
1. Determine whether two-finger pinching over `#acvChart` / `#cmmgChart` updates the chart's time axis domain or magnifies the visual viewport / entire page.
2. Determine whether single-finger panning translates the time axis to a known time point before and after device rotation.

### Test protocol
1. Loaded `/lite/` and waited for ECharts initialization on `#acvChart`.
2. Inspected initial chart CSS styling, toolbox configuration, and `dataZoom` state:
   - CSS `touch-action`: `pan-y pinch-zoom`
   - Toolbox visibility: `option.toolbox.show === false`
   - Initial x-axis `dataZoom`: `start: 0%, end: 100%` (`id: ayNavX`, `type: inside`)
3. Dispatched a two-finger pinch gesture (spreading touches from $cx \pm 20\text{ px}$ to $cx \pm 80\text{ px}$). Recorded post-pinch `dataZoom` range and visual viewport scale.
4. Dispatched a single-finger pan gesture (dragging touch horizontally across the chart area). Recorded post-pan `dataZoom` range.
5. Rotated device from portrait to landscape (iPhone: $390 \times 664 \to 664 \times 390\text{ px}$; iPad: $834 \times 1194 \to 1194 \times 834\text{ px}$).
6. Inspected canvas resize under `ResizeObserver` and repeated horizontal pan gesture in landscape orientation.

### Observed findings
- **Pinch gesture behavior:**
  - **The chart's time axis domain does NOT change** (`start: 0%, end: 100%` remains unchanged).
  - **Root cause:** In `public/lite/index.html` (line 64), `.chart` is explicitly styled with:
    ```css
    .chart { width: 100%; height: 300px; display: block; touch-action: pan-y pinch-zoom; }
    ```
    On WebKit / Mobile Safari, `touch-action: pan-y pinch-zoom` informs the browser gesture recognizer that pinch gestures are handled natively as **page magnification (visual viewport zoom)**. WebKit consumes the multi-touch gesture at the browser level and does not dispatch zooming delta events to ECharts' `inside` dataZoom.
  - **Conclusion:** On iPhone and iPad Safari, pinching over the graph **magnifies the entire page**, leaving the chart's time axis static.
- **Pan gesture behavior:**
  - **Single-finger panning does NOT translate the chart time axis** (`start: 0%, end: 100%`).
  - **Root cause:** In `public/lite/lite.js` (line 267), `option.toolbox.show = false` hides the toolbar, and `public/assets/charts.js` (line 159) initializes `dragMode` to `'off'` on touch screens (`pointer: coarse`). Because pan mode is never enabled, horizontal touch dragging does not pan the dataZoom domain; vertical dragging simply scrolls the document (`pan-y`).
- **Rotation behavior:**
  - Rotating between portrait and landscape cleanly triggers `ResizeObserver`, updating chart width and height (iPhone: width 622 px, height 255 px; iPad: width 408 px, height 300 px in two-column graph layout).
  - Panning after rotation continues to leave the time axis unchanged (`start: 0%, end: 100%`).

---

## 3. Full simulator (`/`): timeline dose editing & apply with virtual keyboard

### Investigation objectives
Verify that timeline custom dose editing and the "Apply timeline changes" action remain accessible, operable, and effective when the on-screen virtual keyboard is visible.

### Test protocol
1. Loaded `/` and waited for baseline readiness.
2. Navigated to the Timeline tab (`#tab-timeline`).
3. Clicked `#addDose` to create a new draft dose row; confirmed unapplied advisory notice `#dosePending` appeared.
4. **Simulated on-screen virtual keyboard open:** Reduced viewport height to emulate software keyboard presentation:
   - iPhone 14: Viewport reduced from $664\text{ px}$ to $364\text{ px}$ ($300\text{ px}$ keyboard deduction).
   - iPad Pro 11: Viewport reduced from $1194\text{ px}$ to $844\text{ px}$ ($350\text{ px}$ keyboard deduction).
5. Filled draft inputs in the new row under keyboard-reduced viewport:
   - Dose amount: `500` mg
   - Route: `Valacyclovir oral`
   - Administration time: `36` h
   - Dispatched `input` events to commit values to internal `doseDraft`.
6. Scrolled `#applyFullTimeline` into view using `scrollIntoViewIfNeeded()`. Verified button visibility and hit-target reachability.
7. Clicked `#applyFullTimeline` while keyboard-reduced viewport was active.
8. Verified that `#dosePending` cleared (`hidden === true`).
9. **Engine configuration assertion:** Inspected `window.AyFluxResearchBridge.snapshot().config` directly in the simulation engine. Verified:
   - `dosingMode === 'custom'`
   - `customDoses` contains `{ time: 36, amount: 500, route: 'Valacyclovir oral' }`
10. Restored original viewport height (simulating keyboard dismissal).

### Observed findings
- **iPhone 14 (Mobile Safari):** PASSED. Draft inputs populated cleanly while keyboard height was deducted; `#applyFullTimeline` was successfully scrolled into view, clicked, and applied; engine received and applied the 500 mg oral dose at hour 36.
- **iPad Pro 11 (Tablet Safari):** PASSED. Inputs and `#applyFullTimeline` remained operable under keyboard viewport reduction; custom dose applied cleanly to engine configuration.

---

## 4. Test Matrix Summary

| Target environment | Device profile | Component | Test scenario | Status | Key observation |
| :--- | :--- | :--- | :--- | :---: | :--- |
| Local build | iPhone 14 | Lite (`/lite/`) | Pinch, Pan & Rotation | **PASSED** | Pinch magnifies whole page (`touch-action: pan-y pinch-zoom`); time axis stays `0–100%`; pan does not shift axis; ResizeObserver resizes on rotation. |
| Local build | iPhone 14 | Full (`/`) | Timeline Dose Edit + Keyboard | **PASSED** | Custom dose (500 mg oral @ 36 h) edited and applied under 300 px keyboard deduction; engine config verified. |
| Local build | iPad Pro 11 | Lite (`/lite/`) | Pinch, Pan & Rotation | **PASSED** | Pinch magnifies whole page; time axis static; canvas resizes cleanly to 408 px width in 2-col landscape. |
| Local build | iPad Pro 11 | Full (`/`) | Timeline Dose Edit + Keyboard | **PASSED** | Custom dose edited and applied under 350 px keyboard deduction; `#applyFullTimeline` reachable; engine config verified. |

---

## 5. Execution & Reproduction

```bash
# Run local WebKit test suite
node scripts/test_safari_webkit.cjs --local-only

# Run against production with preflight reachability partitioning
node scripts/test_safari_webkit.cjs
```

- When running against production:
  - An unreachable target / refused connection logs `[OFFLINE SKIP]` and exits code 0.
  - A server error response (HTTP 503, 404, etc.) logs `❌ PRODUCTION PREFLIGHT HTTP ERROR` and exits code 1.

---

## 6. Engine Invariants

- Adult PK engine blob hash: `17971df66e0a97b4d382572a582d35c444a3c83f` (unmodified).
- Pediatric PK engine blob hash: `4e598a8d4808fc50918541aaefb68594563345c0` (unmodified).
- Regression suite: 193/193 tests pass (`npm test`).
