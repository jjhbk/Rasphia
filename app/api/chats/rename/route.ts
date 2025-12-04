// app/api/chats/rename/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import { ObjectId } from "mongodb";
import { authGuard } from "@/app/lib/auth-guard";

export async function POST(req: NextRequest) {
  try {
    // 1️⃣ Authenticate user & parse input safely
    const { sessionEmail, body, errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;

    const { chatId, title } = body;

    if (!chatId) {
      return NextResponse.json({ error: "Missing chatId" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("rasphia");
    const coll = db.collection("chats");

    // 2️⃣ Check chat existence & ownership
    const chat = await coll.findOne({ _id: new ObjectId(chatId) });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    if (chat.userEmail !== sessionEmail) {
      return NextResponse.json(
        { error: "Forbidden: You do not own this chat" },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();

    // 3️⃣ If title is provided → simple update
    if (title && typeof title === "string" && title.trim().length > 0) {
      await coll.updateOne(
        { _id: new ObjectId(chatId) },
        { $set: { title: title.trim(), updatedAt: now } }
      );
      return NextResponse.json(
        { ok: true, title: title.trim() },
        { status: 200 }
      );
    }

    // 4️⃣ Auto-generate title if no title provided
    const messages = chat.messages ?? [];
    let candidate =
      messages
        .slice()
        .reverse()
        .find((m: any) => m.author === "user")?.text ??
      messages.find((m: any) => m.author === "user")?.text ??
      "Conversation";

    const generated = candidate.trim().slice(0, 60).replace(/\n/g, " ");
    const finalTitle = generated.length ? generated : "Conversation";

    // 5️⃣ Save generated title
    await coll.updateOne(
      { _id: new ObjectId(chatId) },
      { $set: { title: finalTitle, updatedAt: now } }
    );

    return NextResponse.json({ ok: true, title: finalTitle }, { status: 200 });
  } catch (err: any) {
    console.error("Chat rename error:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
