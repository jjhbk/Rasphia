import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { toHighQualityImageUrl } from "@/app/utils/imageQuality";

const PUBLIC_STOREFRONT_STATUSES = [
  "approved",
  "APPROVED",
  "Approved",
  "active",
  "ACTIVE",
  "Active",
] as const;

type ProductRecord = {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  price: number | null;
  description: string | null;
  imageUrl: string | null;
  tags: unknown;
  stockQuantity: number;
  isAvailable: boolean;
};

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const params = await context.params;
    const slug = String(params.slug || "").trim().toLowerCase();
    if (!slug) {
      return NextResponse.json({ error: "Invalid storefront slug" }, { status: 400 });
    }

    const merchant = await prisma.merchant.findFirst({
      where: { slug, status: { in: [...PUBLIC_STOREFRONT_STATUSES] } },
      select: {
        id: true,
        slug: true,
        name: true,
        phone: true,
        logoUrl: true,
        coverImageUrl: true,
        storefrontDescription: true,
        chatbotWelcomeMessage: true,
        city: true,
        state: true,
      },
    });

    if (!merchant) {
      return NextResponse.json({ error: "Storefront not found" }, { status: 404 });
    }

    const q = String(req.nextUrl.searchParams.get("q") || "").trim().toLowerCase();
    const category = String(req.nextUrl.searchParams.get("category") || "").trim();
    const tagsParam = String(req.nextUrl.searchParams.get("tags") || "").trim();
    const minPrice = Number(req.nextUrl.searchParams.get("minPrice") || "0");
    const maxPriceRaw = req.nextUrl.searchParams.get("maxPrice");
    const maxPrice = maxPriceRaw ? Number(maxPriceRaw) : Number.POSITIVE_INFINITY;
    const inStockOnly = req.nextUrl.searchParams.get("inStock") === "true";
    const sort = String(req.nextUrl.searchParams.get("sort") || "relevance");

    const products = await prisma.product.findMany({
      where: { merchantId: merchant.id },
      orderBy: { updatedAt: "desc" },
      take: 600,
    });

    const requiredTags = tagsParam
      ? tagsParam
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean)
      : [];

    let filtered: ProductRecord[] = products.filter((p) => {
      const tags = toStringArray(p.tags).map((t) => t.toLowerCase());
      const categoryValue = String(p.category || "");
      const price = Number(p.price || 0);
      const searchable = [
        p.name,
        p.description || "",
        p.brand || "",
        categoryValue,
        ...tags,
      ]
        .join(" ")
        .toLowerCase();

      if (q && !searchable.includes(q)) return false;
      if (category && categoryValue.toLowerCase() !== category.toLowerCase()) return false;
      if (requiredTags.length && !requiredTags.every((tag) => tags.includes(tag))) {
        return false;
      }
      if (price < minPrice || price > maxPrice) return false;
      if (inStockOnly && (!p.isAvailable || p.stockQuantity <= 0)) return false;
      return true;
    });

    if (sort === "price_asc") {
      filtered = filtered.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    } else if (sort === "price_desc") {
      filtered = filtered.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    } else if (sort === "latest") {
      filtered = filtered.sort((a, b) => b.id.localeCompare(a.id));
    }

    const categories = Array.from(
      new Set(
        products
          .map((p) => p.category)
          .filter((c): c is string => typeof c === "string" && c.length > 0)
      )
    ).sort();

    const tagFacets = Array.from(
      new Set(products.flatMap((p) => toStringArray(p.tags)))
    ).sort((a, b) => a.localeCompare(b));

    return NextResponse.json(
      {
        merchant: {
          ...merchant,
          logoUrl: toHighQualityImageUrl(merchant.logoUrl),
          coverImageUrl: toHighQualityImageUrl(merchant.coverImageUrl),
        },
        products: filtered.map((p) => ({
          ...p,
          imageUrl: toHighQualityImageUrl(p.imageUrl),
          _id: p.id,
        })),
        facets: {
          categories,
          tags: tagFacets,
          price: {
            min: products.length
              ? Math.min(...products.map((p) => Number(p.price || 0)))
              : 0,
            max: products.length
              ? Math.max(...products.map((p) => Number(p.price || 0)))
              : 0,
          },
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch storefront";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
