// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  const publicApiPrefixes = [
    "/api/auth",
    "/api/extension",
    "/api/whatsapp",
    "/api/whatsapp/send-otp",
    "/api/whatsapp/verify-otp",
    "/api/razorpay-webhook",
    "/api/contact",
  ];

  if (publicApiPrefixes.some((prefix) => path.startsWith(prefix))) {
    return NextResponse.next();
  }

  // 1️⃣ Always allow NextAuth
  // 2️⃣ Protect all other API routes with NextAuth cookies
  if (path.startsWith("/api/")) {
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
