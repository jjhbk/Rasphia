import { NextResponse } from "next/server";
import OpenAI from "openai";
import { verifyExtensionToken } from "@/app/lib/verifyExtToken";
import { loadPersona } from "@/app/lib/loadPersona";
import clientPromise from "@/app/lib/mongodb";
import { ObjectId } from "mongodb";
import { handleOptions, withExtensionCors } from "@/app/lib/extensionCors";

export const runtime = "nodejs";
export const OPTIONS = handleOptions;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const POST = withExtensionCors(async (req: Request) => {
  try {
    // 1️⃣ EXTENSION AUTH
    const email = await verifyExtensionToken(req);
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2️⃣ Parse request
    const { query, chatId } = await req.json();
    if (!query) {
      return NextResponse.json(
        { error: "Missing user query" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("rasphia");

    // 3️⃣ Load persona
    const persona = await loadPersona(email);

    // 4️⃣ Load or create chat
    let chat: any = null;

    if (chatId && ObjectId.isValid(chatId)) {
      chat = await db
        .collection("chats")
        .findOne({ _id: new ObjectId(chatId) });

      if (chat && chat.userEmail !== email) {
        return NextResponse.json(
          { error: "Forbidden: You do not own this chat" },
          { status: 403 }
        );
      }
    }

    if (!chat) {
      const now = new Date().toISOString();

      const res = await db.collection("chats").insertOne({
        userEmail: email, // ✅ FIXED (critical)
        title: new Date().toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
        createdAt: now,
        updatedAt: now,
        messages: [],
        context: {}, // 👈 context lives here
      });

      chat = {
        _id: res.insertedId,
        messages: [],
        context: {},
      };
    }

    // 5️⃣ Load chat-scoped product context (if any)
    const productsContext = chat?.context?.products;

    // 6️⃣ Build OpenAI messages
    const formattedMessages = [
      {
        role: "system",
        content: `
You are Rasphia — a hyper-personal AI stylist, dermatologist assistant,
haircare expert, home stylist, gifting consultant, and fashion advisor.

User Persona:
${JSON.stringify(persona, null, 2)}

${
  productsContext
    ? `
The user is discussing the following products in this chat.
This product data is ATTACHED TO THE CHAT and is the single source of truth.

${JSON.stringify(productsContext, null, 2)}

Rules:
- Use ONLY this product data
- Do NOT hallucinate missing attributes
- Do NOT suggest different products unless explicitly asked
`
    : ""
}

Always provide:
- personalised suggestions
- safe ingredient guidance
- suitability per skin/hair type
- budget-friendly options
- lifestyle-aware solutions

Avoid hallucinating ingredients or claims.
`,
      },

      ...(chat.messages || []).map((m: any) => ({
        role: m.author === "user" ? "user" : "assistant",
        content: m.text,
      })),

      { role: "user", content: query },
    ];

    // 7️⃣ OpenAI call
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: formattedMessages,
      max_tokens: 500,
      temperature: 0.7,
    });

    const reply =
      completion.choices[0].message?.content ??
      "I’m not sure, could you rephrase?";

    const now = new Date().toISOString();

    // 8️⃣ Persist messages
    await db.collection("chats").updateOne(
      { _id: new ObjectId(chat._id) },
      {
        $push: {
          messages: {
            $each: [
              { author: "user", text: query, createdAt: now },
              { author: "assistant", text: reply, createdAt: now },
            ],
          } as any,
        },
        $set: { updatedAt: now },
      }
    );

    // 9️⃣ Response
    return NextResponse.json({
      chatId: chat._id,
      reply,
    });
  } catch (err) {
    console.error("❌ /chats/send ERROR:", err);
    return NextResponse.json({ error: "Chat route failed" }, { status: 500 });
  }
});
