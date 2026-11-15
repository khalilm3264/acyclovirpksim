# Safari WebKit (iPhone & iPad) Usability Audit: Time-Axis Controls (#213), Synthetic Touch Events, and Reduced-Height Viewport

Audit date: November 14, 2026.  
Base commit: `28281079f34938a31e93ff707368407771ab189a` (`main`, including merged PR #213).  
Target branch: `test/safari-graph-zoom-usability`.  

---

## 1. Emulation scope & hardware status

> [!NOTE]
> **Emulation scope disclosure:** Results in this audit represent **Playwright WebKit (v26.0 build 2215) with iPhone 14 and iPad Pro 11 device emulation**. Physical Apple hardware running native iOS/iPadOS Safari was not connected over Apple Remote Web Inspector.  
> **Physical Safari behavior remains open:** Real mobile touch latency, physical Safari address bar expansion/collapse, iOS virtual keyboard layout shifting, and hardware multi-touch gesture processing remain unverified on genuine hardware.

The usability evaluation was executed via Playwright WebKit with device profile parameters, mobile touch event dispatching (`hasTouch: true`, `isMobile: true`), WebKit User-Agent tokens, and reduced-height viewport emulation.

| Device profile | OS / Browser | Viewport portrait (px) | Viewport landscape (px) | Scale factor | UA token |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **iPhone 14** (Phone) | iOS 16.0 / Mobile Safari | 390 × 664 | 664 × 390 | 3.0 | `Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 ... Mobile/15E148 Safari/604.1` |
| **iPad Pro 11** (Tablet) | iPadOS 12.2 / Tablet Safari | 834 × 1194 | 1194 × 834 | 2.0 | `Mozilla/5.0 (iPad; CPU OS 12_2 like Mac OS X) AppleWebKit/605.1.15 ... Mobile/15E148 Safari/604.1` |

---

## 2. Lite app (`/lite/`): visible time-axis controls (#213) & synthetic touch events

### Investigation objectives
1. Test visible time-axis controls integrated from PR #213 (`#liteTimeIn`, `#liteTimeOut`, `#liteTimeReset`, `#liteTimeWindow`):
   - Verify button touch targets meet minimum accessible touch criteria ($\ge 44\text{ px}$ height).
   - Record the visible time range at each step: initial, zoomed in, after rotation to landscape, zoomed out, and reset.
2. Evaluate synthetic DOM TouchEvents (two-finger pinch and single-finger pan) over `#acvChart`.

### Observed time range at each step

| Step | Action | Visible time range (`xAxis`) | Live output label (`#liteTimeWindow`) | Result |
| :---: | :--- | :---: | :---: | :---: |
| **1** | Initial page load (Portrait) | `[0, 96] h` | `Time: 0.0–96.0 h` | Baseline full horizon verified |
| **2** | Click "Zoom time in" (`#liteTimeIn`) | `[24, 72] h` | `Time: 24.0–72.0 h` | Time axis successfully narrowed |
| **3** | Rotate to Landscape | `[24, 72] h` | `Time: 24.0–72.0 h` | Time window **persists across rotation** |
| **4** | Click "Zoom time out" (`#liteTimeOut`) | `[0, 96] h` | `Time: 0.0–96.0 h` | Time axis widened back to full horizon |
| **5** | Click "Zoom time in", then "Reset time axis" | `[0, 96] h` | `Time: 0.0–96.0 h` | Time axis cleanly reset to baseline |
| **6** | Rotate back to Portrait | `[0, 96] h` | `Time: 0.0–96.0 h` | State preserved |

- **Touch targets:** `#liteTimeIn`, `#liteTimeOut`, and `#liteTimeReset` all measure $44\text{ px}$ tall on iPhone 14 and iPad Pro 11, meeting WCAG / mobile accessibility targets.
- **Multi-chart synchronization:** Modeled plasma acyclovir (`#acvChart`) and CMMG (`#cmmgChart`) update and synchronize time spans simultaneously.
- **Canvas responsiveness:** Canvas cleanly resizes via `ResizeObserver` upon orientation change ($622 \times 255\text{ px}$ on iPhone 14; $408 \times 300\text{ px}$ in 2-column layout on iPad Pro 11).

### Synthetic TouchEvents observations
- **Two-finger pinch:** Dispatching synthetic DOM `TouchEvent`s (`touchstart`, `touchmove`, `touchend`) with spreading coordinates over `#acvChart` does **not** alter the chart's dataZoom range (remains at initial `[0, 96] h`).
- **Single-finger drag:** Dispatching synthetic DOM touch move events horizontally does **not** translate the time axis.
- **Hardware disclaimer:** These observations reflect synthetic DOM TouchEvents in WebKit emulation. **Genuine on-device physical Safari pinch and pan behavior remains open and requires verification on physical Apple hardware.**

---

## 3. Full simulator (`/`): timeline dose editing & apply under reduced-height viewport

### Investigation objectives
Evaluate timeline custom dose editing and the "Apply timeline changes" action under a reduced-height viewport, emulating the vertical screen area available when an on-screen software keyboard is presented.

### Test protocol
1. Loaded `/` and navigated to the Timeline tab (`#tab-timeline`).
2. Clicked `+ Add medication dose` (`#addDose`); verified unapplied notice (`#dosePending`) appeared.
3. **Applied reduced-height portrait viewport:**
   - iPhone 14: Reduced from $664\text{ px}$ to $364\text{ px}$ ($300\text{ px}$ reduction).
   - iPad Pro 11: Reduced from $1194\text{ px}$ to $844\text{ px}$ ($350\text{ px}$ reduction).
4. Populated draft fields under reduced-height viewport:
   - Dose amount: `500` mg
   - Route: `Valacyclovir oral`
   - Administration time: `36` h
   - Dispatched `input` events to commit values to internal `doseDraft`.
5. Scrolled `#applyFullTimeline` into view via `scrollIntoViewIfNeeded()`. Verified button visibility and hit-target reachability.
6. Clicked `#applyFullTimeline` while reduced-height viewport was active.
7. Verified `#dosePending` cleared (`hidden === true`).
8. **Engine configuration assertion:** Inspected `window.AyFluxResearchBridge.snapshot().config` directly in the simulation engine. Confirmed:
   - `dosingMode === 'custom'`
   - `customDoses` contains `{ time: 36, amount: 500, route: 'Valacyclovir oral' }`
9. Restored baseline viewport.

### Observed findings
- **iPhone 14 (Mobile Safari profile):** PASSED. Draft inputs populated cleanly in reduced-height viewport; `#applyFullTimeline` was successfully scrolled into view, clicked, and applied; engine received and applied the 500 mg oral dose at hour 36.
- **iPad Pro 11 (Tablet Safari profile):** PASSED. Inputs and `#applyFullTimeline` remained reachable and operable under reduced-height viewport; custom dose applied cleanly to engine configuration.
- **Hardware disclaimer:** Genuine on-device physical Safari virtual keyboard interaction, automatic scrolling, and layout shifting remain open and require verification on physical Apple hardware.

---

## 4. Test Matrix Summary

| Environment | Device profile | Component | Test scenario | Status | Key observation |
| :--- | :--- | :--- | :--- | :---: | :--- |
| Local build | iPhone 14 | Lite (`/lite/`) | Time Controls (#213) & Synthetic Touch | **PASSED** | Controls narrow axis to 24–72 h, persist across rotation, reset to 0–96 h; button height 44 px; synthetic touches leave axis unchanged. |
| Local build | iPhone 14 | Full (`/`) | Timeline Edit in Reduced Viewport | **PASSED** | Custom dose (500 mg oral @ 36 h) edited and applied under 300 px viewport deduction; engine config verified. |
| Local build | iPad Pro 11 | Lite (`/lite/`) | Time Controls (#213) & Synthetic Touch | **PASSED** | Controls narrow axis to 24–72 h, persist across rotation, reset to 0–96 h; canvas resizes cleanly to 408 px width in 2-col landscape. |
| Local build | iPad Pro 11 | Full (`/`) | Timeline Edit in Reduced Viewport | **PASSED** | Custom dose edited and applied under 350 px viewport deduction; `#applyFullTimeline` reachable; engine config verified. |

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
- Full regression suite passes cleanly (`npm test`).
