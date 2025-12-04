// app/api/chats/list/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import { ChatSession } from "@/app/types";
import { authGuard } from "@/app/lib/auth-guard";

export async function GET(req: NextRequest) {
  try {
    // 1️⃣ AuthGuard: session validation + secure identity extraction
    const { sessionEmail, errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;

    // 2️⃣ ALWAYS trust session identity — NEVER client query params
    const email = sessionEmail;

    const client = await clientPromise;
    const db = client.db("rasphia");

    // 3️⃣ Fetch only chats owned by this user
    const chats = await db
      .collection<ChatSession>("chats")
      .find({ userEmail: email })
      .sort({ updatedAt: -1 })
      .toArray();

    return NextResponse.json(chats, { status: 200 });
  } catch (err: any) {
    console.error("Chat list error:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
