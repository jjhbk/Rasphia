import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import { authGuard } from "@/app/lib/auth-guard";

export async function GET(req: NextRequest) {
  try {
    // 1️⃣ Authenticate request
    const { sessionEmail, errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;

    // 2️⃣ Ignore `?email=` from client — trust session only
    const email = sessionEmail;

    const client = await clientPromise;
    const db = client.db("rasphia");

    // 3️⃣ Fetch logged-in user's profile only
    const user = await db.collection("user_profiles").findOne({ email });

    return NextResponse.json(user || {}, { status: 200 });
  } catch (err) {
    console.error("❌ user-profile error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
