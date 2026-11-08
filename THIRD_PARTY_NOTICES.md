# AyFlux Third-Party Notices

AyFlux's own source is offered under the GNU Affero General Public License, version 3 (AGPLv3). The full text is in `LICENSE`.

## Poppins font (weights 300 and 800)

- Font: [Poppins by the Poppins Project Authors / Indian Type Foundry](https://github.com/itfoundry/Poppins)
- Self-hosted via pinned `@fontsource/poppins@5.3.0` during the release build; files are deployed only to the application's own origin.
- Site assets: `public/assets/fonts/poppins-latin-300-normal.woff2` and `public/assets/fonts/poppins-latin-800-normal.woff2`.
- License: **SIL Open Font License 1.1** ([canonical license text](https://github.com/itfoundry/Poppins/blob/master/OFL.txt)).
- Copyright: Copyright 2020 The Poppins Project Authors (https://github.com/itfoundry/Poppins).

The font is used only for the two-weight AyFlux wordmark. The application's AGPL license does not change the third-party font's separate license. The build stage copies the upstream font license when bundled in the npm package. **Fonts are not authored by AyFlux**.

## Plotly.js Basic v3.3.1

- Project: https://github.com/plotly/plotly.js
- Bundled script: `public/assets/vendor/plotly-basic-3.3.1.min.js`
- License: MIT
- License text: https://github.com/plotly/plotly.js/blob/v3.3.1/LICENSE

## Plotly.js Cartesian v3.3.1 (optional on-demand heatmap)

- Project: https://github.com/plotly/plotly.js
- Package: `plotly.js-cartesian-dist-min@3.3.1` (pinned)
- Staged deployment asset: `public/assets/vendor/plotly-cartesian-3.3.1.min.js`
- License: MIT, using the same license terms stated below.
- Built by `scripts/stage-cartesian.cjs` in GitHub Actions, rather than loading a third-party runtime CDN script.

The following MIT license applies to the bundled Plotly.js distributions:

```text
MIT License

Copyright (c) 2016-2024 Plotly Technologies Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

Other referenced articles, trademarks, images, and resources remain subject to the rights of their respective owners. This notice does not suggest that third-party authors endorse AyFlux.
