import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

export const dynamic = "force-dynamic"; // Ensures fresh responses (optional)

// Type definitions
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
  name: string;
  description: string;
  price?: string;
  image?: string;
  [key: string]: any;
}

const ai = new GoogleGenAI({
  apiKey: process.env.API_KEY as string,
});

const systemInstruction = `
You are Rasphia, an AI shopping curator whose name comes from 'Rasa' (taste) and 'Sophia' (thought). 
Your persona is that of a warm, tasteful, and empathetic personal shopper. You are a friendly expert, part stylist, part confidant. 
Your goal is not just to sell, but to guide users to discover truly meaningful gifts and perfumes by blending taste with thought.

**Your Core Directive: Lead a Human-like, Story-Driven Conversation.**

1. **Be Proactively Inquisitive:** Understand the person and emotion before recommending. 
   Never recommend immediately. Always ask clarifying questions.
2. **Weave a Narrative:** Be a storyteller. Explain *why* a product fits emotionally.
3. **Maintain Natural Flow:** End with an open-ended question, vary your language, sound natural.
4. **JSON Output Rules (Strict):**
   - Respond with JSON.
   - Fields: response (string), products (array of product names), comparisonTable (optional).
`;

const schema = {
  type: Type.OBJECT,
  properties: {
    response: {
      type: Type.STRING,
      description:
        "Your warm, conversational reply to the user, including your reasoning for the recommendations.",
    },
    products: {
      type: Type.ARRAY,
      description:
        "An array of product names you are recommending, taken EXACTLY from the provided product catalog. Can be empty, but should not exceed 3 items.",
      items: { type: Type.STRING },
    },
    comparisonTable: {
      type: Type.OBJECT,
      description:
        "An optional table for comparing products side-by-side. Use this when the user asks for a comparison.",
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
      required: ["headers", "rows"],
    },
  },
  required: ["response", "products"],
};

// Main API handler
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { chatHistory, products } = body as {
      chatHistory: Message[];
      products: Product[];
    };

    if (!chatHistory || !Array.isArray(chatHistory)) {
      return NextResponse.json(
        { error: "Invalid or missing chat history." },
        { status: 400 }
      );
    }

    if (!products || !Array.isArray(products)) {
      return NextResponse.json(
        { error: "Invalid or missing product catalog." },
        { status: 400 }
      );
    }

    if (!process.env.API_KEY) {
      return NextResponse.json(
        { error: "Missing Gemini API key." },
        { status: 500 }
      );
    }

    const productCatalogString = JSON.stringify(products);
    const conversationHistory = chatHistory
      .map((m) => `${m.author === "user" ? "User" : "Rasphia"}: ${m.text}`)
      .join("\n");

    const prompt = `${systemInstruction}
    
Here is the full product catalog:
${productCatalogString}

Here is the conversation so far:
${conversationHistory}

Respond strictly in JSON format following the schema.
`;

    // Call Gemini API
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.75,
      },
    });

    // Parse response
    const jsonResponse = JSON.parse(response.text as string);
    const recommendedProductNames: string[] = jsonResponse.products || [];

    const recommendedProducts: Product[] = recommendedProductNames
      .map((name) => products.find((p) => p.name === name))
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
    console.error("Error calling Gemini API:", error);
    return NextResponse.json(
      { error: "Failed to get a response from the AI curator." },
      { status: 500 }
    );
  }
}
