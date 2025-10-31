import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import clientPromise from "@/app/lib/mongodb";
import { embedQuery } from "@/app/lib/queryEmbeddings";

export const dynamic = "force-dynamic";

/**
 * Rasphia AI Curator — RAG + Agentic Reasoning + Streaming
 */
export async function POST(req: NextRequest) {
  try {
    const { chatHistory } = await req.json();

    if (!chatHistory || !Array.isArray(chatHistory)) {
      return NextResponse.json(
        { error: "Missing or invalid chatHistory" },
        { status: 400 }
      );
    }

    const userMsg =
      [...chatHistory].reverse().find((m: any) => m.author === "user")?.text ??
      "";

    if (!userMsg.trim()) {
      return NextResponse.json(
        { error: "No user message found" },
        { status: 400 }
      );
    }

    // 🧠 Ensure Gemini API key exists
    const apiKey =
      process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
      console.warn("⚠️ Missing Gemini API key — Rasphia in offline mode");
      return NextResponse.json({
        author: "ai",
        text: "👋 Rasphia is currently offline. Please add your Gemini API key to `.env.local`.",
      });
    }

    // 🔹 Initialize Gemini model
    const googleAI = createGoogleGenerativeAI({ apiKey });
    const model = googleAI("gemini-2.5-flash"); // ✅ use pro for tool support

    /**
     * 🧰 Define the RAG Tool (with Zod Schema)
     */
    const vectorSearch = {
      description: "Search the Rasphia product catalog by semantic meaning.",
      inputSchema: z.object({
        query: z
          .string()
          .describe("A short description of what the user is looking for."),
      }),
      execute: async ({ query }: { query: string }) => {
        console.log("🧭 Rasphia performing vector search for:", query);

        try {
          const embedding = await embedQuery(query);
          const client = await clientPromise;
          const db = client.db("rasphia");

          const results = await db
            .collection("products")
            .aggregate([
              {
                $vectorSearch: {
                  index: "products_index",
                  path: "embedding",
                  queryVector: embedding,
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

          console.log(`✅ Found ${results.length} products`);
          return results;
        } catch (err) {
          console.error("❌ VectorSearch Error:", err);
          throw new Error("Vector search failed.");
        }
      },
    };

    /**
     * 🎨 Rasphia's persona & behavior
     */
    const system = `
You are Rasphia — a warm, elegant AI shopping curator.
You use empathy, sensory storytelling, and taste-driven reasoning to help users find the perfect gifts or perfumes.
You have access to a "vectorSearch" tool that retrieves real products from Rasphia's catalog.
Use it often when inspiration or product ideas are needed.
Respond in natural, elegant markdown — never JSON.
Always end your response with a graceful, open-ended question.
`;

    /**
     * 🚀 Stream the AI’s response (with Tool Integration)
     */
    const result = await streamText({
      model,
      system,
      messages: [{ role: "user", content: userMsg }],
      tools: { vectorSearch }, // ✅ register tool correctly
      toolChoice: "auto", // ✅ let Gemini decide when to call
      temperature: 0.7,
      maxOutputTokens: 512,
      onError: (err) => console.error("⚠️ Stream error:", err),
    });

    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error("❌ /api/curate route failed:", error);
    return NextResponse.json(
      {
        error:
          error?.message ||
          "Something went wrong while generating Rasphia's response.",
      },
      { status: 500 }
    );
  }
}
