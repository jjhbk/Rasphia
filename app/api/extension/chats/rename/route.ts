import { NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import { ObjectId } from "mongodb";
import { verifyExtensionToken } from "@/app/lib/verifyExtToken";
import { handleOptions, withExtensionCors } from "@/app/lib/extensionCors";

export const runtime = "nodejs";
export const OPTIONS = handleOptions;

export const POST = withExtensionCors(async (req: Request) => {
  try {
    // 1️⃣ EXTENSION-ONLY AUTH
    const email = await verifyExtensionToken(req);
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2️⃣ Parse input
    const { chatId, title } = await req.json();

    if (!chatId) {
      return NextResponse.json({ error: "Missing chatId" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("rasphia");
    const coll = db.collection("chats");

    // 3️⃣ Find chat + verify ownership (extension schema)
    const chat = await coll.findOne({ _id: new ObjectId(chatId) });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    if (chat.userEmail !== email) {
      return NextResponse.json(
        { error: "Forbidden: You do not own this chat" },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();

    // 4️⃣ Explicit title provided
    if (typeof title === "string" && title.trim().length > 0) {
      const finalTitle = title.trim();

      await coll.updateOne(
        { _id: new ObjectId(chatId) },
        { $set: { title: finalTitle, updatedAt: now } }
      );

      return NextResponse.json(
        { ok: true, title: finalTitle },
        { status: 200 }
      );
    }

    // 5️⃣ Auto-generate title from last user message
    const messages = chat.messages ?? [];

    const candidate =
      messages
        .slice()
        .reverse()
        .find((m: any) => m.author === "user")?.text ??
      messages.find((m: any) => m.author === "user")?.text ??
      "Conversation";

    const generated = candidate.trim().slice(0, 60).replace(/\n/g, " ");
    const finalTitle = generated.length ? generated : "Conversation";

    // 6️⃣ Save generated title
    await coll.updateOne(
      { _id: new ObjectId(chatId) },
      { $set: { title: finalTitle, updatedAt: now } }
    );

    return NextResponse.json({ ok: true, title: finalTitle }, { status: 200 });
  } catch (err: any) {
    console.error("❌ Chat rename error:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
});
