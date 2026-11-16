# AyFlux release versions

Use America/New_York for development release dates. On the first development release of a new day, increment the application minor version and reset patch to zero (for example, 0.28.0 on 2026-11-16, then 0.29.0 on the next day with development work). Do not create empty releases on days without development. Keep the day's minor number for subsequent work; increment the patch when publishing another release that day.

Synchronize package.json, package-lock.json, public/assets/ayflux-version.js, both CITATION.cff files, current citation/BibTeX content, the site release link, offline cache identity and CHANGELOG.md. Preserve historical versions in dated records, frozen research artifacts and test fixtures. Run npm test before merging. The release workflow publishes a new tag from the exact main commit after deployment checks pass and preserves existing releases.

State model equation, parameter and default changes explicitly in the changelog. A new application version does not by itself establish model validation or change configuration schema 2.
