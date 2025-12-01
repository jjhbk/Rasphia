import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import clientPromise from "@/app/lib/mongodb";
import { embedQuery } from "@/app/lib/queryEmbeddings";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

export interface Message {
  author: "user" | "ai";
  text: string;
  products?: Product[];
  comparisonTable?: {
    headers: string[];
    rows: string[][];
  };
}

export interface Product {
  _id?: string;
  name: string;
  description: string;
  brand?: string;
  category?: string;
  price?: number;
  imageUrl?: string;
  [key: string]: any;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chatHistory, chatId, userEmail } = body;

    if (!chatHistory || !Array.isArray(chatHistory)) {
      return NextResponse.json(
        { error: "Invalid or missing chat history." },
        { status: 400 }
      );
    }

    if (!userEmail) {
      return NextResponse.json(
        { error: "Missing user email for chat persistence." },
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

    // 🧠 Initialize Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey)
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY." },
        { status: 500 }
      );

    const ai = new GoogleGenAI({ apiKey });

    // 🔍 Vector search for relevant products
    const queryEmbedding = await embedQuery(userMsg);
    const client = await clientPromise;
    const db = client.db("rasphia");

    const productsCollection = db.collection("products");
    const chatsCollection = db.collection("chats");

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
        text: "I couldn't find anything matching that yet — but tell me a bit more so I can refine your picks?",
      });
    }
    console.log("Vector search done", results);
    // 🧾 Provide catalog context to Gemini
    const productContext = results
      .map(
        (p, i) =>
          `${i + 1}. ${p.name} — ${p.description} (Category: ${
            p.category ?? "General"
          }, ₹${p.price ?? "N/A"})`
      )
      .join("\n");

    // ⭐ FINAL UPDATED SYSTEM PROMPT — GENERIC SHOPPING CONCIERGE
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
2. If unclear, ask clarifying questions.
3. Only after the user’s intent is clear, gently transition into recommendations.

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
- "comparisonTable" must always be present; empty if not used.

`;

    // 🧩 JSON Schema
    const schema = {
      type: Type.OBJECT,
      properties: {
        response: {
          type: Type.STRING,
          description:
            "Warm, helpful message (2–5 sentences) that ends with a question.",
        },
        products: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description:
            "Up to 3 product names EXACTLY matching the catalog list.",
        },
        comparisonTable: {
          type: Type.OBJECT,
          properties: {
            headers: { type: Type.ARRAY, items: { type: Type.STRING } },
            rows: {
              type: Type.ARRAY,
              items: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
          },
        },
      },
      required: ["response", "products"],
    };

    // 🧠 Build conversation context
    const conversationHistory = chatHistory
      .map((m) => `${m.author === "user" ? "User" : "Rasphia"}: ${m.text}`)
      .join("\n");

    const prompt = `
${systemInstruction}

Catalog matches:
${productContext}

Conversation so far:
${conversationHistory}

Respond strictly in JSON using the schema.
`;

    // ✨ Call Gemini
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    // 🧩 Parse Gemini JSON output
    let jsonResponse;
    try {
      jsonResponse = JSON.parse(response.text as string);
    } catch (err) {
      console.error("Gemini parse error:", response.text);
      return NextResponse.json(
        {
          author: "ai",
          text: "I’m here — could you rephrase that so I can help better?",
        },
        { status: 200 }
      );
    }

    // 🔎 Map product names → actual product objects
    const recommendedNames: string[] = jsonResponse.products || [];
    const recommendedProducts: Product[] = recommendedNames
      .map((name) => results.find((p) => p.name === name))
      .filter((p): p is Product => p !== undefined);

    const aiMessage: Message = {
      author: "ai",
      text: jsonResponse.response,
      products: recommendedProducts.length ? recommendedProducts : undefined,
      comparisonTable: jsonResponse.comparisonTable,
    };

    // 🗃️ CHAT SESSION HANDLING (ChatGPT-style persistence)
    let chatDoc;

    if (!chatId) {
      // Create new chat
      const newChat = {
        userEmail,
        createdAt: new Date(),
        updatedAt: new Date(),
        messages: [...chatHistory, aiMessage],
      };
      const result = await chatsCollection.insertOne(newChat);
      chatDoc = { ...newChat, _id: result.insertedId };
    } else {
      // Append to existing chat
      await chatsCollection.updateOne(
        { _id: new ObjectId(chatId) },
        {
          $push: { messages: aiMessage } as any,
          $set: { updatedAt: new Date() },
        }
      );

      chatDoc = await chatsCollection.findOne({ _id: new ObjectId(chatId) });
    }
    console.log("Final message", JSON.stringify(aiMessage));
    // Return AI message + chatId (important for frontend)
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
