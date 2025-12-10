// app/api/chats/summarize/route.ts

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { verifyExtensionToken } from "@/app/lib/verifyExtToken";
import { loadPersona } from "@/app/lib/loadPersona";
import clientPromise from "@/app/lib/mongodb";
import { ObjectId } from "mongodb";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const email = verifyExtensionToken(req.headers);
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { product, chatId } = await req.json();
    if (!product) {
      return NextResponse.json({ error: "Missing product" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("rasphia");

    const persona = await loadPersona(email);

    const prompt = `
Analyze this product for this specific user.

User Persona:
${JSON.stringify(persona, null, 2)}

Product Data:
${JSON.stringify(product, null, 2)}

Return structured JSON only.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
    });

    const analysis = completion.choices[0].message?.content?.trim() ?? "{}";

    let chat = null;

    if (chatId) {
      chat = await db
        .collection("chats")
        .findOne({ _id: new ObjectId(chatId) });

      // ❗ FIXED: correct field
      if (chat && chat.email !== email) {
        return NextResponse.json(
          { error: "Forbidden: You do not own this chat" },
          { status: 403 }
        );
      }
    }

    if (!chat) {
      const now = new Date().toISOString();
      const insert = await db.collection("chats").insertOne({
        email, // ❗ FIXED
        title: "Product Analysis",
        createdAt: now,
        updatedAt: now,
        messages: [],
      });
      chat = { _id: insert.insertedId };
    }

    const now = new Date().toISOString();

    await db.collection("chats").updateOne(
      { _id: new ObjectId(chat._id) },
      {
        $push: {
          messages: {
            author: "assistant",
            text: analysis,
            createdAt: now,
            meta: { type: "product-analysis", product },
          } as any,
        },
        $set: { updatedAt: now },
      }
    );

    return NextResponse.json(
      { chatId: chat._id.toString(), analysis },
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      }
    );
  } catch (e) {
    console.error("❌ SUMMARIZER ERROR:", e);
    return NextResponse.json({ error: "Summarizer failed" }, { status: 500 });
  }
}
