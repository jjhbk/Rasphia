import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const name = req.nextUrl.searchParams.get("name");
  if (!id && !name) {
    return NextResponse.json({ error: "Missing id or name" }, { status: 400 });
  }

  const product = await prisma.product.findFirst({
    where: id ? { id } : { name: name! },
    include: {
      merchant: {
        select: {
          slug: true,
          name: true,
        },
      },
      reviewItems: {
        orderBy: { createdAt: "desc" },
        select: {
          rating: true,
          comment: true,
          userEmail: true,
          createdAt: true,
          imageUrls: true,
        },
      },
    },
  });

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...product,
    _id: product.id,
    merchantSlug: product.merchant?.slug || null,
    merchantName: product.merchant?.name || null,
    reviews: (product.reviewItems || []).map((review) => ({
      rating: review.rating,
      comment: review.comment || "",
      user: review.userEmail || "",
      userEmail: review.userEmail || "",
      date: review.createdAt?.toISOString?.() || "",
      createdAt: review.createdAt?.toISOString?.() || "",
      imageUrls: Array.isArray(review.imageUrls)
        ? (review.imageUrls as string[])
        : [],
    })),
  });
}
