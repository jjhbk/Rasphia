// app/api/chats/add-message/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import { ObjectId } from "mongodb";
import { Message } from "@/app/types";
import { authGuard } from "@/app/lib/auth-guard";

export async function POST(req: NextRequest) {
  try {
    // 🔐 1. Run authGuard FIRST (session check + email gating)
    const { sessionEmail, body, errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;

    // 2. Extract validated body
    const { chatId, message } = body as {
      chatId: string;
      message: Message;
    };

    if (!chatId || !message) {
      return NextResponse.json(
        { error: "Missing chatId or message" },
        { status: 400 }
      );
    }

    // 3️⃣ Connect to DB
    const client = await clientPromise;
    const db = client.db("rasphia");

    // 🔒 4. Verify chat ownership BEFORE updating
    const chat = await db
      .collection("chats")
      .findOne({ _id: new ObjectId(chatId) });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    if (chat.userEmail !== sessionEmail) {
      return NextResponse.json(
        { error: "Forbidden: You do not own this chat" },
        { status: 403 }
      );
    }

    // 🕒 5. Set message timestamp
    const now = new Date().toISOString();
    message.createdAt = message.createdAt ?? now;

    // 💾 6. Update chat
    await db.collection("chats").updateOne(
      { _id: new ObjectId(chatId) },
      {
        $push: { messages: message } as any,
        $set: { updatedAt: now },
      }
    );

    // 🔍 7. Return updated chat
    const updated = await db
      .collection("chats")
      .findOne({ _id: new ObjectId(chatId) });

    return NextResponse.json(updated, { status: 200 });
  } catch (err: any) {
    console.error("Add message error:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
