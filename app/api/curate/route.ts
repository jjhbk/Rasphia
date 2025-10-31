import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import clientPromise from "@/app/lib/mongodb";
import { embedQuery } from "@/app/lib/queryEmbeddings";

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
    const { chatHistory } = body;

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

    // 🧠 Initialize Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey)
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY." },
        { status: 500 }
      );

    const ai = new GoogleGenAI({ apiKey });

    // 🧭 Step 1: Vector search relevant products
    const queryEmbedding = await embedQuery(userMsg);
    const client = await clientPromise;
    const db = client.db("rasphia");

    const results = await db
      .collection("products")
      .aggregate([
        {
          $vectorSearch: {
            index: "products_index", // must match Atlas index name
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

    console.log("🧠 Vector search found", results.length, "matches");

    if (!results.length) {
      return NextResponse.json({
        author: "ai",
        text: "Hmm, I couldn’t find any products for that right now. Could you tell me a bit more about what you’re looking for?",
      });
    }

    // 🧾 Step 2: Prepare catalog context for Gemini
    const productContext = results
      .map(
        (p, i) =>
          `${i + 1}. ${p.name} — ${p.description} (Category: ${
            p.category || "General"
          }, ₹${p.price || "N/A"})`
      )
      .join("\n");

    // 🪶 Step 3: System instructions
    const systemInstruction = `
You are **Rasphia**, an elegant AI shopping curator.
You combine taste ("Rasa") with thought ("Sophia") to help users find meaningful gifts and perfumes.

- Speak warmly, naturally, and with empathy.
- Always weave sensory and emotional storytelling into your suggestions.
- Suggest from the provided product list only.
- Respond strictly in JSON format using the schema.
`;

    // 🧩 Step 4: JSON schema for structured Gemini response
    const schema = {
      type: Type.OBJECT,
      properties: {
        response: {
          type: Type.STRING,
          description:
            "A warm, story-driven conversational reply ending with a question.",
        },
        products: {
          type: Type.ARRAY,
          description:
            "Array of up to 3 product names you’re recommending, taken exactly from the product list.",
          items: { type: Type.STRING },
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

    // 🧠 Step 5: Build final prompt
    const conversationHistory = chatHistory
      .map((m) => `${m.author === "user" ? "User" : "Rasphia"}: ${m.text}`)
      .join("\n");

    const prompt = `
${systemInstruction}

Here are relevant products found from the catalog:
${productContext}

Conversation so far:
${conversationHistory}

Respond strictly as valid JSON per schema.
`;

    // ✨ Step 6: Call Gemini model
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash", // or "gemini-2.5-flash" if available
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.7,
      },
    });

    // 🧩 Step 7: Parse Gemini response safely
    let jsonResponse;
    try {
      jsonResponse = JSON.parse(response.text as string);
    } catch (err) {
      console.error("❌ Failed to parse Gemini response:", response.text);
      return NextResponse.json(
        {
          author: "ai",
          text: "I couldn’t quite form a clear response. Could you describe what kind of vibe or person this gift is for?",
        },
        { status: 200 }
      );
    }

    const recommendedProductNames: string[] = jsonResponse.products || [];
    const recommendedProducts: Product[] = recommendedProductNames
      .map((name) => results.find((p) => p.name === name))
      .filter((p): p is Product => p !== undefined);

    const message: Message = {
      author: "ai",
      text: jsonResponse.response,
      products:
        recommendedProducts.length > 0 ? recommendedProducts : undefined,
      comparisonTable: jsonResponse.comparisonTable,
    };

    return NextResponse.json(message, { status: 200 });
  } catch (error: any) {
    console.error("❌ Curate route error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate AI response." },
      { status: 500 }
    );
  }
}
