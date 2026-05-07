import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET(
  _req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;

    const merchant = await prisma.merchant.findUnique({
      where: { slug },
      select: { id: true, slug: true, name: true, status: true },
    });

    if (!merchant || merchant.status !== "approved") {
      return NextResponse.json({ error: "merchant_not_found" }, { status: 404 });
    }

    const products = await prisma.product.findMany({
      where: {
        merchantId: merchant.id,
        isAvailable: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        price: true,
        stockQuantity: true,
        imageUrl: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });

    return NextResponse.json({
      merchant: {
        id: merchant.id,
        slug: merchant.slug,
        name: merchant.name,
      },
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description || "",
        category: p.category || "",
        price_inr: Number(p.price || 0),
        stock: p.stockQuantity,
        image_url: p.imageUrl || null,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list products";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
