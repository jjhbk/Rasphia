import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/app/lib/prisma";

const PUBLIC_STOREFRONT_STATUSES = [
  "approved",
  "APPROVED",
  "Approved",
  "active",
  "ACTIVE",
  "Active",
] as const;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const params = await context.params;
    const slug = String(params.slug || "").trim().toLowerCase();
    if (!slug) {
      return NextResponse.json({ error: "Invalid storefront slug" }, { status: 400 });
    }

    const body = await req.json();
    const message = String(body?.message || "").trim();
    const history: ChatMessage[] = Array.isArray(body?.history)
      ? body.history
          .map((m: any) => ({
            role: m?.role === "assistant" ? "assistant" : "user",
            text: String(m?.text || "").trim(),
          }))
          .filter((m: ChatMessage) => m.text.length > 0)
          .slice(-6)
      : [];

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const merchant = await prisma.merchant.findFirst({
      where: { slug, status: { in: [...PUBLIC_STOREFRONT_STATUSES] } },
      select: {
        id: true,
        name: true,
        storefrontDescription: true,
        chatbotWelcomeMessage: true,
      },
    });

    if (!merchant) {
      return NextResponse.json({ error: "Storefront not found" }, { status: 404 });
    }

    const products = await prisma.product.findMany({
      where: { merchantId: merchant.id },
      orderBy: { updatedAt: "desc" },
      take: 80,
      select: {
        id: true,
        name: true,
        brand: true,
        category: true,
        description: true,
        price: true,
        imageUrl: true,
        tags: true,
        stockQuantity: true,
        isAvailable: true,
      },
    });

    if (!products.length) {
      return NextResponse.json(
        {
          text: `${merchant.chatbotWelcomeMessage || "Welcome."} This store has no listed products yet. Would you like to check back soon?`,
          suggestedProducts: [],
        },
        { status: 200 }
      );
    }

    const normalizedMessage = message.toLowerCase();
    const simpleMatches = products.filter((p) => {
      const tags = toStringArray(p.tags);
      const haystack = [
        p.name,
        p.brand || "",
        p.category || "",
        p.description || "",
        ...tags,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedMessage);
    });

    if (!process.env.OPENAI_API_KEY) {
      const top = (simpleMatches.length ? simpleMatches : products)
        .slice(0, 3)
        .map((p) => ({ ...p, _id: p.id }));
      return NextResponse.json(
        {
          text: "I can help with this store catalog. Here are a few relevant picks. Want me to narrow by budget or category?",
          suggestedProducts: top,
        },
        { status: 200 }
      );
    }

    const catalogContext = products
      .slice(0, 40)
      .map((p, i) => {
        const tags = toStringArray(p.tags).join(", ");
        return `${i + 1}. ${p.name} | Brand: ${p.brand || "-"} | Category: ${p.category || "General"} | Price: ₹${p.price || "N/A"} | InStock: ${p.isAvailable && p.stockQuantity > 0 ? "yes" : "no"} | Tags: ${tags || "-"} | Description: ${p.description || "-"}`;
      })
      .join("\n");

    const schema = {
      type: "object",
      additionalProperties: false,
      properties: {
        response: { type: "string" },
        products: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: ["response", "products"],
    };

    const system = `
You are the concierge chatbot for merchant store "${merchant.name}" on Rasphia.
Store summary: ${merchant.storefrontDescription || "Not provided"}

Rules:
- Recommend only products from the provided catalog.
- Be concise, warm, practical.
- If asked for unavailable items, suggest available alternatives.
- Prefer 1-3 items max.
- End with one follow-up question.
- Return strict JSON.
`.trim();

    const conversationalHistory = history
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.text}`)
      .join("\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.6,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "merchant_storefront_chat",
          strict: true,
          schema,
        },
      },
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: `Catalog:\n${catalogContext}\n\nConversation:\n${conversationalHistory}\nUser: ${message}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw) as { response?: string; products?: string[] };

    const selectedNames = Array.isArray(parsed.products) ? parsed.products : [];
    const suggestedProducts = selectedNames
      .map((name) =>
        products.find((p) => p.name.toLowerCase() === String(name).toLowerCase())
      )
      .filter((p): p is (typeof products)[number] => Boolean(p))
      .slice(0, 3)
      .map((p) => ({ ...p, _id: p.id }));

    const fallbackSuggestions =
      suggestedProducts.length > 0
        ? suggestedProducts
        : (simpleMatches.length ? simpleMatches : products)
            .slice(0, 3)
            .map((p) => ({ ...p, _id: p.id }));

    return NextResponse.json(
      {
        text:
          parsed.response ||
          "I found a few options from this store. Want me to narrow by budget or use-case?",
        suggestedProducts: fallbackSuggestions,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Storefront chat failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
