import { NextResponse } from "next/server";
import { verifyExtensionToken } from "@/app/lib/verifyExtToken";
import { withExtensionCors, handleOptions } from "@/app/lib/extensionCors";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";
export const OPTIONS = handleOptions;

export const GET = withExtensionCors(async (req: Request) => {
  try {
    const email = await verifyExtensionToken(req);
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const chats = await prisma.chat.findMany({
      where: { userEmail: email },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(
      chats.map((chat) => {
        const messages = Array.isArray(chat.messages) ? chat.messages : [];
        return {
          ...chat,
          _id: chat.id,
          messages: messages.slice(0, 1),
        };
      }),
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Chat list error:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
});
