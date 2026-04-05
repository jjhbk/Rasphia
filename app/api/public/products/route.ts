import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") || "1") || 1);
    const pageSizeRaw = Number(req.nextUrl.searchParams.get("pageSize") || "20");
    const pageSize = Math.min(100, Math.max(1, pageSizeRaw || 20));
    const skip = (page - 1) * pageSize;

    const [total, products] = await Promise.all([
      prisma.product.count(),
      prisma.product.findMany({
        orderBy: { updatedAt: "desc" },
        skip,
        take: pageSize,
        select: {
          id: true,
          name: true,
          description: true,
          imageUrl: true,
          category: true,
          price: true,
          stockQuantity: true,
          isAvailable: true,
        },
      }),
    ]);

    const base = String(process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "")
      .trim()
      .replace(/\/+$/, "");

    const items = products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description || "",
      imageUrl: p.imageUrl || "",
      category: p.category || "",
      price: p.price || 0,
      stockQuantity: p.stockQuantity,
      isAvailable: p.isAvailable,
      productUrl: base ? `${base}/products/${p.id}` : `/products/${p.id}`,
    }));

    return NextResponse.json(
      {
        items,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch public products";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
