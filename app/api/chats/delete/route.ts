// app/api/chats/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { authGuard } from "@/app/lib/auth-guard";
import { prisma } from "@/app/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    // 1️⃣ AuthGuard: session check + email gating + safe body parsing
    const { sessionEmail, body, errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;

    const { chatId } = body;

    if (!chatId) {
      return NextResponse.json({ error: "Missing chatId" }, { status: 400 });
    }

    const chat = await prisma.chat.findUnique({ where: { id: chatId } });

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

    await prisma.chat.delete({ where: { id: chatId } });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("Chat delete error:", err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
