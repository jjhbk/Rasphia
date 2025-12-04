import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import { defaultPersona } from "@/app/utils/defaultPersona";
import { authGuard } from "@/app/lib/auth-guard";

export async function GET(req: NextRequest) {
  try {
    // 1️⃣ Authenticate and validate session
    const { sessionEmail, errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;

    // 2️⃣ Ignore email from query params — always trust session identity
    const email = sessionEmail;

    const client = await clientPromise;
    const db = client.db("rasphia");

    // 3️⃣ Fetch user with authenticated email only
    const user = await db.collection("users").findOne({ email });

    // 4️⃣ Merge persona with defaults (if you use defaults)
    const persona = {
      ...(defaultPersona || {}),
      ...(user?.persona || {}),
    };

    return NextResponse.json({ persona }, { status: 200 });
  } catch (err) {
    console.error("get-persona error:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
