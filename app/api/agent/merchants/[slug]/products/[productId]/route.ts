import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET(
  _req: Request,
  context: { params: Promise<{ slug: string; productId: string }> }
) {
  try {
    const { slug, productId } = await context.params;

    const merchant = await prisma.merchant.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        city: true,
        state: true,
        status: true,
      },
    });

    if (!merchant || merchant.status !== "approved") {
      return NextResponse.json({ error: "merchant_not_found" }, { status: 404 });
    }

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        merchantId: merchant.id,
        isAvailable: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        brand: true,
        price: true,
        stockQuantity: true,
        imageUrl: true,
        updatedAt: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: "product_not_found" }, { status: 404 });
    }

    return NextResponse.json({
      merchant: {
        id: merchant.id,
        slug: merchant.slug,
        name: merchant.name,
        location: `${merchant.city}, ${merchant.state}`,
      },
      product: {
        id: product.id,
        name: product.name,
        description: product.description || "",
        category: product.category || "",
        brand: product.brand || "",
        price_inr: Number(product.price || 0),
        stock: product.stockQuantity,
        image_url: product.imageUrl || null,
        updated_at: product.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch product";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
