// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const EXT_SECRET = new TextEncoder().encode(process.env.EXTENSION_JWT_SECRET!);

async function verifyExtensionBearer(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) return false;

  const token = auth.replace("Bearer ", "");

  try {
    await jwtVerify(token, EXT_SECRET, {
      audience: "rasphia_extension",
    });
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // 1️⃣ Always allow NextAuth
  if (path.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // 2️⃣ Extension routes
  if (path.startsWith("/api/extension")) {
    // PUBLIC endpoints
    if (
      path.startsWith("/api/extension/init") ||
      path.startsWith("/api/extension/exchange")
    ) {
      return NextResponse.next();
    }

    // 🔐 All other extension routes require Bearer token
    const ok = await verifyExtensionBearer(req);
    if (!ok) {
      return NextResponse.json(
        { error: "Invalid or missing extension token" },
        { status: 401 }
      );
    }

    return NextResponse.next();
  }

  // 3️⃣ Non-extension API → NextAuth cookie
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
