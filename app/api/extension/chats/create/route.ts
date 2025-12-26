import { NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import { ChatSession, Message } from "@/app/types";
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
    const { initialMessage } = await req.json();

    const now = new Date().toISOString();

    // 3️⃣ Ensure first message exists
    const firstMessage: Message = initialMessage ?? {
      author: "ai",
      text: "Hello — tell me what you're looking for and I'll find the best picks.",
      createdAt: now,
    };

    // 4️⃣ New chat schema (extension version)
    const newChat: Omit<ChatSession, "_id"> = {
      userEmail: email,
      title: firstMessage.text.slice(0, 50) || "New Chat",
      createdAt: now,
      updatedAt: now,
      messages: [firstMessage],
    };

    // 5️⃣ Insert into DB
    const client = await clientPromise;
    const db = client.db("rasphia");
    const res = await db.collection("chats").insertOne(newChat);

    return NextResponse.json(
      { ...newChat, _id: res.insertedId },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("❌ Chat Create Error:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
});
