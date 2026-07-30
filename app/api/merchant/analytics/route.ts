import { NextRequest, NextResponse } from "next/server";
import { getManagementAccessFromRequest } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { getMerchantAnalyticsSummary } from "@/app/lib/merchant-analytics";

export async function GET(req: NextRequest) {
  try {
    const access = await getManagementAccessFromRequest(req);
    if (access.role !== "merchant" || !access.merchantId) {
      return NextResponse.json(
        { error: "Forbidden: Merchant access required" },
        { status: 403 }
      );
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: access.merchantId },
      select: { id: true, email: true, name: true, slug: true },
    });

    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const summary = await getMerchantAnalyticsSummary({
      merchantId: merchant.id,
      merchantEmail: merchant.email,
    });

    return NextResponse.json(
      {
        merchant,
        summary,
        generatedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to load merchant analytics";
    if (message.startsWith("Unauthorized") || message.startsWith("Forbidden")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
