import { NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import { requireAdmin } from "@/app/lib/auth";
import { generateProductEmbedding } from "@/app/lib/generateEmbeddings";
import { ObjectId } from "mongodb"; // ✅ FIX: Explicit import

export async function POST(req: Request) {
  try {
    await requireAdmin(); // 🔒 Admin check

    const body = await req.json();
    const { name, brand, description, price, imageUrl, category } = body;

    if (!name || !description || !price) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("rasphia");

    const newProduct = {
      name,
      brand: brand || "Unknown",
      description,
      price: Number(price),
      imageUrl: imageUrl || "",
      category: category || "Uncategorized",
      embedding: null, // 💤 Lazy: no embedding yet
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("products").insertOne(newProduct);

    // ✅ Trigger background embedding generation (non-blocking)
    generateProductEmbedding(result.insertedId.toString())
      .then(() => console.log(`✅ Embedding generated for ${name}`))
      .catch((err: any) => console.error("❌ Embedding error:", err));

    return NextResponse.json({ _id: result.insertedId, ...newProduct });
  } catch (err: any) {
    console.error("❌ Error adding product:", err);

    if (
      err.message?.startsWith("Unauthorized") ||
      err.message?.startsWith("Forbidden")
    ) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Failed to add product" },
      { status: 500 }
    );
  }
}
