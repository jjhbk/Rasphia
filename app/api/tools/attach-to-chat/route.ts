// app/api/tools/attach-to-chat/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import { ObjectId } from "mongodb";
import type { Message } from "@/app/types";

export async function POST(req: Request) {
  try {
    const { analysisId, chatId, userEmail } = await req.json();

    if (!analysisId || !chatId || !userEmail) {
      return NextResponse.json(
        { error: "analysisId, chatId, and userEmail are required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("rasphia");

    const analysis = await db.collection("analyses").findOne({ analysisId });

    if (!analysis) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 }
      );
    }

    // Build a valid Message using your global type
    const newMessage: Message = {
      author: "ai",
      text:
        `Attached analysis: ${analysis.title ?? analysis.tool}\n\n` +
        `${analysis.aiResult?.text ?? analysis.prompt}`,
      products: undefined,
      comparisonTable: undefined,
    };

    await db.collection("chats").updateOne(
      {
        _id: new ObjectId(chatId),
        userEmail,
      },
      {
        $push: { messages: newMessage } as any,
        $set: { updatedAt: new Date().toISOString() },
      }
    );

    return NextResponse.json({ ok: true, message: newMessage });
  } catch (err: any) {
    console.error("❌ attach-to-chat error:", err);
    return NextResponse.json(
      {
        error: err?.message ?? "Unable to attach analysis to chat",
      },
      { status: 500 }
    );
  }
}
