import { NextRequest, NextResponse } from "next/server";
import { getManagementAccessFromRequest } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import {
  isInvoiceEmailConfigured,
  sendInvoiceEmailForOrder,
} from "@/app/lib/invoice-email";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const access = await getManagementAccessFromRequest(req);
    const { invoiceId } = await params;

    const order = await prisma.order.findFirst({
      where: { invoiceId },
      select: {
        id: true,
        orderId: true,
        merchantId: true,
        customer: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (access.role === "merchant" && order.merchantId !== access.merchantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!isInvoiceEmailConfigured()) {
      return NextResponse.json(
        { error: "Invoice email is not configured on the server." },
        { status: 409 }
      );
    }

    const result = await sendInvoiceEmailForOrder(order.orderId, { force: true });
    if (!result.sent) {
      return NextResponse.json(
        { error: `Invoice email was not sent (${result.skipped || "unknown_reason"}).` },
        { status: 409 }
      );
    }

    return NextResponse.json({ status: "success", message: "Invoice email sent." });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to resend invoice email";
    if (message.startsWith("Unauthorized") || message.startsWith("Forbidden")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
