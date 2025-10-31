import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/app/lib/mongodb";
import { requireAdmin } from "@/app/lib/auth";
import { generateProductEmbedding } from "@/app/lib/generateEmbeddings";

export async function PUT(req: Request) {
  try {
    // 🔒 Ensure only admins can access
    await requireAdmin();

    const body = await req.json();

    // 🆔 Normalize product ID (accept id or _id)
    const rawId: string | undefined = body.id || body._id;
    if (!rawId || !ObjectId.isValid(rawId)) {
      return NextResponse.json(
        { error: "Valid product ID (_id or id) required." },
        { status: 400 }
      );
    }

    const id = new ObjectId(rawId);

    const {
      name,
      brand,
      description,
      price,
      imageUrl,
      category,
      tags,
      occasion,
      recipient,
      story,
      affiliateLink,
      reviews,
    } = body;

    const client = await clientPromise;
    const db = client.db("rasphia");
    const products = db.collection("products");

    // ✅ Build $set object only with defined fields
    const updatedFields: Record<string, any> = { updatedAt: new Date() };

    if (name !== undefined) updatedFields.name = name;
    if (brand !== undefined) updatedFields.brand = brand;
    if (description !== undefined) updatedFields.description = description;
    if (price !== undefined) updatedFields.price = Number(price);
    if (imageUrl !== undefined) updatedFields.imageUrl = imageUrl;
    if (category !== undefined) updatedFields.category = category;
    if (tags !== undefined) updatedFields.tags = tags;
    if (occasion !== undefined) updatedFields.occasion = occasion;
    if (recipient !== undefined) updatedFields.recipient = recipient;
    if (story !== undefined) updatedFields.story = story;
    if (affiliateLink !== undefined)
      updatedFields.affiliateLink = affiliateLink;
    if (reviews !== undefined) updatedFields.reviews = reviews;

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
    const result = await products.updateOne(
      { _id: id },
      { $set: updatedFields }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    console.log(`📝 Updated product: ${name || rawId}`);
    if (reembedTriggered) {
      console.log(`🔁 Re-embedding scheduled for ${name || rawId}`);
      generateProductEmbedding(rawId)
        .then(() => console.log(`✅ Re-embedding completed: ${name || rawId}`))
        .catch((err) => console.error("❌ Embedding update error:", err));
    }

    // ✅ Fetch updated product for return
    const updatedProduct = await products.findOne({ _id: id });
    if (!updatedProduct) {
      return NextResponse.json(
        { error: "Updated product not found after save" },
        { status: 404 }
      );
    }

    // ✅ Clean response: convert ObjectId to string
    const cleanProduct = {
      ...updatedProduct,
      _id: updatedProduct._id.toString(),
    };

    return NextResponse.json(cleanProduct, { status: 200 });
  } catch (err: any) {
    console.error("❌ Error updating product:", err);

    if (
      err.message?.startsWith("Unauthorized") ||
      err.message?.startsWith("Forbidden")
    ) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Failed to update product." },
      { status: 500 }
    );
  }
}
