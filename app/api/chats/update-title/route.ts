import { NextRequest, NextResponse } from "next/server";
import { authGuard } from "@/app/lib/auth-guard";
import { prisma } from "@/app/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    // 1️⃣ Authenticate + parse body
    const { sessionEmail, body, errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;

    const { chatId, title } = body;

    if (!chatId || typeof title !== "string") {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
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

    // 4️⃣ Update title
    const now = new Date().toISOString();
    const safeTitle = title.trim() || "Untitled";

    await prisma.chat.update({
      where: { id: chatId },
      data: {
        title: safeTitle,
        updatedAt: new Date(now),
      },
    });

    return NextResponse.json(
      { success: true, title: safeTitle },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("Failed to update chat title:", err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
