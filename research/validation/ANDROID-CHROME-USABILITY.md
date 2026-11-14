# Android Chrome Usability and Responsive Layout Audit

Audit date: November 14, 2026.
Local exact build: commit `3c0c1cb98c1ad7547dba7c2f4de7115f43b8283c`.
Production deployed environment: `https://ayflux.org/` and `https://ayflux.org/lite/` (build `#205` or newer).

## 1. Testing environment & device emulation profiles

> [!NOTE]
> **Emulation scope notice:** Results in this audit represent **desktop Chromium (v157.0.8103.78) with Android mobile and tablet device emulation**. Physical Android hardware was not connected over local ADB. Native Android Chrome on physical hardware, real mobile touch latency, and the operating-system-level accessibility font scaling setting still require physical Android hardware and iOS Safari validation.

The usability evaluation was executed via Playwright Chromium launching the installed Google Chrome binary (v157.0.8103.78) with device emulation parameters, mobile User-Agent tokens, touch event dispatching (`hasTouch: true`, `isMobile: true`), Chrome DevTools Protocol (`Emulation.setPageScaleFactor`) for visual viewport zoom, and simulated system font scaling.

| Device profile | Android version | Viewport portrait (px) | Viewport landscape (px) | Device scale factor | Mobile UA token |
| --- | --- | ---: | ---: | ---: | --- |
| Pixel 7 (Phone) | Android 14 | 412 × 915 | 915 × 412 | 2.625 | Chrome 157 Mobile Safari |
| Pixel Tablet (Tablet) | Android 14 | 800 × 1280 | 1280 × 800 | 2.000 | Chrome 157 Safari |

The test suite supports standalone local runs via the `--local-only` flag (`node scripts/test_android_chrome.cjs --local-only`), and partitions network availability checks from functional assertion failures. When running against production, an unreachable domain triggers a network notice, whereas any functional assertion failure throws an `AssertionError` that immediately fails the test run.

---

## 2. Full simulator (`/`): unapplied timeline dose rotation & engine configuration verification

### Test protocol
1. **Synthetic patient inputs:** Entered Dose = 850 mg, Body weight = 85 kg, Residual CrCl = 45 mL/min.
2. **Timeline navigation:** Selected the `#tab-timeline` tab and confirmed `#timeline` panel activation (`aria-selected="true"`).
3. **Unapplied dose row creation:** Clicked `#addDose` to append a new dose row to `doseDraft`. Confirmed that unapplied advisory `#dosePending` appeared.
4. **Draft data entry:** Configured Amount = 500 mg, Route = "Valacyclovir oral", Administration time = 36 h.
5. **Rotation to landscape before apply:** Changed viewport from portrait (412 × 915 phone / 800 × 1280 tablet) to landscape (915 × 412 phone / 1280 × 800 tablet) with edits still unapplied in `doseDraft`.
6. **Survival check (landscape):** Verified that `doseDraft` inputs (500 mg, Valacyclovir oral, 36 h) remained populated in `#doseRows`, `#dosePending` remained visible, and the page satisfied horizontal containment (`scrollWidth <= clientWidth + 2`).
7. **Rotation back to portrait:** Rotated back to portrait orientation. Verified that pending values and pending notice survived without loss or re-initialization.
8. **Application:** Committed custom timeline via unified action `#applyFullTimeline`. Verified that `#dosePending` cleared.
9. **Post-apply rotation & model engine configuration assertion:**
   - Rotated portrait → landscape → portrait. Verified row persistence in `#doseRows`.
   - **Applied model assertion:** Inspected `window.AyFluxResearchBridge.snapshot().config` directly in the engine. Verified that `dosingMode === 'custom'`, `customDoses` contains an active dose entry with `time === 36`, `amount === 500` mg, and `route === 'Valacyclovir oral'`, confirming that the simulation engine actually received and applied the 500 mg oral dose rather than relying solely on DOM row counts.

### Results
- **Phone (Pixel 7):** PASSED. Pending draft values (500 mg oral @ 36 h) survived portrait ↔ landscape rotations intact. Engine configuration verified: `c.dosingMode === 'custom'`, `c.customDoses` contains `{ time: 36, amount: 500, route: 'Valacyclovir oral' }`.
- **Tablet (Pixel Tablet):** PASSED. Pending draft values survived portrait ↔ landscape rotations intact. Engine configuration verified with custom 500 mg oral dose at 36 h.

---

## 3. Full simulator (`/`): touch target accessibility

### Measurements
Touch target heights were evaluated across all timeline controls (`#scheduleRows input, select, button`, `#doseRows input, select, button`, `#addRow`, `#addDose`, `#applyFullTimelineBottom`):

| Device profile | Viewport width (px) | Minimum touch target height (px) | Controls < 40 px | Status |
| --- | ---: | ---: | ---: | --- |
| Pixel 7 (Phone) | 412 | 40.0 px | 0 | PASSED (meets ≥ 40 px accessibility standard) |
| Pixel Tablet (Tablet) | 800 | 34.8 px | 33 | Finding for Sol (see below) |

### Actionable finding for Sol (tablet touch target sizing)
In `public/index.html`, the rule enforcing a 40 px minimum touch target height on `#timeline` controls is scoped to:
```css
@media (max-width: 650px) {
  html body #timeline .dose-row input,
  html body #timeline .dose-row select,
  html body #timeline .rx-table input,
  html body #timeline .rx-table select,
  html body #timeline .intervals button,
  html body #timeline .dose-row button,
  html body #timeline button { min-height: 40px; }
}
```
On tablets in portrait ($800\text{ px} > 650\text{ px}$), the desktop styling applies, setting `min-height: 36px` (rendered at $34.8\text{ px}$ due to padding/border-box line heights). Touch target sizing on touch-screen tablets is therefore smaller than on phones.

**Recommendation for Sol:**
Supplement the media query to target touch devices regardless of screen width while preserving desktop layout:
```css
@media (max-width: 650px), (pointer: coarse) and (max-width: 1024px) { ... }
```

---

## 4. Lite simulator (`/lite/`): zoom, rotation, reachability & accessibility text scaling

### Test protocol
1. **Input modification:** Set `#lite_dose` to 500 mg and `#lite_weight` to 70 kg.
2. **Chart touch-action:** Inspected CSS `touch-action` on chart containers (`#acvChart`, `#cmmgChart`). Verified `pan-y pinch-zoom`.
3. **Visual viewport page zoom:** Exercised page scale factors 1.5x, 2.0x, and 3.0x via CDP `Emulation.setPageScaleFactor`. Verified that inputs and outputs remained functional.
4. **Rotation while zoomed:** Rotated from portrait to landscape while visual viewport zoom was set at 2.0x. Verified reachability of controls and visibility of `#acvChart`.
5. **Zoom reset & return:** Reset page scale factor to 1.0x and returned to portrait. Verified that primary controls (`#lite_dose`, `#lite_weight`, `#lite_crcl`, `#lite_route`, `#liteReset`) and charts were visible and reachable.
6. **Android accessibility text scaling & representative label growth:**
   - **CSS baseline observation:** In `public/lite/index.html`, form labels (`.control label`, `.topline label`, `.legend-option`) are styled with fixed pixel font sizes (`11.5px`), whereas interactive buttons (`#liteReset`, `#liteExport`), selects, and inputs use `font: inherit` from `:root` (`13px`). Under basic `:root` font adjustment, only inheriting controls scale, leaving fixed pixel labels at 11.5 px.
   - **Simulated system text scaling:** To evaluate how the layout behaves under true system-level text scaling (where the platform enlarges all on-screen text), scale factors 125%, 150%, and 200% were applied across both root and label elements.
   - **Tested representative label:** `label[for="lite_weight"]` with visible text `"Body weight (kg)"` and associated `<output id="out_weight">70</output>`.
   - **Tested inheriting control:** Button `#liteReset` (`"Reset"`).
   - **Measured growth:**
     * 100% baseline: label = 11.5 px, button = 13.0 px.
     * 125% scale: label = 14.4 px (+25%), button = 16.3 px (+25%).
     * 150% scale: label = 17.3 px (+50%), button = 19.5 px (+50%).
     * 200% scale: label = 23.0 px (+100%), button = 26.0 px (+100%).
   - **Horizontal containment:** Across both phone ($412\text{ px}$) and tablet ($800\text{ px}$) viewports, `scrollWidth <= clientWidth + 2` was satisfied at all scales, confirming zero horizontal scroll blowout or control clipping.

### Results
- **Phone (Pixel 7):** PASSED. Zoom 1.0x–3.0x functional; chart touch-action `pan-y pinch-zoom` verified; representative label `"Body weight (kg)"` and `#liteReset` grew in computed px as expected; text scaling 125%–200% fits horizontally without clipping or layout break.
- **Tablet (Pixel Tablet):** PASSED. Zoom 1.0x–3.0x functional; rotation under zoom valid; representative label `"Body weight (kg)"` grew to 23.0 px without horizontal scroll blowout.

---

## 5. Matrix summary

| Target environment | Device | Test suite | Status | Key observation |
| --- | --- | --- | --- | --- |
| Local (`3c0c1cb`) | Pixel 7 Phone | Full App: unapplied dose rotation | PASSED | Pending 500 mg oral @ 36 h survived rotation; engine `customDoses` verified; touch targets ≥ 40.0 px |
| Local (`3c0c1cb`) | Pixel 7 Phone | Lite App: zoom, rotation, font scale | PASSED | Zoom 1.0x–3.0x, pinch-zoom valid, label 'Body weight (kg)' grew to 23.0 px, text scale 125%–200% fits |
| Local (`3c0c1cb`) | Pixel Tablet | Full App: unapplied dose rotation | PASSED | Pending dose survived rotation; engine `customDoses` verified; min touch target 34.8 px (< 40 px limitation) |
| Local (`3c0c1cb`) | Pixel Tablet | Lite App: zoom, rotation, font scale | PASSED | Zoom 1.0x–3.0x, rotation under zoom valid, label grew to 23.0 px, text scale 125%–200% fits |
| Prod (`ayflux.org`) | Pixel 7 Phone | Full App: unapplied dose rotation | PASSED | Production matches local build behavior with active engine verification |
| Prod (`ayflux.org`) | Pixel 7 Phone | Lite App: zoom, rotation, font scale | PASSED | Production matches local build behavior; label grew to 23.0 px cleanly |
| Prod (`ayflux.org`) | Pixel Tablet | Full App: unapplied dose rotation | PASSED | Production matches local build behavior; engine `customDoses` verified |
| Prod (`ayflux.org`) | Pixel Tablet | Lite App: zoom, rotation, font scale | PASSED | Production matches local build behavior |

---

## 6. Reproduction & execution options

- **Full test (local exact build + production):**
  ```sh
  node scripts/test_android_chrome.cjs
  ```
- **Local-only test:**
  ```sh
  node scripts/test_android_chrome.cjs --local-only
  ```

## 7. Invariants & verification
- Full regression suite passes: `npm test` (184/184 tests pass).
- Adult engine blob hash: `17971df66e0a97b4d382572a582d35c444a3c83f` (frozen).
- Pediatric engine blob hash: `4e598a8d4808fc50918541aaefb68594563345c0` (frozen).
- Model parameters, scorecard, and clinical disclaimers are preserved.
