// app/api/chats/list/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ChatSession, Message } from "@/app/types";
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

function extractMessages(value: unknown): Message[] {
  if (!Array.isArray(value)) return [];
  const out: Message[] = [];
  for (const item of value as unknown[]) {
    if (isMessage(item)) out.push(item);
  }
  return out;
}

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

    const response: ChatSession[] = chats.map((c) => ({
      _id: c.id,
      userEmail: c.userEmail,
      title: c.title || undefined,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      messages: extractMessages(c.messages),
    }));

    return NextResponse.json(response, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("Chat list error:", err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
