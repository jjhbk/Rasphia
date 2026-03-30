// app/api/chats/get/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ChatSession } from "@/app/types";
import { authGuard } from "@/app/lib/auth-guard";
import { prisma } from "@/app/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // 1️⃣ Run authGuard (session + email gating)
    const { sessionEmail, errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;

    // 2️⃣ Validate and extract chat ID
    const id = String(req.nextUrl.searchParams.get("id") ?? "");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const chat = await prisma.chat.findUnique({ where: { id } });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // 5️⃣ Ownership validation — CRITICAL PROTECTION
    if (chat.userEmail !== sessionEmail) {
      return NextResponse.json(
        { error: "Forbidden: You do not own this chat" },
        { status: 403 }
      );
    }

    // 6️⃣ Success — return chat
    return NextResponse.json(
      { ...chat, _id: chat.id } as ChatSession,
      { status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("Chat fetch error:", err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
