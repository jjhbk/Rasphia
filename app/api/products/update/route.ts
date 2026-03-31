import { NextResponse } from "next/server";
import { getManagementAccessFromRequest } from "@/app/lib/auth";
import { generateProductEmbedding } from "@/app/lib/generateEmbeddings";
import { prisma } from "@/app/lib/prisma";

export async function PUT(req: Request) {
  try {
    const access = await getManagementAccessFromRequest(req);

    const body = await req.json();

    // 🆔 Normalize product ID (accept id or _id)
    const rawId: string | undefined = body.id || body._id;
    if (!rawId) {
      return NextResponse.json(
        { error: "Valid product ID (_id or id) required." },
        { status: 400 }
      );
    }

    const {
      name,
      brand,
      description,
      price,
      imageUrl,
      category,
      stockQuantity,
      tags,
      occasion,
      recipient,
      story,
      affiliateLink,
    } = body;

    const existingProduct = await prisma.product.findUnique({
      where: { id: rawId },
    });
    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (
      access.role === "merchant" &&
      existingProduct.merchantEmail !== access.email
    ) {
      return NextResponse.json(
        { error: "Forbidden: You can only update your own products" },
        { status: 403 }
      );
    }

    // ✅ Build $set object only with defined fields
    const updatedFields: Record<string, unknown> = { updatedAt: new Date() };

    if (name !== undefined) updatedFields.name = name;
    if (brand !== undefined) updatedFields.brand = brand;
    if (description !== undefined) updatedFields.description = description;
    if (price !== undefined) updatedFields.price = Number(price);
    if (imageUrl !== undefined) updatedFields.imageUrl = imageUrl;
    if (category !== undefined) updatedFields.category = category;
    if (stockQuantity !== undefined) {
      const normalizedStock = Math.max(0, Number(stockQuantity));
      updatedFields.stockQuantity = normalizedStock;
      updatedFields.isAvailable = normalizedStock > 0;
    }
    if (tags !== undefined) updatedFields.tags = tags;
    if (occasion !== undefined) updatedFields.occasion = occasion;
    if (recipient !== undefined) updatedFields.recipient = recipient;
    if (story !== undefined) updatedFields.story = story;
    if (affiliateLink !== undefined)
      updatedFields.affiliateLink = affiliateLink;

    // 🧠 Detect if any descriptive field changed
    const reembedTriggered =
      [name, description, brand, category, story, recipient].some(
        (f) => f !== undefined && f !== ""
      ) ||
      (Array.isArray(tags) && tags.length > 0) ||
      (Array.isArray(occasion) && occasion.length > 0);

    if (reembedTriggered) {
      updatedFields.embedding = null; // mark for lazy re-embedding
    }

    // ✅ Perform update in MongoDB
    await prisma.product.update({
      where: { id: rawId },
      data: updatedFields,
    });

    console.log(`📝 Updated product: ${name || rawId}`);
    if (reembedTriggered) {
      console.log(`🔁 Re-embedding scheduled for ${name || rawId}`);
      generateProductEmbedding(rawId)
        .then(() => console.log(`✅ Re-embedding completed: ${name || rawId}`))
        .catch((err) => console.error("❌ Embedding update error:", err));
    }

    // ✅ Fetch updated product for return
    const updatedProduct = await prisma.product.findUnique({
      where: { id: rawId },
    });
    if (!updatedProduct) {
      return NextResponse.json(
        { error: "Updated product not found after save" },
        { status: 404 }
      );
    }

    // ✅ Clean response
    const cleanProduct = {
      ...updatedProduct,
      _id: updatedProduct.id,
    };

    return NextResponse.json(cleanProduct, { status: 200 });
  } catch (err: unknown) {
    console.error("❌ Error updating product:", err);
    const message =
      err instanceof Error ? err.message : "Failed to update product.";

    if (
      message.startsWith("Unauthorized") ||
      message.startsWith("Forbidden")
    ) {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Failed to update product." },
      { status: 500 }
    );
  }
}
