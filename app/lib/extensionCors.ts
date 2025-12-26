import { NextResponse } from "next/server";

/**
 * Standard CORS headers for Rasphia Extension APIs
 */
export function getExtensionCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*", // chrome-extension:// origins
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Rasphia-Extension-Token",
    "Access-Control-Max-Age": "86400",
  };
}

/**
 * Handle OPTIONS preflight (App Router compatible)
 */
export function handleOptions(_req?: Request) {
  return new NextResponse(null, {
    status: 204, // ✅ correct for preflight
    headers: getExtensionCorsHeaders(),
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
    Object.entries(getExtensionCorsHeaders()).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  };
}
