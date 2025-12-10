import { NextResponse } from "next/server";
import OpenAI from "openai";
import { verifyExtensionToken } from "@/app/lib/verifyExtToken";
import { loadPersona } from "@/app/lib/loadPersona";
import clientPromise from "@/app/lib/mongodb";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const emailFromExt = verifyExtensionToken(req.headers);
    const { query, chatId } = await req.json();

    // Determine the requester email:
    // 1. Extension user (preferred)
    // 2. Website-side NextAuth user (fallback)
    let email = emailFromExt;

    if (!email) {
      // Allow website calls too
      const session = (await import("next-auth")).getServerSession;
      const s = await session();
      email = s?.user?.email as string;
    }

    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db("rasphia");

    // 1. load persona
    const persona = await loadPersona(email);

    // 2. load or create chat
    let chat = null;

    if (chatId) {
      chat = await db.collection("chats").findOne({ _id: chatId });
    }

    if (!chat) {
      const res = await db.collection("chats").insertOne({
        email,
        title: query.slice(0, 80),
        messages: [],
        createdAt: new Date(),
      });
      chat = { _id: res.insertedId, messages: [] };
    }

    // 3. Prepare messages for OpenAI
    const messages = [
      {
        role: "system",
        content: `
You are Rasphia — a hyper-personal AI stylist, dermatologist assistant, 
haircare expert, home stylist, gifting consultant, and fashion advisor.

User Persona:
${JSON.stringify(persona, null, 2)}

Always give:
- personalised advice,
- safe ingredient suggestions,
- suitability for skin type + hair type,
- budget-conscious alternatives,
- brand preferences,
- lifestyle-based adjustments.

DO NOT hallucinate ingredients or claims.`,
      },
      ...chat.messages.map((m: any) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text,
      })),
      { role: "user", content: query },
    ];

    // 4. Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    const reply =
      completion.choices[0].message?.content ??
      "I’m not sure, could you rephrase?";

    // 5. Save to DB
    await db.collection("chats").updateOne(
      { _id: chat._id },
      {
        $push: {
          messages: {
            sender: "user",
            text: query,
            timestamp: new Date(),
          } as any,
        },
      }
    );

    await db.collection("chats").updateOne(
      { _id: chat._id },
      {
        $push: {
          messages: {
            sender: "assistant",
            text: reply,
            timestamp: new Date(),
          },
        } as any,
      }
    );

    return NextResponse.json(
      {
        reply,
        chatId: chat._id,
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      }
    );
  } catch (err) {
    console.error("❌ CHAT ROUTE ERROR:", err);
    return NextResponse.json(
      { error: "Chat route failed" },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
        status: 500,
      }
    );
  }
}
