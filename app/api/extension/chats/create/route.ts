import { NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import { ChatSession, Message } from "@/app/types";
import { verifyExtensionToken } from "@/app/lib/verifyExtToken";
import { handleOptions, withExtensionCors } from "@/app/lib/extensionCors";

export const runtime = "nodejs";
export const OPTIONS = handleOptions;

export const POST = withExtensionCors(async (req: Request) => {
  try {
    // 1️⃣ EXTENSION-ONLY AUTH
    const email = await verifyExtensionToken(req);
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2️⃣ Parse body
    const { initialMessage } = await req.json();

    const now = new Date();
    function formatChatTitle(date: Date) {
      return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    }

    // 3️⃣ Ensure first message exists
    const firstMessage: Message = initialMessage ?? {
      author: "ai",
      text: `👋 Hi, I’m Rasphia. I understand your persona and the products you analyze.

💬 Chat to compare products, get best picks, and personalized recommendations.

🛍️ Analyze a product page anytime to refresh the context.

      `,
      createdAt: now,
    };

    // 4️⃣ New chat schema (extension version)
    const newChat: Omit<ChatSession, "_id"> = {
      userEmail: email,
      title: formatChatTitle(now),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      messages: [firstMessage],
    };

    // 5️⃣ Insert into DB
    const client = await clientPromise;
    const db = client.db("rasphia");
    const res = await db.collection("chats").insertOne(newChat);

    return NextResponse.json(
      { ...newChat, _id: res.insertedId },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("❌ Chat Create Error:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
});
