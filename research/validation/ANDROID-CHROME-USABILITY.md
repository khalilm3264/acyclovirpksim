# Android Chrome Usability and Responsive Layout Audit

Audit date: November 14, 2026.
Local exact build: commit `3c0c1cb98c1ad7547dba7c2f4de7115f43b8283c`.
Production deployed environment: `https://ayflux.org/` and `https://ayflux.org/lite/` (build `#205` or newer).

## Testing environment & device emulation profiles

Physical Android hardware was not connected over ADB (no active Android device on local PATH). Usability evaluation was conducted using Playwright Chromium launching the installed Google Chrome binary (v157.0.8103.78) with full mobile device emulation profiles, mobile User-Agent tokens, touch event dispatching (`hasTouch: true`, `isMobile: true`), Chrome DevTools Protocol (`Emulation.setPageScaleFactor`) for visual viewport zoom, and root font-size scaling for Android accessibility text sizing.

| Device profile | Android version | Viewport portrait (px) | Viewport landscape (px) | Device scale factor | Mobile UA |
| --- | --- | ---: | ---: | ---: | --- |
| Pixel 7 (Phone) | Android 14 | 412 × 915 | 915 × 412 | 2.625 | Chrome 157 Mobile |
| Pixel Tablet (Tablet) | Android 14 | 800 × 1280 | 1280 × 800 | 2.000 | Chrome 157 |

---

## 1. Full simulator (`/`): unapplied timeline dose rotation & schedule persistence

### Test protocol
1. **Synthetic patient inputs:** Entered Dose 850 mg, Body weight 85 kg, Residual CrCl 45 mL/min.
2. **Timeline navigation:** Selected the `#tab-timeline` tab and confirmed `#timeline` panel activation (`aria-selected="true"`).
3. **Unapplied dose row creation:** Clicked `#addDose` to append a new dose row to `doseDraft`. Confirmed that unapplied advisory `#dosePending` appeared.
4. **Draft data entry:** Set Amount = 500 mg, Route = "Valacyclovir oral", Administration time = 36 h.
5. **Rotation to landscape before apply:** Changed viewport from portrait (412 × 915 / 800 × 1280) to landscape (915 × 412 / 1280 × 800) with edits still unapplied in `doseDraft`.
6. **Survival check (landscape):** Verified that `doseDraft` inputs (500 mg, Valacyclovir oral, 36 h) remained in the DOM, `#dosePending` remained visible, and the page satisfied horizontal containment (`scrollWidth <= clientWidth + 2`).
7. **Rotation back to portrait:** Rotated back to portrait orientation. Verified that pending values and pending notice survived without loss or re-initialization.
8. **Application:** Committed custom timeline via unified action `#applyFullTimeline`. Verified that `#dosePending` cleared.
9. **Post-apply rotation:** Rotated portrait → landscape → portrait. Verified that applied custom schedule persisted across rotations.

### Results
- **Phone (Pixel 7):** PASSED. Pending draft values (500 mg oral @ 36 h) survived portrait ↔ landscape rotations intact. Applied schedule survived post-application rotation.
- **Tablet (Pixel Tablet):** PASSED. Pending draft values survived portrait ↔ landscape rotations intact. Applied schedule survived post-application rotation.

---

## 2. Full simulator (`/`): touch target accessibility

### Measurements
Touch target heights were evaluated across all timeline controls (`#scheduleRows input, select, button`, `#doseRows input, select, button`, `#addRow`, `#addDose`, `#applyFullTimelineBottom`):

| Device profile | Viewport width (px) | Minimum touch target height (px) | Controls < 40 px | Status |
| --- | ---: | ---: | ---: | --- |
| Pixel 7 (Phone) | 412 | 40.0 px | 0 | PASSED (meets ≥ 40 px standard) |
| Pixel Tablet (Tablet) | 800 | 34.8 px | 33 | Finding for Sol (see below) |

### Finding for Sol (tablet touch target sizing)
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
Consider supplementing the media query to target touch devices regardless of screen width, e.g.:
```css
@media (max-width: 650px), (pointer: coarse) and (max-width: 1024px) { ... }
```

---

## 3. Lite simulator (`/lite/`): zoom, rotation, reachability & accessibility font scaling

### Test protocol
1. **Input modification:** Set `#lite_dose` to 500 mg and `#lite_weight` to 70 kg.
2. **Chart touch-action:** Inspected CSS `touch-action` on chart containers (`#acvChart`, `#cmmgChart`). Verified `pan-y pinch-zoom`.
3. **Visual viewport page zoom:** Exercised page scale factors 1.5x, 2.0x, and 3.0x via CDP `Emulation.setPageScaleFactor`. Verified that inputs and outputs remained functional.
4. **Rotation while zoomed:** Rotated from portrait to landscape while visual viewport zoom was set at 2.0x. Verified reachability of controls and visibility of `#acvChart`.
5. **Zoom reset & return:** Reset page scale factor to 1.0x and returned to portrait. Verified that primary controls (`#lite_dose`, `#lite_weight`, `#lite_crcl`, `#lite_route`, `#liteReset`) and charts were visible and reachable.
6. **Android accessibility text scaling:** Simulated system-level font scaling at 125%, 150%, and 200% root font size. Verified that:
   - The page maintained horizontal containment without horizontal scroll blowout (`scrollWidth <= clientWidth + 2`).
   - Sliders, route selector, reset button, and chart canvases remained visible and interactive.

### Results
- **Phone (Pixel 7):** PASSED. Zoom 1.0x–3.0x functional; chart touch-action `pan-y pinch-zoom` verified; all primary controls reachable; text scaling 125%–200% fits horizontally without clipping or layout break.
- **Tablet (Pixel Tablet):** PASSED. Zoom 1.0x–3.0x functional; rotation while zoomed preserved charts; primary controls reachable; text scaling 125%–200% fits horizontally.

---

## Matrix summary

| Target environment | Device | Test suite | Status | Key observation |
| --- | --- | --- | --- | --- |
| Local (`3c0c1cb`) | Pixel 7 Phone | Full App: unapplied dose rotation | PASSED | Pending 500 mg oral @ 36 h survived rotation; touch targets ≥ 40.0 px |
| Local (`3c0c1cb`) | Pixel 7 Phone | Lite App: zoom, rotation, font scale | PASSED | Zoom 1.0x–3.0x, pinch-zoom valid, text scale 125%–200% fits |
| Local (`3c0c1cb`) | Pixel Tablet | Full App: unapplied dose rotation | PASSED | Pending dose survived rotation; min touch target 34.8 px (< 40 px limitation) |
| Local (`3c0c1cb`) | Pixel Tablet | Lite App: zoom, rotation, font scale | PASSED | Zoom 1.0x–3.0x, rotation under zoom valid, text scale 125%–200% fits |
| Prod (`ayflux.org`) | Pixel 7 Phone | Full App: unapplied dose rotation | PASSED | Production matches local build behavior |
| Prod (`ayflux.org`) | Pixel 7 Phone | Lite App: zoom, rotation, font scale | PASSED | Production matches local build behavior |
| Prod (`ayflux.org`) | Pixel Tablet | Full App: unapplied dose rotation | PASSED | Production matches local build behavior |
| Prod (`ayflux.org`) | Pixel Tablet | Lite App: zoom, rotation, font scale | PASSED | Production matches local build behavior |

---

## Reproduction

```sh
node scripts/test_android_chrome.cjs
```

## Invariants & verification
- Full regression suite passes: `npm test` (184/184 tests pass).
- Adult engine blob hash: `17971df66e0a97b4d382572a582d35c444a3c83f` (frozen).
- Pediatric engine blob hash: `4e598a8d4808fc50918541aaefb68594563345c0` (frozen).
- Model parameters, scorecard, and clinical disclaimers are preserved.
