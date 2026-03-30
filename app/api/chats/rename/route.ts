// app/api/chats/rename/route.ts
import { NextRequest, NextResponse } from "next/server";
import { authGuard } from "@/app/lib/auth-guard";
import { prisma } from "@/app/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    // 1️⃣ Authenticate user & parse input safely
    const { sessionEmail, body, errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;

    const { chatId, title } = body;

    if (!chatId) {
      return NextResponse.json({ error: "Missing chatId" }, { status: 400 });
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

    const now = new Date().toISOString();

    // 3️⃣ If title is provided → simple update
    if (title && typeof title === "string" && title.trim().length > 0) {
      await prisma.chat.update({
        where: { id: chatId },
        data: { title: title.trim(), updatedAt: new Date(now) },
      });
      return NextResponse.json(
        { ok: true, title: title.trim() },
        { status: 200 }
      );
    }

    // 4️⃣ Auto-generate title if no title provided
    const messages = (chat.messages ?? []) as Array<{ author?: string; text?: string }>;
    const candidate =
      messages
        .slice()
        .reverse()
        .find((m) => m.author === "user")?.text ??
      messages.find((m) => m.author === "user")?.text ??
      "Conversation";

    const generated = candidate.trim().slice(0, 60).replace(/\n/g, " ");
    const finalTitle = generated.length ? generated : "Conversation";

    // 5️⃣ Save generated title
    await prisma.chat.update({
      where: { id: chatId },
      data: { title: finalTitle, updatedAt: new Date(now) },
    });

    return NextResponse.json({ ok: true, title: finalTitle }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("Chat rename error:", err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
