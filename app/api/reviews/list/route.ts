import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const productId = req.nextUrl.searchParams.get("productId");
    const productName = req.nextUrl.searchParams.get("productName");

    if (!productId && !productName) {
      return NextResponse.json(
        { error: "productId or productName is required" },
        { status: 400 }
      );
    }

    let resolvedProductId = productId;

    if (!resolvedProductId && productName) {
      const product = await prisma.product.findFirst({
        where: { name: productName },
        select: { id: true },
      });
      resolvedProductId = product?.id || null;
    }

    if (!resolvedProductId) {
      return NextResponse.json([], { status: 200 });
    }

    const reviews = await prisma.review.findMany({
      where: { productId: resolvedProductId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(reviews, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch reviews";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
