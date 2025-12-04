import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import { ObjectId } from "mongodb";
import { authGuard } from "@/app/lib/auth-guard";

export async function POST(req: NextRequest) {
  try {
    // 1️⃣ Authenticate + parse body
    const { sessionEmail, body, errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;

    const { chatId, title } = body;

    if (!chatId || typeof title !== "string") {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("rasphia");
    const coll = db.collection("chats");

    // 2️⃣ Validate chat exists
    const chat = await coll.findOne({ _id: new ObjectId(chatId) });
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

    // 4️⃣ Update title
    const now = new Date().toISOString();
    const safeTitle = title.trim() || "Untitled";

    await coll.updateOne(
      { _id: new ObjectId(chatId) },
      {
        $set: {
          title: safeTitle,
          updatedAt: now,
        },
      }
    );

    return NextResponse.json(
      { success: true, title: safeTitle },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Failed to update chat title:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
