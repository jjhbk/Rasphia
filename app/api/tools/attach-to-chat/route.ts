import { NextRequest, NextResponse } from "next/server";
import type { Message } from "@/app/types";
import { authGuard } from "@/app/lib/auth-guard";
import { prisma } from "@/app/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { sessionEmail, body, errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;

    const { analysisId, chatId } = body || {};
    if (!analysisId || !chatId) {
      return NextResponse.json(
        { error: "analysisId and chatId are required" },
        { status: 400 }
      );
    }

    const chat = await prisma.chat.findUnique({ where: { id: String(chatId) } });
    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }
    if (chat.userEmail !== sessionEmail) {
      return NextResponse.json(
        { error: "Forbidden: You do not own this chat" },
        { status: 403 }
      );
    }

    const analysis = await prisma.analysis.findFirst({
      where: {
        OR: [{ analysisId: String(analysisId) }, { id: String(analysisId) }],
      },
    });
    if (!analysis) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }
    if (analysis.userEmail !== sessionEmail) {
      return NextResponse.json(
        { error: "Forbidden: You do not own this analysis" },
        { status: 403 }
      );
    }

    const payload =
      analysis.payload && typeof analysis.payload === "object"
        ? (analysis.payload as Record<string, unknown>)
        : {};
    const aiResult =
      payload.aiResult && typeof payload.aiResult === "object"
        ? (payload.aiResult as Record<string, unknown>)
        : {};

    const newMessage: Message = {
      author: "ai",
      text:
        `Attached analysis: ${String(payload.title || analysis.type || "Analysis")}\n\n` +
        `${String(aiResult.summary || aiResult.text || "")}`,
      products: undefined,
      comparisonTable: undefined,
    };

    const existingMessages = Array.isArray(chat.messages)
      ? (chat.messages as Message[])
      : [];
    await prisma.chat.update({
      where: { id: String(chatId) },
      data: {
        messages: [...existingMessages, newMessage],
        updatedAt: new Date(),
      },
    });

    const existingRefs = Array.isArray(payload.chatRefs)
      ? (payload.chatRefs as string[])
      : [];
    const nextRefs = Array.from(new Set([...existingRefs, String(chatId)]));
    await prisma.analysis.update({
      where: { id: analysis.id },
      data: {
        payload: {
          ...payload,
          chatRefs: nextRefs,
        },
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, message: newMessage });
  } catch (err) {
    console.error("❌ attach-to-chat error:", err);
    return NextResponse.json(
      { error: "Unable to attach analysis to chat" },
      { status: 500 }
    );
  }
}
