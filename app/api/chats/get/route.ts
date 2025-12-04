// app/api/chats/get/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import { ObjectId } from "mongodb";
import { ChatSession } from "@/app/types";
import { authGuard } from "@/app/lib/auth-guard";

export async function GET(req: NextRequest) {
  try {
    // 1️⃣ Run authGuard (session + email gating)
    const { sessionEmail, errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;

    // 2️⃣ Validate and extract chat ID
    const id = String(req.nextUrl.searchParams.get("id") ?? "");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    // 3️⃣ Database connection
    const client = await clientPromise;
    const db = client.db("rasphia");

    // 4️⃣ Look up the chat
    const chat = await db
      .collection<ChatSession>("chats")
      .findOne({ _id: new ObjectId(id) });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // 5️⃣ Ownership validation — CRITICAL PROTECTION
    if (chat.userEmail !== sessionEmail) {
      return NextResponse.json(
        { error: "Forbidden: You do not own this chat" },
        { status: 403 }
      );
    }

    // 6️⃣ Success — return chat
    return NextResponse.json(chat, { status: 200 });
  } catch (err: any) {
    console.error("Chat fetch error:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
