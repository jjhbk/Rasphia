import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

const PUBLIC_STOREFRONT_STATUSES = [
  "approved",
  "APPROVED",
  "Approved",
  "active",
  "ACTIVE",
  "Active",
] as const;

export async function GET(req: NextRequest) {
  try {
    const q = String(req.nextUrl.searchParams.get("q") || "").trim();
    const terms = q
      .split(/\s+/)
      .map((term) => term.trim())
      .filter(Boolean)
      .slice(0, 8);
    const limit = Math.min(
      Math.max(parseInt(req.nextUrl.searchParams.get("limit") || "24", 10), 1),
      100
    );

    const merchants = await prisma.merchant.findMany({
      where: {
        status: { in: [...PUBLIC_STOREFRONT_STATUSES] },
        ...(terms.length
          ? {
              AND: terms.map((term) => ({
                OR: [
                  { name: { contains: term, mode: "insensitive" } },
                  { slug: { contains: term, mode: "insensitive" } },
                  {
                    storefrontDescription: {
                      contains: term,
                      mode: "insensitive",
                    },
                  },
                  { city: { contains: term, mode: "insensitive" } },
                  { state: { contains: term, mode: "insensitive" } },
                  { zipCode: { contains: term, mode: "insensitive" } },
                  { addressLine1: { contains: term, mode: "insensitive" } },
                  { addressLine2: { contains: term, mode: "insensitive" } },
                  { address: { contains: term, mode: "insensitive" } },
                ],
              })),
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
