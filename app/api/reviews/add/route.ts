import { NextRequest, NextResponse } from "next/server";
import { authGuard } from "@/app/lib/auth-guard";
import { prisma } from "@/app/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { sessionEmail, body, errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;

    const { orderId, productNames, rating, comment, imageUrls } = body || {};

    if (!orderId || !Array.isArray(productNames) || !productNames.length) {
      return NextResponse.json(
        { error: "orderId and productNames are required" },
        { status: 400 }
      );
    }

    const safeRating = Number(rating);
    if (!Number.isFinite(safeRating) || safeRating < 1 || safeRating > 5) {
      return NextResponse.json(
        { error: "rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    const order = await prisma.order.findFirst({
      where: {
        orderId: String(orderId),
        customer: {
          path: ["email"],
          equals: sessionEmail,
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found for this user" },
        { status: 404 }
      );
    }

    const orderedProducts = Array.isArray(order.products)
      ? (order.products as Array<{ name?: string }>)
      : [];
    const orderedNames = new Set(
      orderedProducts
        .map((p) => p?.name)
        .filter((n): n is string => typeof n === "string")
    );

    const cleanedImageUrls = Array.isArray(imageUrls)
      ? imageUrls
          .filter((u) => typeof u === "string")
          .map((u) => u.trim())
          .filter(Boolean)
      : [];

    const createdReviews = [];

    for (const rawName of productNames) {
      if (typeof rawName !== "string") continue;
      const name = rawName.trim();
      if (!name || !orderedNames.has(name)) continue;

      const product = await prisma.product.findFirst({ where: { name } });
      if (!product) continue;

      const existing = await prisma.review.findFirst({
        where: {
          productId: product.id,
          userEmail: sessionEmail,
          orderId: String(orderId),
        },
      });
      if (existing) continue;

      const review = await prisma.review.create({
        data: {
          productId: product.id,
          userEmail: sessionEmail,
          orderId: String(orderId),
          rating: safeRating,
          comment: typeof comment === "string" ? comment.trim() : null,
          imageUrls: cleanedImageUrls,
          verifiedPurchase: true,
        },
      });

      createdReviews.push(review);
    }

    if (!createdReviews.length) {
      return NextResponse.json(
        {
          error:
            "No valid reviews were created. Check purchased products or duplicates.",
        },
        { status: 400 }
      );
    }

    await prisma.order.updateMany({
      where: { orderId: String(orderId) },
      data: { isReviewed: true, updatedAt: new Date() },
    });

    return NextResponse.json(
      { success: true, reviews: createdReviews },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to add review";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
