import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/app/lib/mongodb";
import { requireAdmin } from "@/app/lib/auth";

export async function DELETE(req: Request) {
  try {
    await requireAdmin(); // 🔒 Admin check

    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "Product ID required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("rasphia");
    const products = db.collection("products");

    // 🗑️ Delete the product
    const result = await products.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Product not found or already deleted" },
        { status: 404 }
      );
    }

    // 🧠 Optional future step: remove from embedding index if needed
    // For now, Atlas Vector Search auto-handles this since embedding lives in same doc.

    console.log(`🗑️ Deleted product with ID: ${id}`);

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: any) {
    console.error("❌ Error deleting product:", err);

    if (
      err.message?.startsWith("Unauthorized") ||
      err.message?.startsWith("Forbidden")
    ) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
