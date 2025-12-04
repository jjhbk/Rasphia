// app/api/chats/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import { ChatSession, Message } from "@/app/types";
import { authGuard } from "@/app/lib/auth-guard";

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

    const client = await clientPromise;
    const db = client.db("rasphia");
    const res = await db.collection("chats").insertOne(newChat);

    return NextResponse.json(
      { ...newChat, _id: res.insertedId },
      { status: 201 }
    );
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
