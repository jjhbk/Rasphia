// app/api/chats/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ChatSession, Message } from "@/app/types";
import { authGuard } from "@/app/lib/auth-guard";
import { prisma } from "@/app/lib/prisma";

// top of route:

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionEmail, errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;
    const { initialMessage } = body;
    if (!sessionEmail)
      return NextResponse.json({ error: "Missing email" }, { status: 400 });

    const now = new Date().toISOString();
    const firstMessage: Message = initialMessage ?? {
      author: "ai",
      text: "Hello — tell me what you're looking for and I'll find the best picks.",
      createdAt: now,
    };

    const newChat: Omit<ChatSession, "_id"> = {
      userEmail: sessionEmail,
      title: new Date().toString(),
      createdAt: now,
      updatedAt: now,
      messages: [firstMessage],
    };
    const jsonMessages = newChat.messages as unknown as Prisma.InputJsonValue;

    const res = await prisma.chat.create({
      data: {
        userEmail: newChat.userEmail,
        title: newChat.title,
        messages: jsonMessages,
        createdAt: new Date(newChat.createdAt),
        updatedAt: new Date(newChat.updatedAt),
      },
    });

    return NextResponse.json(
      { ...newChat, _id: res.id },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error(err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
