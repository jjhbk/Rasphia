import { NextResponse } from "next/server";
import OpenAI from "openai";
import { verifyExtensionToken } from "@/app/lib/verifyExtToken";
import { loadPersona } from "@/app/lib/loadPersona";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const email = verifyExtensionToken(req.headers);
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { product } = await req.json();

    const persona = await loadPersona(email);

    const prompt = `
Analyze this product for the user's unique profile.

User Persona:
${JSON.stringify(persona, null, 2)}

Product Data:
${JSON.stringify(product, null, 2)}

Provide analysis in structured JSON:

{
  "summary": "...",
  "pros": [...],
  "cons": [...],
  "suitability": {
      "skin": "...",
      "hair": "...",
      "lifestyle": "..."
  },
  "risks": "...",
  "shadeRecommendation": "...",
  "ingredientAnalysis": "...",
  "alternatives": [
    { "name": "...", "why": "..." },
    { "name": "...", "why": "..." },
    { "name": "...", "why": "..." }
  ]
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const raw = completion.choices[0].message?.content || "{}";

    return NextResponse.json({ analysis: raw });
  } catch (e) {
    console.error("❌ SUMMARIZER ERROR:", e);
    return NextResponse.json({ error: "Summarizer failed" }, { status: 500 });
  }
}
