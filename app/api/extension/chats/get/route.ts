// app/api/chats/get/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import { ObjectId } from "mongodb";
import { verifyExtensionToken } from "@/app/lib/verifyExtToken";
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    // 1️⃣ EXTENSION-ONLY AUTH
    const email = await verifyExtensionToken(req);
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2️⃣ Extract chat ID
    const url = new URL(req.url);
    const chatId = url.searchParams.get("chatId");

    if (!chatId) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    // 3️⃣ Connect to DB
    const client = await clientPromise;
    const db = client.db("rasphia");

    // 4️⃣ Load chat
    const chat = await db.collection("chats").findOne({
      _id: new ObjectId(chatId),
    });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // 5️⃣ Ownership check (new schema uses `email`)
    if (chat.email !== email) {
      return NextResponse.json(
        { error: "Forbidden: You do not own this chat" },
        { status: 403 }
      );
    }

    // 6️⃣ Return chat
    return NextResponse.json(chat, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  } catch (err: any) {
    console.error("❌ Chat fetch error:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      }
    );
  }
}
