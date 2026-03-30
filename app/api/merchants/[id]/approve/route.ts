import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const action = String(body?.action || "approve");

    const status = action === "reject" ? "rejected" : "approved";

    const merchant = await prisma.merchant.update({
      where: { id },
      data: {
        status,
        approvedAt: status === "approved" ? new Date() : null,
        approvedBy: status === "approved" ? adminUser.email || "" : null,
      },
    });

    await prisma.userProfile.upsert({
      where: { email: merchant.email },
      create: {
        email: merchant.email,
        name: merchant.name,
        role: status === "approved" ? "merchant" : "user",
        credits: 0,
      },
      update: {
        role: status === "approved" ? "merchant" : "user",
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, merchant }, { status: 200 });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      (error as { code?: string }).code === "P2025"
    ) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const message =
      error instanceof Error ? error.message : "Failed to update merchant";
    if (message.startsWith("Unauthorized") || message.startsWith("Forbidden")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
