# AyFlux — Search Visibility and SEO Plan (DRAFT)

**Status:** Proposed copy and implementation plan only; no live site or search metadata has been changed by this draft.
**Audit date:** November 7, 2026.
**Primary canonical domain:** https://ayflux.org/

## Search strategy

The primary goal is to make AyFlux discoverable to students, researchers, and visitors looking for **educational acyclovir pharmacokinetics and dialysis modeling**. Avoid claims such as "clinical dosing calculator," "patient-safe dose," or "validated neurotoxicity predictor" unless separately established by suitable evidence and regulatory review.

Priority topics:
- Acyclovir pharmacokinetic simulator
- Acyclovir renal impairment modeling
- Acyclovir hemodialysis clearance
- Acyclovir peritoneal dialysis
- Acyclovir continuous renal replacement therapy (CRRT)
- Valacyclovir conversion to acyclovir in pharmacokinetic modeling
- CMMG metabolite in educational PK models
- Plasma and CSF concentration modeling

These are thematic targets, **not measured search volumes or ranking estimates**.

## Existing SEO foundations (verified in repository)

- `public/robots.txt` permits crawling and links to the sitemap.
- `public/sitemap.xml` lists the homepage, Overview, Dialysis, and Model methods pages.
- The Cloudflare Worker injects homepage meta description, canonical URL, and Open Graph tags.
- Each `public/learn/` HTML page already has its own title, meta description, canonical URL, and Open Graph tags.
- The separate Easter egg page has `noindex, nofollow`; keep it out of the sitemap.
- The educational pages link to each other and back to the simulator.
- The homepage has a legitimate standalone educational purpose; its core interactive UI has relatively little crawlable prose.

Do **not** add a second homepage description or canonical tag to `public/index.html` without removing or updating the Worker injection in `src/index.js`.

## Proposed titles and meta descriptions

### Homepage — https://ayflux.org/

**Title:** AyFlux — Acyclovir PK Simulator for Renal Function and Dialysis

**Description:** Explore simulated acyclovir and valacyclovir concentrations across kidney function, hemodialysis, peritoneal dialysis, and CRRT. Educational use only.

**Visible introduction (near the simulator's existing description, not another navigation bar):**

AyFlux is an interactive educational simulator for exploring how selected dosing, kidney function, and dialysis assumptions affect model-predicted acyclovir concentrations. Compare plasma, CSF, and CMMG profiles across scenarios and review the underlying assumptions before interpreting results. Not for patient care or prescribing.

### Overview — https://ayflux.org/learn/

**Title:** Acyclovir Pharmacokinetics Explained | AyFlux

**Description:** Learn how acyclovir and valacyclovir are represented in AyFlux, why kidney function matters, and how to interpret simulated plasma, CSF, and CMMG profiles.

### Dialysis — https://ayflux.org/learn/dialysis/

**Title:** Acyclovir in Hemodialysis, PD and CRRT | AyFlux

**Description:** Explore how hemodialysis, peritoneal dialysis, CRRT, and residual kidney function are represented in an educational acyclovir pharmacokinetic model.

### Methods — https://ayflux.org/learn/model-methods/

**Title:** AyFlux PK Model: Assumptions and Limitations

**Description:** Review the AyFlux two-compartment model, CSF and CMMG estimates, Monte Carlo uncertainty, and limitations of simulated acyclovir concentrations.

### Planned legal pages — AFTER PUBLICATION

- `/terms/` — **Terms of Use | AyFlux**
- `/privacy/` — **Privacy Policy | AyFlux**
- `/disclaimer/` — **Medical and Scientific Disclaimer | AyFlux**

Use self-referencing canonical URLs and straightforward descriptions for these pages, and link them from a restrained footer. Do not publish incomplete drafts, unresolved placeholders, or unverified privacy claims.

## Recommended FAQ copy (adapt into visible guide content)

**What is AyFlux?** AyFlux is a browser-based educational simulator that illustrates acyclovir and valacyclovir pharmacokinetic models under selected assumptions about kidney function and dialysis.

**Does AyFlux calculate the correct acyclovir dose for a patient?** No. It generates simulated concentration profiles; it is not intended to prescribe or adjust medication for individual patients.

**Which renal replacement therapies can I compare?** The simulator includes intermittent hemodialysis, peritoneal dialysis, and CRRT scenarios, along with a no-dialysis comparison. Model parameters are approximations and not substitutes for an actual treatment prescription.

**What are CSF and CMMG curves?** They are estimates produced from model assumptions. They are not direct measurements and do not establish a diagnosis or a toxicity threshold.

**What does a simulated 90% band mean?** It displays a range from the model's chosen uncertainty assumptions. It does not establish 90% accuracy when predicting concentrations in real patients.

Add these only where they answer visitor questions; do not pad the homepage or replicate the same FAQ across all pages.

## Site architecture and credibility

- Keep the simulator as the homepage and retain the small **User guide** header link.
- In educational pages, link directly to the relevant tool tab or section where technically reliable; use natural anchor text, not generic "click here."
- Add a short **About the project** section to the guide with the creator's *accurate* role, source repository, methods links, limitations, and last reviewed date.
- Keep publication and update dates factual. Never claim clinical qualifications, peer review, validation, FDA clearance, or institutional affiliation without evidence.
- Make primary-source citations individually accessible and check broken or incorrect reference links.
- Correct references to missing files in public copy: the repository currently has no root `CITATION.cff` and no root `THIRD_PARTY_NOTICES.md`, although some copy mentions included citation/license notices. Either add accurate files or correct those statements before public release.
- Preserve the existing noindex setting for the cats Easter egg; do not put it in search sitemap.

## Search Console and indexing

1. Verify ownership of `ayflux.org` in Google Search Console, ideally using a DNS TXT record in Cloudflare. Add Bing Webmaster Tools if useful.
2. Submit `https://ayflux.org/sitemap.xml` and inspect URL coverage and canonical status.
3. Test homepage and guide pages with URL Inspection, including whether crawlers see important page content and the canonical URL.
4. Check that HTTP redirects to HTTPS and that preferred host naming is consistent. Confirm response status is 200 for real pages and 404 for nonexistent pages; the Worker has SPA asset fallback, so test unknown routes to avoid accidental soft-404 pages.
5. Use PageSpeed Insights and mobile checks to evaluate actual performance instead of guessing.
6. Update content when research and model behavior change. Maintain a versioned changelog if substantial algorithm changes occur.

## Structured data — later, optional

Accurate `WebSite` or `WebPage` JSON-LD may help machines understand site identity but is not a substitute for relevant content. Do not fabricate user ratings or reviews. Google's enhanced SoftwareApplication display requires properties including an actual review or aggregate rating; avoid speculative star-rating markup. Note that the current CSP is `script-src 'self'`; JSON-LD placement and CSP behavior should be tested if implemented.

## Social previews

Current meta information includes Open Graph title/description but not a dedicated sharing image. A tasteful static preview could show the AyFlux logo, a screenshot of a real simulated concentration graph, and the words "Educational acyclovir PK simulation"—not a patient treatment promise. Add `og:image` only after the referenced image actually exists on the website.

## What **not** to do

- Don't publish large collections of generic AI-written medical blog posts merely to target keywords.
- Don't buy spam backlinks, copy clinical guideline text, or stuff keyword lists into invisible page content.
- Don't imply the simulator determines safe dosing, predicts toxicity in real patients, or has verified clinical accuracy.
- Don't add intrusive pop-ups, cookie banners, or onboarding tours without a clear functional or legal reason.
- Don't add an unverified "No data is collected" statement.

## Official guidance (for implementation verification)

- Google SEO Starter Guide: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- Creating helpful content: https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- Sitemap guidance: https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview
- SoftwareApplication structured data: https://developers.google.com/search/docs/appearance/structured-data/software-app
