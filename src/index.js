const securityHeaders = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';",
  "X-XSS-Protection": "1; mode=block",
};

const homepageMetadata = [
  '<meta name="description" content="Explore acyclovir and valacyclovir pharmacokinetics in renal impairment, hemodialysis, and peritoneal dialysis with the AyFlux educational simulator.">',
  '<meta name="robots" content="index, follow">',
  '<link rel="canonical" href="https://ayflux.org/">',
  '<meta property="og:type" content="website">',
  '<meta property="og:site_name" content="AyFlux">',
  '<meta property="og:title" content="AyFlux | Acyclovir Pharmacokinetics Simulator">',
  '<meta property="og:description" content="Interactive educational simulation of acyclovir and valacyclovir pharmacokinetics, including renal impairment and dialysis.">',
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
        .on("footer.site-footer", {
          element(element) {
            element.append(' · <a href="/learn/">Learning center</a>', { html: true });
          },
        })
        .transform(securedResponse);
    }

    return securedResponse;
  },
};
