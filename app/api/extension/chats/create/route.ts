import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ChatSession, Message } from "@/app/types";
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

    const { initialMessage } = await req.json();

    const now = new Date();
    const firstMessage: Message = initialMessage ?? {
      author: "ai",
      text: "Hi, I am Rasphia. Analyze products and I will help with best picks.",
      createdAt: now.toISOString(),
    };

    const newChat: Omit<ChatSession, "_id"> = {
      userEmail: email,
      title: now.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      messages: [firstMessage],
    };

    const res = await prisma.chat.create({
      data: {
        userEmail: newChat.userEmail,
        title: newChat.title,
        messages: newChat.messages as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ ...newChat, _id: res.id }, { status: 201 });
  } catch (err: any) {
    console.error("Chat Create Error:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
});
