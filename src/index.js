/*
 * AyFlux — educational acyclovir and valacyclovir pharmacokinetics simulator.
 * Copyright (C) 2026 Muhammad Khalil
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * This file is part of AyFlux, licensed under the GNU Affero General
 * Public License version 3. It is provided without warranty.
 * See LICENSE: https://github.com/khalilm3264/acyclovirpksim/blob/main/LICENSE
 * Contact: contact@ayflux.org
 */
const securityHeaders = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' https://bzrcdn.openai.com; connect-src 'self' https://bzrcdn.openai.com https://bzr.openai.com; worker-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://bzr.openai.com; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';",
  "X-XSS-Protection": "1; mode=block",
};

const homepageMetadata = [
  '<meta name="description" content="Explore simulated acyclovir and valacyclovir concentrations across kidney function, hemodialysis, peritoneal dialysis, and CRRT. Educational use only.">',
  '<meta name="robots" content="index, follow">',
  '<link rel="canonical" href="https://ayflux.org/">',
  '<meta property="og:type" content="website">',
  '<meta property="og:site_name" content="AyFlux">',
  '<meta property="og:title" content="AyFlux — Acyclovir PK Simulator for Renal Function and Dialysis">',
  '<meta property="og:description" content="Explore how model assumptions about kidney function and dialysis affect simulated acyclovir concentrations. Not for patient care.">',
  '<meta property="og:url" content="https://ayflux.org/">',
  '<meta name="twitter:card" content="summary">',
].join("\n");

export default {
  async fetch(request, env, ctx) {
    const response = env.ASSETS
      ? await env.ASSETS.fetch(request)
      : new Response("ASSETS binding not configured", { status: 500 });

    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(securityHeaders)) {
      headers.set(key, value);
    }

    const securedResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });

    const url = new URL(request.url);
    const isHomepage = url.pathname === "/" || url.pathname === "/index.html";
    const isHtml = securedResponse.headers.get("content-type")?.includes("text/html");

    // Insert search metadata without changing the bundled simulator HTML or JavaScript.
    if (request.method === "GET" && securedResponse.ok && isHomepage && isHtml) {
      return new HTMLRewriter()
        .on("head", {
          element(element) {
            element.append(homepageMetadata, { html: true });
          },
        })
        .transform(securedResponse);
    }

    return securedResponse;
  },
};
