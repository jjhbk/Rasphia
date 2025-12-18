import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // ✅ Always allow NextAuth
  if (path.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // ✅ Always allow ALL extension routes
  if (path.startsWith("/api/extension")) {
    return NextResponse.next();
  }

  // 🔐 Protect other API routes via session cookie
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
