// app/api/chats/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import { ObjectId } from "mongodb";
import { authGuard } from "@/app/lib/auth-guard";

export async function POST(req: NextRequest) {
  try {
    // 1️⃣ AuthGuard: session check + email gating + safe body parsing
    const { sessionEmail, body, errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;

    const { chatId } = body;

    if (!chatId) {
      return NextResponse.json({ error: "Missing chatId" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("rasphia");

    // 2️⃣ Verify that the chat exists
    const chat = await db.collection("chats").findOne({
      _id: new ObjectId(chatId),
    });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // 3️⃣ Ownership check — CRITICAL
    if (chat.userEmail !== sessionEmail) {
      return NextResponse.json(
        { error: "Forbidden: You do not own this chat" },
        { status: 403 }
      );
    }

    // 4️⃣ Delete the chat
    await db.collection("chats").deleteOne({
      _id: new ObjectId(chatId),
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error("Chat delete error:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
