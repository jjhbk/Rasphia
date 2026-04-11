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

    const tryons = await prisma.tryOn.findMany({
      where: { email },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(
      tryons.map((t) => {
        const payload = (t.payload || {}) as Record<string, any>;
        return {
          tryonId: payload.tryonId || t.id,
          imageUrl: payload.imageUrl || null,
          shareUrl: payload.shareUrl || null,
          productImageUrl: payload.productImageUrl ?? null,
          createdAt: t.createdAt,
        };
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("LIST TRYONS ERROR:", err);
    return NextResponse.json(
      { error: "Failed to load try-ons" },
      { status: 500 }
    );
  }
});
