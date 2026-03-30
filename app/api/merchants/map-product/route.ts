import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json();
    const { merchantId, productId } = body;

    if (!merchantId || !productId) {
      return NextResponse.json(
        { error: "merchantId and productId are required" },
        { status: 400 }
      );
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: String(merchantId) },
      select: { id: true },
    });
    if (!merchant) {
      return NextResponse.json(
        { error: "Invalid merchantId: merchant does not exist" },
        { status: 400 }
      );
    }

    const mapping = await prisma.productEmbedding.update({
      where: { productId: String(productId) },
      data: { merchantId: String(merchantId) },
    });

    return NextResponse.json(mapping, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error) {
      const code = (error as { code?: string }).code;
      if (code === "P2025") {
        return NextResponse.json(
          { error: "Product embedding not found for this productId" },
          { status: 404 }
        );
      }
      if (code === "P2003") {
        return NextResponse.json(
          { error: "Invalid merchantId: merchant does not exist" },
          { status: 400 }
        );
      }
    }

    const message =
      error instanceof Error ? error.message : "Failed to map product";
    if (message.startsWith("Unauthorized") || message.startsWith("Forbidden")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json();
    const { merchantId, productId } = body;

    if (!merchantId || !productId) {
      return NextResponse.json(
        { error: "merchantId and productId are required" },
        { status: 400 }
      );
    }

    const updated = await prisma.productEmbedding.updateMany({
      where: {
        productId: String(productId),
        merchantId: String(merchantId),
      },
      data: {
        merchantId: null,
      },
    });

    if (updated.count === 0) {
      return NextResponse.json(
        { error: "No matching merchant-product mapping found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to unmap product";
    if (message.startsWith("Unauthorized") || message.startsWith("Forbidden")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
