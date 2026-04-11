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

    const reimagined = await prisma.reimaginedProduct.findMany({
      where: { email },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(
      reimagined.map((r) => {
        const payload = (r.payload || {}) as Record<string, any>;
        return {
          reimagineId: payload.reimagineId || r.id,
          imageUrl: payload.imageUrl || null,
          prompt: payload.prompt || null,
          productImageUrl: payload.productImageUrl ?? null,
          createdAt: r.createdAt,
        };
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("LIST REIMAGINED PRODUCTS ERROR:", err);
    return NextResponse.json(
      { error: "Failed to load reimagined products" },
      { status: 500 }
    );
  }
});
