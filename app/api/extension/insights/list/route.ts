import { NextResponse } from "next/server";
import { verifyExtensionToken } from "@/app/lib/verifyExtToken";
import { handleOptions, withExtensionCors } from "@/app/lib/extensionCors";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";
export const OPTIONS = handleOptions;

export const GET = withExtensionCors(async (req: Request) => {
  try {
    const email = await verifyExtensionToken(req);
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const insights = await prisma.productInsight.findMany({
      where: { email },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(
      insights.map((i) => {
        const payload = (i.payload || {}) as Record<string, any>;
        return {
          id: payload.insightId || i.id,
          chatId: payload.chatId ?? null,
          product: payload.product ?? null,
          analysis: payload.analysis ?? null,
          createdAt: i.createdAt,
        };
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("LIST INSIGHTS ERROR:", err);
    return NextResponse.json(
      { error: "Failed to load insights" },
      { status: 500 }
    );
  }
});
