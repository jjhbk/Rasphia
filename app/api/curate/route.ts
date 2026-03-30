// ✅ FULL, UNTRUNCATED, SECURITY-HARDENED VERSION (ALL FUNCTIONALITY PRESERVED)

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { embedQuery } from "@/app/lib/queryEmbeddings";
import { Product } from "@/app/types";
import { authGuard } from "@/app/lib/auth-guard";
import { searchProductEmbeddings } from "@/app/lib/product-vector-store";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

// -------------------------------
// TYPES
// -------------------------------
export interface Message {
  author: "user" | "ai";
  text: string;
  products?: Product[];
  comparisonTable?: {
    headers: string[];
    rows: string[][];
  };
}

export async function POST(req: NextRequest) {
  try {
    // 1️⃣ AUTH + SAFE BODY PARSE
    const { sessionEmail, body, errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;

    const { chatHistory, chatId } = body;

    // -------------------------------
    // VALIDATION: chatHistory format
    // -------------------------------
    if (!chatHistory || !Array.isArray(chatHistory)) {
      return NextResponse.json(
        { error: "Invalid or missing chat history." },
        { status: 400 }
      );
    }

    // Extract the last user message
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
    // -------------------------------
    // OWNERSHIP CHECK (if chatId provided)
    // -------------------------------
    if (chatId) {
      const existingChat = await prisma.chat.findUnique({
        where: { id: chatId },
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
    // GEMINI INITIALIZATION
    // -------------------------------
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY." },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // -------------------------------
    // VECTOR SEARCH FOR PRODUCTS
    // -------------------------------
    const queryEmbedding = await embedQuery(userMsg);

    const results = await searchProductEmbeddings(queryEmbedding, 8);
    console.log("the results are :", results);
    if (!results.length) {
      return NextResponse.json({
        author: "ai",
        text: "I couldn't find anything matching that yet — want to tell me a bit more so I can refine your picks?",
      });
    }

    console.log("Vector search done", results);

    // -------------------------------
    // BUILD PRODUCT CONTEXT FOR AI
    // -------------------------------
    const productContext = results
      .map(
        (p, i) =>
          `${i + 1}. ${p.name} — ${p.description} (Category: ${
            p.category ?? "General"
          }, ₹${p.price ?? "N/A"})`
      )
      .join("\n");

    // -------------------------------
    // SYSTEM PROMPT (FULL COPY — NO OMISSION)
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
`;

    // -------------------------------
    // JSON SCHEMA
    // -------------------------------
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

    // -------------------------------
    // FULL CONVERSATION CONTEXT
    // -------------------------------
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

    // -------------------------------
    // GEMINI CALL
    // -------------------------------
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    // -------------------------------
    // SAFE JSON PARSE
    // -------------------------------
    let jsonResponse;
    try {
      jsonResponse = JSON.parse(response.text as string);
    } catch {
      console.error("Gemini parse error:", response.text);
      return NextResponse.json(
        {
          author: "ai",
          text: "I’m here — could you rephrase that so I can help better?",
        },
        { status: 200 }
      );
    }

    // -------------------------------
    // MAP PRODUCT NAMES → PRODUCT OBJECTS
    // -------------------------------
    const recommendedNames: string[] = jsonResponse.products || [];

    const recommendedProducts: Product[] = recommendedNames
      .map((name) => results.find((p) => p.name === name))
      .filter((p): p is Product => !!p);

    // -------------------------------
    // AI MESSAGE FORMAT
    // -------------------------------
    const aiMessage: Message = {
      author: "ai",
      text: jsonResponse.response,
      products: recommendedProducts.length ? recommendedProducts : undefined,
      comparisonTable: jsonResponse.comparisonTable,
    };

    // -------------------------------
    // CHAT PERSISTENCE (CREATE OR UPDATE)
    // -------------------------------
    let chatDoc;

    if (!chatId) {
      // Create new chat
      const newChat = {
        userEmail: sessionEmail, // secure
        createdAt: new Date(),
        updatedAt: new Date(),
        messages: [...chatHistory, aiMessage],
      };
      const result = await prisma.chat.create({ data: newChat });
      chatDoc = { ...newChat, _id: result.id };
    } else {
      // Update existing chat
      const existing = await prisma.chat.findUnique({ where: { id: chatId } });
      const messages = Array.isArray(existing?.messages)
        ? (existing?.messages as Array<Record<string, unknown>>)
        : [];
      chatDoc = await prisma.chat.update({
        where: { id: chatId },
        data: {
          messages: [...messages, aiMessage as unknown as Record<string, unknown>],
          updatedAt: new Date(),
        },
      });
    }

    console.log("Final message", JSON.stringify(aiMessage));

    // -------------------------------
    // RESPONSE
    // -------------------------------
    return NextResponse.json(
      {
        ...aiMessage,
        chatId: chatDoc?._id,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "AI response failed.";
    console.error("❌ Curate route error:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
