// app/api/chats/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { authGuard } from "@/app/lib/auth-guard";
import { prisma } from "@/app/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // 1️⃣ Authenticate and authorize
    const { sessionEmail, errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;

    // 2️⃣ Extract query
    const q = String(req.nextUrl.searchParams.get("q") ?? "").trim();

    const chats = await prisma.chat.findMany({
      where: { userEmail: sessionEmail },
      orderBy: { updatedAt: "desc" },
    });

    if (!q) {
      return NextResponse.json(chats.map((c) => ({ ...c, _id: c.id })), {
        status: 200,
      });
    }

    const filtered = chats.filter((chat) => {
      const title = chat.title?.toLowerCase() || "";
      const messages = Array.isArray(chat.messages)
        ? (chat.messages as Array<{ text?: string }>)
        : [];
      const inTitle = title.includes(q.toLowerCase());
      const inMessages = messages.some((m) =>
        (m.text || "").toLowerCase().includes(q.toLowerCase())
      );
      return inTitle || inMessages;
    });

    return NextResponse.json(
      filtered.map((c) => ({ ...c, _id: c.id })),
      { status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("Chat search error:", err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
