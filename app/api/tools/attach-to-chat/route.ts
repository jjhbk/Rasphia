// app/api/tools/attach-to-chat/route.ts

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import { ObjectId } from "mongodb";
import type { Message } from "@/app/types";
import { authGuard } from "@/app/lib/auth-guard";

export async function POST(req: NextRequest) {
  try {
    // 1️⃣ Authenticate request + parse body safely
    const { sessionEmail, body, errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;

    const { analysisId, chatId } = body;

    if (!analysisId || !chatId) {
      return NextResponse.json(
        { error: "analysisId and chatId are required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("rasphia");

    // 2️⃣ Validate chat ownership
    const chat = await db.collection("chats").findOne({
      _id: new ObjectId(chatId),
    });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    if (chat.userEmail !== sessionEmail) {
      return NextResponse.json(
        { error: "Forbidden: You do not own this chat" },
        { status: 403 }
      );
    }

    // 3️⃣ Validate analysis ownership
    const analysis = await db.collection("analyses").findOne({ analysisId });

    if (!analysis) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 }
      );
    }

    if (analysis.userEmail !== sessionEmail) {
      return NextResponse.json(
        { error: "Forbidden: You do not own this analysis" },
        { status: 403 }
      );
    }

    // 4️⃣ Build safe Message object
    const newMessage: Message = {
      author: "ai",
      text:
        `Attached analysis: ${analysis.title ?? analysis.tool}\n\n` +
        `${analysis.aiResult?.text ?? analysis.prompt ?? ""}`,
      products: undefined,
      comparisonTable: undefined,
    };

    // 5️⃣ Update chat
    const result = await db.collection("chats").updateOne(
      { _id: new ObjectId(chatId) },
      {
        $push: { messages: newMessage } as any,
        $set: { updatedAt: new Date().toISOString() },
      }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: "Failed to attach analysis to chat" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, message: newMessage });
  } catch (err: any) {
    console.error("❌ attach-to-chat error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unable to attach analysis to chat" },
      { status: 500 }
    );
  }
}
