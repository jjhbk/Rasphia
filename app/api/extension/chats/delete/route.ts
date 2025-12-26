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

    // 2️⃣ Parse body
    const { chatId } = await req.json();

    if (!chatId) {
      return NextResponse.json({ error: "Missing chatId" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("rasphia");

    // 3️⃣ Verify chat exists
    const chat = await db.collection("chats").findOne({
      _id: new ObjectId(chatId),
    });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // 4️⃣ Validate ownership (extension schema)
    if (chat.userEmail !== email) {
      return NextResponse.json(
        { error: "Forbidden: You do not own this chat" },
        { status: 403 }
      );
    }

    // 5️⃣ Delete chat
    await db.collection("chats").deleteOne({
      _id: new ObjectId(chatId),
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error("❌ Chat delete error:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
});
