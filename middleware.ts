// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // 1️⃣ Always allow NextAuth
  if (path.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // 2️⃣ Allow ALL extension routes
  // Extension auth is handled inside route handlers
  if (path.startsWith("/api/extension")) {
    return NextResponse.next();
  }

  // 3️⃣ Protect all other API routes with NextAuth cookies
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
