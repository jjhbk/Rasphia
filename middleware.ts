import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // ------------------------------------------------
  // 1️⃣ NextAuth internals — always public
  // ------------------------------------------------
  if (path.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // ------------------------------------------------
  // 2️⃣ EXTENSION — PUBLIC BOOTSTRAP ENDPOINTS
  // ------------------------------------------------
  if (path === "/api/extension/init" || path === "/api/extension/exchange") {
    return NextResponse.next();
  }

  // ------------------------------------------------
  // 3️⃣ EXTENSION — PROTECTED (Bearer token)
  // ------------------------------------------------
  if (path.startsWith("/api/extension")) {
    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid extension token" },
        { status: 401 }
      );
    }

    return NextResponse.next();
  }

  // ------------------------------------------------
  // 4️⃣ WEB APIs — NextAuth cookie only
  // ------------------------------------------------
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
