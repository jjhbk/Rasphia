import { NextResponse } from "next/server";
import OpenAI from "openai";
import { verifyExtensionToken } from "@/app/lib/verifyExtToken";
import { loadPersona } from "@/app/lib/loadPersona";
import { handleOptions, withExtensionCors } from "@/app/lib/extensionCors";
import { prisma } from "@/app/lib/prisma";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const OPTIONS = handleOptions;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type ChatMessage = {
  author?: string;
  text?: string;
  createdAt?: string;
};

function readMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  return value.filter((m) => m && typeof m === "object") as ChatMessage[];
}

export const POST = withExtensionCors(async (req: Request) => {
  try {
    const email = await verifyExtensionToken(req);
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { query, chatId } = await req.json();
    if (!query) {
      return NextResponse.json({ error: "Missing user query" }, { status: 400 });
    }

    const persona = await loadPersona(email);

    let chat = chatId ? await prisma.chat.findUnique({ where: { id: String(chatId) } }) : null;

    if (chat && chat.userEmail !== email) {
      return NextResponse.json(
        { error: "Forbidden: You do not own this chat" },
        { status: 403 }
      );
    }

    if (!chat) {
      chat = await prisma.chat.create({
        data: {
          userEmail: email,
          title: new Date().toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }),
          messages: [] as unknown as Prisma.InputJsonValue,
        },
      });
    }

    const contextRecord = await prisma.analysis.findFirst({
      where: {
        chatId: chat.id,
        userEmail: email,
        type: "extension_product_context",
      },
      orderBy: { createdAt: "desc" },
    });

    const productsContext =
      (contextRecord?.payload as Record<string, any> | null)?.products ?? null;

    const formattedMessages = [
      {
        role: "system" as const,
        content: `
You are Rasphia — a hyper-personal AI stylist, dermatologist assistant,
haircare expert, home stylist, gifting consultant, and fashion advisor.

User Persona:
${JSON.stringify(persona, null, 2)}

${
  productsContext
    ? `
The user is discussing the following products in this chat.
This product data is attached to the chat and is the single source of truth.

${JSON.stringify(productsContext, null, 2)}

Rules:
- Use only this product data
- Do not hallucinate missing attributes
- Do not suggest different products unless explicitly asked
`
    : ""
}

Always provide:
- personalized suggestions
- safe ingredient guidance
- suitability per skin/hair type
- budget-friendly options
- lifestyle-aware solutions
`,
      },
      ...readMessages(chat.messages).map((m) => ({
        role: m.author === "user" ? ("user" as const) : ("assistant" as const),
        content: String(m.text || ""),
      })),
      { role: "user" as const, content: String(query) },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: formattedMessages,
      max_tokens: 500,
      temperature: 0.7,
    });

    const reply =
      completion.choices[0].message?.content ?? "I'm not sure, could you rephrase?";

    const nowIso = new Date().toISOString();
    const existing = readMessages(chat.messages);
    const nextMessages = [
      ...existing,
      { author: "user", text: String(query), createdAt: nowIso },
      { author: "ai", text: reply, createdAt: nowIso },
    ];

    await prisma.chat.update({
      where: { id: chat.id },
      data: {
        messages: nextMessages as unknown as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      chatId: chat.id,
      reply,
    });
  } catch (err) {
    console.error("/chats/add-message ERROR:", err);
    return NextResponse.json({ error: "Chat route failed" }, { status: 500 });
  }
});
