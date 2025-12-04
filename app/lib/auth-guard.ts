// app/lib/auth-guard.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function authGuard(req: Request) {
  // 1️⃣ Validate session
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return {
      sessionEmail: null,
      body: null,
      errorResponse: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  const sessionEmail = session.user.email;

  // 2️⃣ Detect whether body is multipart/form-data
  const contentType = req.headers.get("content-type") || "";

  let body: any = null;

  // 🧠 Only parse JSON *if* content-type is JSON
  if (req.method !== "GET" && contentType.includes("application/json")) {
    try {
      body = await req.json();
    } catch {
      // ignore invalid json
    }
  }

  // 🧠 For multipart/form-data, skip parsing to avoid consuming the body
  // Route will handle it with req.formData()

  // 3️⃣ Email spoof protection ONLY if JSON body was parsed
  if (body?.email && body.email !== sessionEmail) {
    return {
      sessionEmail,
      body: null,
      errorResponse: NextResponse.json(
        { error: "Forbidden: email mismatch" },
        { status: 403 }
      ),
    };
  }

  return { sessionEmail, body, errorResponse: null };
}
