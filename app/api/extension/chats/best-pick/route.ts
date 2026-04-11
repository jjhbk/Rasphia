import { NextResponse } from "next/server";
import OpenAI from "openai";
import { verifyExtensionToken } from "@/app/lib/verifyExtToken";
import { loadPersona } from "@/app/lib/loadPersona";
import { handleOptions, withExtensionCors } from "@/app/lib/extensionCors";

export const runtime = "nodejs";
export const OPTIONS = handleOptions;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const BEST_PICK_SCHEMA = {
  name: "best_pick",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["bestProduct", "verdict", "confidence", "oneLineReason"],
    properties: {
      bestProduct: {
        type: "object",
        required: ["productId", "title", "image", "price", "productUrl", "domain"],
        properties: {
          productId: { type: "string" },
          title: { type: "string" },
          image: { type: ["string", "null"] },
          price: { type: ["number", "null"] },
          productUrl: { type: "string" },
          domain: { type: "string" },
        },
      },
      verdict: { type: "string", enum: ["buy", "wait", "skip"] },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      oneLineReason: { type: "string" },
    },
  },
};

export const POST = withExtensionCors(async (req: Request) => {
  try {
    const email = await verifyExtensionToken(req);
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { products } = await req.json();
    if (!products || !products.length) {
      return NextResponse.json({ error: "No products provided" }, { status: 400 });
    }

    const persona = await loadPersona(email);

    const prompt = `
You are Rasphia — a decisive personal shopping expert.

User persona:
${JSON.stringify(persona, null, 2)}

Products:
${JSON.stringify(products, null, 2)}

TASK:
- Choose EXACTLY ONE best product for this user.
- If none are suitable, return verdict = "skip".
- Do NOT hedge.
- Do NOT recommend multiple options.
- Be decisive and opinionated.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.3,
      response_format: {
        type: "json_schema",
        json_schema: BEST_PICK_SCHEMA,
      },
      messages: [
        {
          role: "system",
          content: "You must choose one product or explicitly skip. No hedging.",
        },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices[0].message?.content;
    if (!raw) throw new Error("Empty model response");

    const result = JSON.parse(raw);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("BEST PICK ERROR:", err);
    return NextResponse.json({ error: "Best pick failed" }, { status: 500 });
  }
});
