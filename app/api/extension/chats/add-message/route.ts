import { NextResponse } from "next/server";
import OpenAI from "openai";
import { verifyExtensionToken } from "@/app/lib/verifyExtToken";
import { loadPersona } from "@/app/lib/loadPersona";
import clientPromise from "@/app/lib/mongodb";
import { ObjectId } from "mongodb";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    // 1️⃣ EXTENSION-ONLY AUTH
    const email = verifyExtensionToken(req.headers);
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
    let chat = null;

    if (chatId) {
      chat = await db
        .collection("chats")
        .findOne({ _id: new ObjectId(chatId) });

      // Ownership check
      if (chat && chat.email !== email) {
        return NextResponse.json(
          { error: "Forbidden: You do not own this chat" },
          { status: 403 }
        );
      }
    }

    // If chat not found → create new one
    if (!chat) {
      const now = new Date().toISOString();
      const res = await db.collection("chats").insertOne({
        email,
        title: query.slice(0, 80),
        createdAt: now,
        updatedAt: now,
        messages: [],
      });

      chat = { _id: res.insertedId, messages: [] };
    }

    // 5️⃣ Build OpenAI message context
    const formattedMessages = [
      {
        role: "system",
        content: `
You are Rasphia — a hyper-personal AI stylist, dermatologist assistant,
haircare expert, home stylist, gifting consultant, and fashion advisor.

User Persona:
${JSON.stringify(persona, null, 2)}

Always provide:
- personalised suggestions,
- safe ingredient guidance,
- suitability per skin/hair type,
- budget-friendly options,
- lifestyle-aware solutions.

Avoid hallucinating ingredients or claims.`,
      },
      ...chat.messages.map((m: any) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text,
      })),
      { role: "user", content: query },
    ];

    // 6️⃣ OpenAI API Call
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

    // 7️⃣ Save BOTH user + assistant messages in one update
    await db.collection("chats").updateOne(
      { _id: new ObjectId(chat._id) },
      {
        $push: {
          messages: {
            $each: [
              { sender: "user", text: query, createdAt: now },
              { sender: "assistant", text: reply, createdAt: now },
            ],
          } as any,
        },
        $set: { updatedAt: now },
      }
    );

    // 8️⃣ Return response
    return NextResponse.json(
      {
        chatId: chat._id,
        reply,
      },
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      }
    );
  } catch (err) {
    console.error("❌ /chats/send ERROR:", err);
    return NextResponse.json(
      { error: "Chat route failed" },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      }
    );
  }
}
