import { NextResponse } from "next/server";
import { verifyExtensionToken } from "@/app/lib/verifyExtToken";
import { handleOptions, withExtensionCors } from "@/app/lib/extensionCors";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";
export const OPTIONS = handleOptions;

export const GET = withExtensionCors(async (req: Request) => {
  try {
    const email = await verifyExtensionToken(req);
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();

    const chats = await prisma.chat.findMany({
      where: { userEmail: email },
      orderBy: { updatedAt: "desc" },
    });

    if (!q) {
      return NextResponse.json(
        chats.map((c) => ({ ...c, _id: c.id })),
        { status: 200 }
      );
    }

    const filtered = chats.filter((chat) => {
      const title = (chat.title || "").toLowerCase();
      const messages = Array.isArray(chat.messages)
        ? (chat.messages as Array<{ text?: string }>)
        : [];
      const inTitle = title.includes(q);
      const inMessages = messages.some((m) =>
        String(m?.text || "").toLowerCase().includes(q)
      );
      return inTitle || inMessages;
    });

    return NextResponse.json(
      filtered.map((c) => ({ ...c, _id: c.id })),
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Chat search error:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
});
