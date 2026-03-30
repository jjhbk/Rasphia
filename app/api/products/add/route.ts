import { NextResponse } from "next/server";
import { getManagementAccess } from "@/app/lib/auth";
import { generateProductEmbedding } from "@/app/lib/generateEmbeddings";
import { prisma } from "@/app/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const access = await getManagementAccess();

    const body = await req.json();
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

    // Keep API validation aligned with AdminProductForm validation.
    if (
      !String(name || "").trim() ||
      !String(category || "").trim() ||
      !imageUrl ||
      Number(price) <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: name, category, imageUrl, or valid price.",
        },
        { status: 400 }
      );
    }

    const newProduct = {
      name,
      brand: brand || "Unknown",
      description,
      price: Number(price),
      imageUrl: imageUrl || "",
      category: category || "Uncategorized",
      stockQuantity: Math.max(0, Number(stockQuantity ?? 0)),
      isAvailable: Number(stockQuantity ?? 0) > 0,
      tags: tags || [],
      occasion: occasion || [],
      recipient: recipient || "Anyone",
      story: story || "",
      affiliateLink: affiliateLink || "",
      embedding: null, // 💤 lazy embedding
      merchantEmail: access.role === "merchant" ? access.email : null,
      merchantId: access.role === "merchant" ? access.merchantId : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const created = await prisma.product.create({
      data: newProduct as Prisma.ProductCreateInput,
    });
    const productId = created.id;

    console.log(`🆕 Product added: ${name} (${productId})`);

    // ✅ Trigger async background embedding generation
    generateProductEmbedding(productId)
      .then(() => console.log(`✅ Embedding generated for ${name}`))
      .catch((err: unknown) =>
        console.error("❌ Embedding generation error:", err)
      );

    // ✅ Return the saved product
    return NextResponse.json({ _id: productId, ...created });
  } catch (err: unknown) {
    console.error("❌ Error adding product:", err);
    const message = err instanceof Error ? err.message : "Failed to add product";

    if (
      message.startsWith("Unauthorized") ||
      message.startsWith("Forbidden")
    ) {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Failed to add product" },
      { status: 500 }
    );
  }
}
