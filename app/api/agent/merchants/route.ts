import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  try {
    const merchants = await prisma.merchant.findMany({
      where: { status: "approved" },
      select: {
        id: true,
        slug: true,
        name: true,
        city: true,
        state: true,
        storefrontDescription: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      merchants: merchants.map((m) => ({
        id: m.id,
        slug: m.slug,
        name: m.name,
        region: `India / ${m.state}`,
        location: `${m.city}, ${m.state}`,
        description: m.storefrontDescription || "",
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list merchants";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
