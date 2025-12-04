import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // 1️⃣ Allow Auth routes to pass through (NextAuth MUST stay public)
  if (path.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // 2️⃣ Require NextAuth session cookie for all other API routes
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

// 3️⃣ Correct matcher for your Next.js version
export const config = {
  matcher: ["/api/:path*"],
};
