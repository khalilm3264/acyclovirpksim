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

export default {
  async fetch(request, env, ctx) {
    let response;

    if (env.ASSETS) {
      response = await env.ASSETS.fetch(request);
    } else {
      response = new Response("ASSETS binding not configured", { status: 500 });
    }

    const newResponse = new Response(response.body, response);

    for (const [key, value] of Object.entries(securityHeaders)) {
      newResponse.headers.set(key, value);
    }

    return newResponse;
  },
};
