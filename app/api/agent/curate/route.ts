import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { embedQuery } from "@/app/lib/queryEmbeddings";
import { searchProductEmbeddings } from "@/app/lib/product-vector-store";

type CurateRequest = {
  query?: string;
  merchant_slug?: string;
  category?: string;
  max_price_inr?: number;
  limit?: number;
};

function toNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CurateRequest;
    const query = String(body?.query || "").trim();
    const merchantSlug = String(body?.merchant_slug || "").trim().toLowerCase();
    const category = String(body?.category || "").trim();
    const maxPriceInr = toNumber(body?.max_price_inr);
    const limit = Math.max(1, Math.min(20, Number(body?.limit || 6)));

    if (!query) {
      return NextResponse.json({ error: "query is required" }, { status: 400 });
    }

    let merchantFilterId: string | null = null;
    if (merchantSlug) {
      const merchant = await prisma.merchant.findFirst({
        where: { slug: merchantSlug, status: "approved" },
        select: { id: true },
      });
      if (!merchant) {
        return NextResponse.json({ error: "merchant_not_found" }, { status: 404 });
      }
      merchantFilterId = merchant.id;
    }

    const embedding = await embedQuery(query);
    const hits = await searchProductEmbeddings(embedding, 30);
    const rankedIds = hits.map((h) => h._id);

    if (!rankedIds.length) {
      return NextResponse.json({
        query,
        products: [],
        count: 0,
      });
    }

    const products = await prisma.product.findMany({
      where: {
        id: { in: rankedIds },
        isAvailable: true,
        ...(merchantFilterId ? { merchantId: merchantFilterId } : {}),
        ...(category ? { category: { contains: category, mode: "insensitive" } } : {}),
        ...(maxPriceInr !== null ? { price: { lte: maxPriceInr } } : {}),
      },
      select: {
        id: true,
        merchantId: true,
        name: true,
        description: true,
        category: true,
        brand: true,
        price: true,
        stockQuantity: true,
        imageUrl: true,
      },
    });

    const byId = new Map(products.map((p) => [p.id, p] as const));
    const scoreById = new Map(hits.map((h) => [h._id, h.score] as const));

    const ordered = rankedIds
      .map((id) => byId.get(id))
      .filter((p): p is (typeof products)[number] => Boolean(p))
      .slice(0, limit);

    if (!ordered.length) {
      return NextResponse.json({
        query,
        products: [],
        count: 0,
      });
    }

    const merchantIds = Array.from(
      new Set(ordered.map((p) => String(p.merchantId || "").trim()).filter(Boolean))
    );

    const merchants = merchantIds.length
      ? await prisma.merchant.findMany({
          where: { id: { in: merchantIds }, status: "approved" },
          select: {
            id: true,
            slug: true,
            name: true,
            city: true,
            state: true,
            storefrontDescription: true,
          },
        })
      : [];

    const merchantById = new Map(merchants.map((m) => [m.id, m] as const));
    const origin = new URL(req.url).origin;

    const responseProducts = ordered
      .map((p) => {
        const merchant = merchantById.get(String(p.merchantId || ""));
        if (!merchant) return null;
        const productUrl = `${origin}/api/agent/merchants/${encodeURIComponent(
          merchant.slug
        )}/products/${encodeURIComponent(p.id)}`;
        const buyUrl = `${productUrl}/buy`;
        return {
          id: p.id,
          name: p.name,
          description: p.description || "",
          category: p.category || "",
          brand: p.brand || "",
          price_inr: Number(p.price || 0),
          stock: p.stockQuantity,
          image_url: p.imageUrl || null,
          relevance_score: Number(scoreById.get(p.id) || 0),
          merchant: {
            id: merchant.id,
            slug: merchant.slug,
            name: merchant.name,
            location: `${merchant.city}, ${merchant.state}`,
            description: merchant.storefrontDescription || "",
          },
          endpoints: {
            product: productUrl,
            buy: buyUrl,
          },
        };
      })
      .filter((p): p is NonNullable<typeof p> => Boolean(p));

    return NextResponse.json({
      query,
      merchant_scope: merchantSlug || null,
      category: category || null,
      max_price_inr: maxPriceInr,
      count: responseProducts.length,
      products: responseProducts,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to curate products";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
