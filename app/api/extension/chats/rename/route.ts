import { NextResponse } from "next/server";
import { verifyExtensionToken } from "@/app/lib/verifyExtToken";
import { handleOptions, withExtensionCors } from "@/app/lib/extensionCors";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";
export const OPTIONS = handleOptions;

export const POST = withExtensionCors(async (req: Request) => {
  try {
    const email = await verifyExtensionToken(req);
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { chatId, title } = await req.json();

    if (!chatId) {
      return NextResponse.json({ error: "Missing chatId" }, { status: 400 });
    }

    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    if (chat.userEmail !== email) {
      return NextResponse.json(
        { error: "Forbidden: You do not own this chat" },
        { status: 403 }
      );
    }

    const now = new Date();

    if (typeof title === "string" && title.trim().length > 0) {
      const finalTitle = title.trim();
      await prisma.chat.update({
        where: { id: chatId },
        data: { title: finalTitle, updatedAt: now },
      });
      return NextResponse.json({ ok: true, title: finalTitle }, { status: 200 });
    }

    const messages = Array.isArray(chat.messages)
      ? (chat.messages as Array<{ author?: string; text?: string }>)
      : [];

    const candidate =
      messages
        .slice()
        .reverse()
        .find((m) => m.author === "user")?.text ??
      messages.find((m) => m.author === "user")?.text ??
      "Conversation";

    const generated = String(candidate || "").trim().slice(0, 60).replace(/\n/g, " ");
    const finalTitle = generated.length ? generated : "Conversation";

    await prisma.chat.update({
      where: { id: chatId },
      data: { title: finalTitle, updatedAt: now },
    });

    return NextResponse.json({ ok: true, title: finalTitle }, { status: 200 });
  } catch (err: any) {
    console.error("Chat rename error:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
});
