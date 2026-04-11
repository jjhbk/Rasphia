import { NextResponse } from "next/server";

/**
 * Standard CORS headers for Rasphia Extension APIs
 */
export function getExtensionCorsHeaders(req?: Request) {
  const origin = req?.headers.get("origin");
  const allowOrigin =
    origin && origin.startsWith("chrome-extension://") ? origin : "*";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Rasphia-Extension-Token",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

/**
 * Handle OPTIONS preflight (App Router compatible)
 */
export function handleOptions(_req?: Request) {
  return new NextResponse(null, {
    status: 204, // ✅ correct for preflight
    headers: getExtensionCorsHeaders(_req),
  });
}

/**
 * Wrap a route handler to auto-apply CORS headers
 */
export function withExtensionCors(
  handler: (req: Request) => Promise<NextResponse>
) {
  return async (req: Request) => {
    if (req.method === "OPTIONS") {
      return handleOptions(req);
    }

    const response = await handler(req);

    // Inject headers safely
    Object.entries(getExtensionCorsHeaders(req)).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  };
}
