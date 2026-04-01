// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  const publicApiPrefixes = [
    "/api/auth",
    "/api/extension",
    "/api/mobile/auth",
    "/api/storefronts",
    "/api/whatsapp",
    "/api/whatsapp/send-otp",
    "/api/whatsapp/verify-otp",
    "/api/razorpay-webhook",
    "/api/seedhape-webhook",
    "/api/upi-launch",
    "/api/contact",
  ];

  if (publicApiPrefixes.some((prefix) => path.startsWith(prefix))) {
    return NextResponse.next();
  }

  // 1️⃣ Always allow NextAuth
  // 2️⃣ Protect all other API routes with NextAuth cookies
  if (path.startsWith("/api/")) {
    const mobileTokenHeader = req.headers.get("x-rasphia-mobile-token")?.trim();
    const authHeader = req.headers.get("authorization")?.trim() || "";
    const hasBearerToken = /^Bearer\s+\S+/i.test(authHeader);

    // Allow mobile-token-bearing requests to reach route-level auth verification.
    if (mobileTokenHeader || hasBearerToken) {
      return NextResponse.next();
    }

    const sessionToken =
      req.cookies.get("next-auth.session-token")?.value ||
      req.cookies.get("__Secure-next-auth.session-token")?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
