import { NextResponse } from "next/server";
import { getManagementAccess } from "@/app/lib/auth";
import { deleteProductEmbedding } from "@/app/lib/product-vector-store";
import { prisma } from "@/app/lib/prisma";

export async function DELETE(req: Request) {
  try {
    const access = await getManagementAccess();

    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "Product ID required" },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return NextResponse.json(
        { error: "Product not found or already deleted" },
        { status: 404 }
      );
    }

    if (access.role === "merchant" && product.merchantEmail !== access.email) {
      return NextResponse.json(
        { error: "Forbidden: You can only delete your own products" },
        { status: 403 }
      );
    }

    // 🗑️ Delete the product
    await prisma.product.delete({ where: { id } });

    await deleteProductEmbedding(id);

    console.log(`🗑️ Deleted product with ID: ${id}`);

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: unknown) {
    console.error("❌ Error deleting product:", err);
    const message = err instanceof Error ? err.message : "Failed to delete product";

    if (
      message.startsWith("Unauthorized") ||
      message.startsWith("Forbidden")
    ) {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
