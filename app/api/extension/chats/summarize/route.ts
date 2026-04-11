import { NextResponse } from "next/server";
import OpenAI from "openai";
import { verifyExtensionToken } from "@/app/lib/verifyExtToken";
import { loadPersona } from "@/app/lib/loadPersona";
import { handleOptions, withExtensionCors } from "@/app/lib/extensionCors";
import { randomUUID } from "crypto";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";
export const OPTIONS = handleOptions;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const PRODUCT_INSIGHT_SCHEMA = {
  name: "product_insight",
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "title",
      "brand",
      "price",
      "discount",
      "rating",
      "numberOfReviews",
      "productUrl",
      "image",
      "domain",
      "confidence",
      "fitForUser",
      "overallRecommendation",
    ],
    properties: {
      title: { type: "string" },
      brand: { type: ["string", "null"] },
      price: { type: ["number", "null"] },
      discount: { type: ["string", "null"] },
      rating: {
        type: ["object", "null"],
        required: ["score", "count"],
        properties: {
          score: { type: "number" },
          count: { type: "number" },
        },
      },
      numberOfReviews: { type: ["number", "null"] },
      productUrl: { type: ["string", "null"] },
      image: { type: ["string", "null"] },
      domain: { type: ["string", "null"] },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      fitForUser: { type: ["string", "null"] },
      overallRecommendation: {
        type: "object",
        required: ["suitability", "notes"],
        properties: {
          suitability: {
            type: "string",
            enum: ["high", "medium", "low"],
          },
          notes: { type: "string" },
        },
      },
    },
  },
};

export const POST = withExtensionCors(async (req: Request) => {
  try {
    const email = await verifyExtensionToken(req);
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { product, chatId } = await req.json();
    if (!product) {
      return NextResponse.json({ error: "Missing product" }, { status: 400 });
    }

    const persona = await loadPersona(email);

    const prompt = `
Analyze the following product strictly for this user.

User Persona:
${JSON.stringify(persona, null, 2)}

Product Data:
${JSON.stringify(product, null, 2)}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.4,
      response_format: {
        type: "json_schema",
        json_schema: PRODUCT_INSIGHT_SCHEMA,
      },
      messages: [
        {
          role: "system",
          content:
            "You are a strict JSON generator. Output must match the schema exactly.",
        },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices[0].message?.content;
    if (!raw) throw new Error("Empty model response");

    const analysis = JSON.parse(raw);
    const insightId = randomUUID();

    await prisma.productInsight.create({
      data: {
        email,
        payload: {
          insightId,
          email,
          chatId: chatId || null,
          product: {
            title: product?.title ?? null,
            brand: product?.brand ?? null,
            price: product?.price ?? null,
            image: product?.image ?? null,
            productUrl: product?.productUrl ?? null,
            domain: product?.domain ?? null,
          },
          analysis,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({ chatId, insightId, analysis }, { status: 200 });
  } catch (err) {
    console.error("SUMMARIZER ERROR:", err);
    return NextResponse.json({ error: "Summarizer failed" }, { status: 500 });
  }
});
