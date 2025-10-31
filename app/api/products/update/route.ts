import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/app/lib/mongodb";
import { requireAdmin } from "@/app/lib/auth";
import { generateProductEmbedding } from "@/app/lib/generateEmbeddings";

export async function PUT(req: Request) {
  try {
    await requireAdmin(); // 🔒 Admin check

    const body = await req.json();
    const { id, name, brand, description, price, imageUrl, category } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Product ID required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("rasphia");
    const products = db.collection("products");

    const updatedFields: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (name) updatedFields.name = name;
    if (brand) updatedFields.brand = brand;
    if (description) updatedFields.description = description;
    if (price) updatedFields.price = Number(price);
    if (imageUrl) updatedFields.imageUrl = imageUrl;
    if (category) updatedFields.category = category;

    // 🧠 Mark for lazy embedding regeneration if descriptive fields changed
    const reembedTriggered =
      !!(name || description || brand || category) &&
      !(price && !description && !name && !brand && !category);

    if (reembedTriggered) {
      updatedFields.embedding = null; // clear embedding to mark as stale
    }

    const result = await products.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedFields }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: "Product not found or not updated" },
        { status: 404 }
      );
    }

    // 💤 Trigger lazy embedding update in background
    if (reembedTriggered) {
      generateProductEmbedding(id)
        .then(() => console.log(`✅ Re-embedded product: ${name || id}`))
        .catch((err: any) => console.error("❌ Embedding update error:", err));
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("❌ Error updating product:", err);
    if (
      err.message?.startsWith("Unauthorized") ||
      err.message?.startsWith("Forbidden")
    ) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}
