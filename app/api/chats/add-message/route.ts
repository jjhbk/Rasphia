// app/api/chats/add-message/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { Message } from "@/app/types";
import { authGuard } from "@/app/lib/auth-guard";
import { prisma } from "@/app/lib/prisma";

function isMessage(value: unknown): value is Message {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    (candidate.author === "user" || candidate.author === "ai") &&
    typeof candidate.text === "string"
  );
}

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

    const chat = await prisma.chat.findUnique({ where: { id: chatId } });

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
    const existingMessages = Array.isArray(chat.messages)
      ? chat.messages.filter(isMessage)
      : [];
    const nextMessages = [...existingMessages, message] as unknown as Prisma.InputJsonValue;

    const updated = await prisma.chat.update({
      where: { id: chatId },
      data: {
        messages: nextMessages,
        updatedAt: new Date(now),
      },
    });

    return NextResponse.json({ ...updated, _id: updated.id }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("Add message error:", err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
