# AyFlux website drafts — unpublished

These files are **drafts for review**, intentionally stored outside `public/`. The deployed Cloudflare and GitHub Pages sites serve `public/`, so this folder does not add live legal pages, change the site's SEO, or alter the simulator.

## Legal and compliance

- [Terms of Use](legal/terms-of-use.md)
- [Privacy Policy](legal/privacy-policy.md)
- [Medical and scientific disclaimer](legal/medical-disclaimer.md)

## Search visibility and content

- [SEO audit and metadata proposals](seo/search-visibility-plan.md)
- [Proposed homepage and About copy](seo/site-copy.md)

## What must be confirmed before publishing

**Legal:** exact operator identity; public contact channel; Terms effective date; appropriate jurisdiction and enforceability of liability terms; rights to all incorporated artwork and third-party libraries; qualified FDA/software regulatory review for intended use; review by a lawyer familiar with U.S. consumer and health-technology issues.

**Privacy:** Cloudflare security/analytics/logging configuration; IP, request-data and any cookie retention; other third-party services; live browser network tests of simulator inputs and imported files; personal-data rights; applicable laws. The current browser-side simulator source contains no dedicated application call transmitting input values, but infrastructure data processing has not been fully verified. Do not publish unqualified "nothing is collected" claims.

**SEO:** use accurate source-derived content, not unverified claims of clinical validation. The homepage's search metadata is currently injected by `src/index.js` while user-guide pages define it in their own HTML, so coordinate implementation to avoid duplicates. The cats Easter egg stays `noindex`.

**Repository inconsistencies noticed:** some public source/citation wording refers to `CITATION.cff` and `THIRD_PARTY_NOTICES.md` while neither file was located at the repository root in the audit. Verify and resolve that before linking those resources publicly.

**Release workflow:** once legal language is approved, create styled pages consistent with the existing AyFlux guide, add small footer links, configure canonical URLs and sitemap appropriately, and run the existing automated tests plus a browser check. Do not deploy drafts directly.

## Review references

- FDA clinical decision support software guidance (January 2026): https://www.fda.gov/regulatory-information/search-fda-guidance-documents/clinical-decision-support-software
- FTC consumer health information / health breach rule: https://www.ftc.gov/business-guidance/resources/collecting-using-or-sharing-consumer-health-information-look-hipaa-ftc-act-health-breach
- Google people-first guidance: https://developers.google.com/search/docs/fundamentals/creating-helpful-content

Prepared November 7, 2026. These drafts are not legal advice or a claim of regulatory status.

## Publication status (November 2026)

The standalone `/license/`, `/cite/`, and `/disclaimer/` pages have been prepared for public release, along with factual SEO metadata revisions and a clearer research-tools explanation. The Terms and Privacy drafts **have not been published** because a suitable public contact method and Cloudflare data-handling details still need confirmation. Do not treat the privacy draft as verified or effective until those questions are resolved.
