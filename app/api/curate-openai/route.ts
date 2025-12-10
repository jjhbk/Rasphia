// ✅ FULL, FIXED, PRODUCTION-SAFE CURATE ROUTE (OpenAI Chat Completions API)

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import { embedQuery } from "@/app/lib/queryEmbeddings";
import { ObjectId } from "mongodb";
import { Product } from "@/app/types";
import { authGuard } from "@/app/lib/auth-guard";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ----------------------------------------
export interface Message {
  author: "user" | "ai";
  text: string;
  products?: Product[];
  comparisonTable?: {
    headers: string[];
    rows: string[][];
  };
}

// ----------------------------------------
export async function POST(req: NextRequest) {
  try {
    // 1️⃣ AUTH + SAFE BODY PARSE
    const { sessionEmail, body, errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;

    const { chatHistory, chatId } = body;

    if (!chatHistory || !Array.isArray(chatHistory)) {
      return NextResponse.json(
        { error: "Invalid or missing chat history." },
        { status: 400 }
      );
    }

    const userMsg =
      [...chatHistory].reverse().find((m) => m.author === "user")?.text ?? "";

    if (!userMsg.trim()) {
      return NextResponse.json(
        { error: "User message is empty." },
        { status: 400 }
      );
    }

    // -------------------------------
    // DB CONNECTION
    // -------------------------------
    const client = await clientPromise;
    const db = client.db("rasphia");
    const productsCollection = db.collection("products");
    const chatsCollection = db.collection("chats");

    // -------------------------------
    // OWNERSHIP CHECK
    // -------------------------------
    if (chatId) {
      const existingChat = await chatsCollection.findOne({
        _id: new ObjectId(chatId),
      });

      if (!existingChat) {
        return NextResponse.json({ error: "Chat not found." }, { status: 404 });
      }

      if (existingChat.userEmail !== sessionEmail) {
        return NextResponse.json(
          { error: "Forbidden: This chat does not belong to you." },
          { status: 403 }
        );
      }
    }

    // -------------------------------
    // VECTOR SEARCH
    // -------------------------------
    const queryEmbedding = await embedQuery(userMsg);

    const results = await productsCollection
      .aggregate([
        {
          $vectorSearch: {
            index: "products_index",
            path: "embedding",
            queryVector: queryEmbedding,
            numCandidates: 100,
            limit: 8,
            similarity: "cosine",
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            brand: 1,
            category: 1,
            price: 1,
            description: 1,
            imageUrl: 1,
            score: { $meta: "vectorSearchScore" },
          },
        },
      ])
      .toArray();

    if (!results.length) {
      return NextResponse.json({
        author: "ai",
        text: "I couldn't find anything matching that yet — want to tell me a bit more so I can refine your picks?",
      });
    }

    // -------------------------------
    // PRODUCT CONTEXT
    // -------------------------------
    const productContext = results
      .map(
        (p, i) =>
          `${i + 1}. ${p.name}\nDescription: ${p.description}\nCategory: ${
            p.category ?? "General"
          }\nPrice: ₹${p.price ?? "N/A"}`
      )
      .join("\n\n");

    // -------------------------------
    // SYSTEM INSTRUCTION (YOUR ORIGINAL FULL TEXT GOES HERE)
    // -------------------------------
    const systemInstruction = `
You are Rasphia, an elegant, boutique-style AI shopping concierge who helps users discover products across all categories: skincare, haircare, perfumes, grooming, beauty, wellness, gifts, home décor, room aesthetics, stationery, jewelry, accessories, gadgets, and lifestyle items.

Tone & Personality:
- Warm, premium, friendly, and thoughtful — like a personal shopper at a boutique.
- Conversational first, recommendations second.
- Use light sensory detail such as “clean citrus lift” or “warm amber trail,” but avoid heavy poetry.
- Keep responses concise but refined.

Conversational Flow:
Rasphia should NOT rush into product suggestions.
Before recommending anything, Rasphia should:
1. Understand the user’s intent, need, mood, or concern.
2. If unclear, ask clarifying questions to under try to get as much information as possible with one question.
3. Only after the user’s intention is clear, gently transition into recommendations.

Example style: “If you’re looking for something to unwind with, I can suggest a few pieces. But first — are you in the mood for something calming, refreshing, or warm?”

Core Functional Rules:
1. Rasphia should suggest up to 3 products ONLY when the user's intention is clear.
2. If the user’s intention is unclear, Rasphia must ask a clarifying question and must NOT suggest products yet.
3. When suggesting, ALWAYS put exact product names in the "products" array — no hallucinations.
4. ALWAYS end each message with a friendly question.
5. ALWAYS match products to user intent, mood, vibe, concern, category, or budget.
6. If no perfect match exists, suggest the closest 1–3 items once intent is clear.
7. Ask clarifying questions whenever needed.
8. If the user requests a comparison, fill "comparisonTable" accordingly.

Reasoning Rules:
Follow this hierarchy:
1. Intent fit
2. Category relevance
3. Concern fit
4. Vibe fit
5. Budget
6. Cohesion among chosen items

Fallback Behavior:
For greetings (“hi”, “hello”, etc.):
- Greet warmly.
- Do NOT recommend products.
- Ask what they’d like to explore or what mood they’re in.

Output Format:
Rasphia must ALWAYS respond only in JSON:

{
  "message": "A warm, conversational message. If intent is clear: smooth lead-in to recommendations. If intent is unclear: ask a clarifying question. Always end with a friendly question.",
  "products": [],
  "comparisonTable": []
}

Notes:
- "products" is empty when Rasphia is still clarifying.
- When recommending, include up to 3 exact catalog product names.
- "comparisonTable" must always exist, even if empty.
`.trim();

    // -------------------------------
    // STRICT OPENAI JSON SCHEMA (FIXED)
    // -------------------------------
    const schema = {
      type: "object",
      additionalProperties: false,
      properties: {
        response: { type: "string" },
        products: {
          type: "array",
          items: { type: "string" },
          additionalProperties: false,
        },
        comparisonTable: {
          type: "object",
          additionalProperties: false,
          properties: {
            headers: {
              type: "array",
              items: { type: "string" },
              additionalProperties: false,
            },
            rows: {
              type: "array",
              items: {
                type: "array",
                items: { type: "string" },
                additionalProperties: false,
              },
              additionalProperties: false,
            },
          },
          required: ["headers", "rows"], // MUST be here
        },
      },
      required: ["response", "products", "comparisonTable"], // MUST include comparisonTable
    };

    // -------------------------------
    // USER PROMPT
    // -------------------------------
    const conversationHistory = chatHistory
      .map((m) => `${m.author === "user" ? "User" : "Rasphia"}: ${m.text}`)
      .join("\n");

    const userPrompt = `
Catalog matches:
${productContext}

Conversation so far:
${conversationHistory}
    `.trim();

    // -------------------------------
    // ⭐ OPENAI CALL — FULLY FIXED
    // -------------------------------
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.7,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "rasphia_schema",
          schema,
          strict: true,
        },
      },
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userPrompt },
      ],
    });

    // -------------------------------
    // PARSE JSON FROM MODEL
    // -------------------------------
    const raw = completion.choices[0].message.content;
    const jsonResponse = JSON.parse(raw as string);

    // -------------------------------
    // MAP PRODUCT NAMES → PRODUCT DOCS
    // -------------------------------
    const recommendedProducts: Product[] = (jsonResponse.products || [])
      .map((name: string) => results.find((p) => p.name === name))
      .filter((p: any): p is Product => !!p);

    // -------------------------------
    // FINAL MESSAGE
    // -------------------------------
    const aiMessage: Message = {
      author: "ai",
      text: jsonResponse.response,
      products: recommendedProducts.length ? recommendedProducts : undefined,
      comparisonTable: jsonResponse.comparisonTable,
    };

    // -------------------------------
    // SAVE CHAT
    // -------------------------------
    let chatDoc;

    if (!chatId) {
      const newChat = {
        userEmail: sessionEmail,
        createdAt: new Date(),
        updatedAt: new Date(),
        messages: [...chatHistory, aiMessage],
      };

      const result = await chatsCollection.insertOne(newChat);
      chatDoc = { ...newChat, _id: result.insertedId };
    } else {
      await chatsCollection.updateOne(
        { _id: new ObjectId(chatId) },
        {
          $push: { messages: aiMessage } as any,
          $set: { updatedAt: new Date() },
        }
      );

      chatDoc = await chatsCollection.findOne({ _id: new ObjectId(chatId) });
    }

    return NextResponse.json(
      {
        ...aiMessage,
        chatId: chatDoc?._id,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("❌ Curate route error:", error);
    return NextResponse.json(
      { error: error?.message || "AI response failed." },
      { status: 500 }
    );
  }
}
