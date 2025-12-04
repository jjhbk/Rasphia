// app/api/tools/list-analyses/route.ts

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import { authGuard } from "@/app/lib/auth-guard";

export async function GET(req: NextRequest) {
  try {
    // 1️⃣ Authenticate user
    const { sessionEmail, errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;

    // Identity is ALWAYS taken from session, never query params
    const email = sessionEmail;

    const client = await clientPromise;
    const db = client.db("rasphia");

    // 2️⃣ Fetch ONLY the logged-in user’s analyses
    const docs = await db
      .collection("analyses")
      .find({ userEmail: email })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(docs, { status: 200 });
  } catch (err) {
    console.error("❌ list-analyses error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
