import { NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import { requireAdmin } from "@/app/lib/auth";
import { generateProductEmbedding } from "@/app/lib/generateEmbeddings";
import { ObjectId } from "mongodb";

export async function POST(req: Request) {
  try {
    // 🔒 Ensure only admins can access
    await requireAdmin();

    const body = await req.json();
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

    // ✅ Validate required fields
    if (!name || !story || !price) {
      return NextResponse.json(
        { error: "Missing required fields: name, description, or price." },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("rasphia");

    // ✅ Create new product document
    const newProduct = {
      name,
      brand: brand || "Unknown",
      description,
      price: Number(price),
      imageUrl: imageUrl || "",
      category: category || "Uncategorized",
      tags: tags || [],
      occasion: occasion || [],
      recipient: recipient || "Anyone",
      story: story || "",
      affiliateLink: affiliateLink || "",
      reviews: reviews || [],
      embedding: null, // 💤 lazy embedding
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // ✅ Insert into MongoDB
    const result = await db.collection("products").insertOne(newProduct);
    const productId = result.insertedId.toString();

    console.log(`🆕 Product added: ${name} (${productId})`);

    // ✅ Trigger async background embedding generation
    generateProductEmbedding(productId)
      .then(() => console.log(`✅ Embedding generated for ${name}`))
      .catch((err: any) =>
        console.error("❌ Embedding generation error:", err)
      );

    // ✅ Return the saved product
    return NextResponse.json({ _id: productId, ...newProduct });
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
