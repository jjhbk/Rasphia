// app/api/chats/list/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ChatSession } from "@/app/types";
import { authGuard } from "@/app/lib/auth-guard";
import { prisma } from "@/app/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // 1️⃣ AuthGuard: session validation + secure identity extraction
    const { sessionEmail, errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;

    // 2️⃣ ALWAYS trust session identity — NEVER client query params
    const email = sessionEmail;

    const chats = await prisma.chat.findMany({
      where: { userEmail: email },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(
      chats.map((c) => ({ ...c, _id: c.id })) as ChatSession[],
      { status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("Chat list error:", err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
