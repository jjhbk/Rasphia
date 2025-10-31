import { NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";

export async function GET(req: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("rasphia");
    const url = new URL(req.url);

    // Optional query params for pagination
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);
    const skip = parseInt(url.searchParams.get("skip") || "0", 10);

    // 🧠 Base query — skip deleted products
    const query = { isDeleted: { $ne: true } };

    // ⚡ Projection: exclude large fields like embeddings
    const projection = { embedding: 0 };

    const products = await db
      .collection("products")
      .find(query, { projection })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return NextResponse.json(products);
  } catch (err) {
    console.error("❌ Error fetching products:", err);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
