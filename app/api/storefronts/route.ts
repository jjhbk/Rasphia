import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const q = String(req.nextUrl.searchParams.get("q") || "").trim();
    const limit = Math.min(
      Math.max(parseInt(req.nextUrl.searchParams.get("limit") || "24", 10), 1),
      100
    );

    const merchants = await prisma.merchant.findMany({
      where: {
        status: "approved",
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { slug: { contains: q, mode: "insensitive" } },
                {
                  storefrontDescription: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        slug: true,
        name: true,
        logoUrl: true,
        coverImageUrl: true,
        storefrontDescription: true,
        city: true,
        state: true,
        _count: {
          select: { catalog: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ stores: merchants }, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch storefronts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
