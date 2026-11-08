# AyFlux — Privacy Policy (VERIFICATION DRAFT)

**Status:** Not approved for publication. Descriptions of data practices must be verified against Cloudflare settings and browser network traffic.
**Drafted:** November 7, 2026.
**Effective date when published:** [TO BE SET]
**Site:** https://ayflux.org/
**Operator:** [CONFIRM LEGAL OPERATOR]
**Privacy contact:** [CONTACT EMAIL]

## 1. What AyFlux does

AyFlux is a browser-based educational pharmacokinetic simulator. Visitors can adjust example inputs such as age, weight, serum creatinine, drug dose, kidney function, dialysis schedules, and optional measured concentration values. The simulator can import local configuration files and let visitors download results.

Based on the reviewed website JavaScript on November 7, 2026, these simulation calculations and file operations run in the visitor's browser. The reviewed simulator code does not contain a dedicated application endpoint that intentionally transmits those entered simulation inputs to the AyFlux operator.

**Important:** That code review does **not** establish what browser extensions, Cloudflare account features, optional analytics, error-monitoring tools, or future integrations may collect. The operator must verify the complete deployment before publishing this statement.

## 2. Information processed when you visit the site

Like most web hosting providers, the infrastructure used to deliver AyFlux may process technical request information, including IP address, requested URL, time of request, and browser or device information. This can be needed to deliver pages, protect against abuse, diagnose problems, and operate the service.

AyFlux is hosted through Cloudflare services. Cloudflare's handling of technical data is subject to its applicable service terms and privacy disclosures. [VERIFY: List exactly which Cloudflare services, logs, security controls, and optional analytics are enabled for this domain and their retention settings.]

## 3. Simulation inputs, imports, and exports

When you change simulation parameters, the currently reviewed application processes them in your browser. It can read a configuration file you explicitly select and create JSON or CSV files that you download locally. AyFlux does not intentionally collect the contents of these files through an application upload endpoint in the code reviewed for this draft.

Please do not enter identifiable patient information. Locally downloaded files remain under the control of your browser, operating system, and any backup or sync services you use; this site cannot control those services.

[VERIFY: Test Network requests in a live browser while editing inputs, importing JSON, using model validation, and exporting results. Confirm whether any browser-side persistence is used and whether any future server-side features exist.]

## 4. Cookies, analytics, and similar technologies

[CHOOSE THE ACCURATE OPTION ONLY AFTER AUDIT; DO NOT PUBLISH BOTH.]

**Option A — no optional analytics:** AyFlux does not intentionally set its own analytics cookies or run advertising trackers. Cloudflare or the browser may still use technically necessary security measures.

**Option B — analytics enabled:** AyFlux uses [IDENTIFY PROVIDER/SERVICE] for [PURPOSE]. It may process [EXACT CATEGORIES], use [COOKIES OR NO COOKIES], and retain data for [PERIOD]. Visitor choices, if required, are available through [MECHANISM].

[VERIFY: Cloudflare Web Analytics, any other scripts, cookies set by the actual domain, Cloudflare access logs, and whether consent/opt-out mechanisms are required for relevant jurisdictions.]

## 5. Purposes and legal basis where applicable

Site request information may be used to serve and secure the site and troubleshoot technical problems. If analytics are enabled, document their specific purpose, any applicable consent or legal basis, and how visitors exercise their rights.

AyFlux does not advertise its simulator as a repository for identifiable personal health records.

[VERIFY: If data concerning identifiable individuals is collected now or in the future, assess applicable health-data and privacy laws before enabling that feature.]

## 6. Sharing, retention, and international processing

Hosting and security service providers may process technical access information on our behalf, subject to their applicable terms. [LIST ANY OTHER PROVIDERS AND CONTRACTUAL ARRANGEMENTS.]

Technical data and any optional analytics are retained according to [EXACT VERIFIED RETENTION PERIODS]. Processing may occur in [VERIFIED LOCATIONS / DISCLOSURE OF GLOBAL INFRASTRUCTURE]. We do not promise that data stays in any single country unless that is contractually and technically confirmed.

[VERIFY: Cloudflare plan, logs, data processing terms, caching, and retention before publishing.]

## 7. Security

We use reasonable administrative and technical measures appropriate to the site and its operation. No website or transmission method can be guaranteed completely secure. Do not upload or enter information that you are not authorized to handle.

## 8. Your choices and rights

You can choose not to use the simulator, avoid entering identifying information, and control locally downloaded files through your own device. Depending on your location and the personal information actually processed, applicable law may give you rights to request access, correction, deletion, or other choices.

Contact [CONTACT EMAIL] with privacy questions or requests. We may need to verify a request before responding and may have legal obligations to retain limited records.

## 9. Children

AyFlux is designed for educational use. [VERIFY: Specify the intended age audience and whether any personal information is knowingly collected from minors; add jurisdiction-specific language if required.]

## 10. Changes

The published Privacy Policy will display an effective date and be updated when relevant practices change.

## 11. Contact

[LEGAL OPERATOR NAME]
[PUBLIC CONTACT EMAIL OR FORM]
[PUBLIC MAILING ADDRESS IF REQUIRED BY APPLICABLE LAW]

---

### Required prepublication privacy audit

- Confirm site traffic is served through the expected Cloudflare account and review its analytics, WAF, bot and logging settings.
- Inspect browser Network and Storage panels using a new private browsing session; test simulator interactions, file import/export, and every documentation page.
- Confirm whether any cookies, telemetry scripts, Web Analytics, third-party requests, form endpoints, or automatic backups are active.
- Record retention periods, vendor privacy terms, geographic transfers, and incident-response arrangements.
- Confirm whether the operator is subject to state consumer privacy laws, FTC Act obligations, HIPAA, the FTC Health Breach Notification Rule, or specific medical-data statutes. Do not infer any exemption solely from calling the website "educational."
- Replace all placeholders and publish only accurate selected text.

Reference material:
- FTC Health Breach Notification Rule overview: https://www.ftc.gov/business-guidance/resources/complying-ftcs-health-breach-notification-rule-0
- FTC consumer health information guidance: https://www.ftc.gov/business-guidance/resources/collecting-using-or-sharing-consumer-health-information-look-hipaa-ftc-act-health-breach
