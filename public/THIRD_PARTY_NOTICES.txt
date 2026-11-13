# AyFlux Third-Party Notices

AyFlux's own source is offered under the GNU Affero General Public License, version 3 (AGPLv3). The full text is in `LICENSE`.

## Poppins font (weights 300 and 800)

- Font: [Poppins by the Poppins Project Authors / Indian Type Foundry](https://github.com/itfoundry/Poppins)
- Self-hosted via pinned `@fontsource/poppins@5.3.0` during the release build; files are deployed only to the application's own origin.
- Site assets: `public/assets/fonts/poppins-latin-300-normal.woff2` and `public/assets/fonts/poppins-latin-800-normal.woff2`.
- License: **SIL Open Font License 1.1** ([canonical license text](https://github.com/itfoundry/Poppins/blob/master/OFL.txt)).
- Copyright: Copyright 2020 The Poppins Project Authors (https://github.com/itfoundry/Poppins).

The font is used only for the two-weight AyFlux wordmark. The application's AGPL license does not change the third-party font's separate license. The build stage copies the upstream font license when bundled in the npm package. **Fonts are not authored by AyFlux**.

## Chart libraries

The build distributes Apache ECharts 5.6.0 and ECharts GL 2.0.9 with their upstream LICENSE and NOTICE files in /assets/vendor/.
