import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const { invoiceId } = await params;

  const order = await prisma.order.findFirst({
    where: { invoiceId },
    select: {
      invoicePdfUrl: true,
      invoiceNumber: true,
    },
  });

  if (!order?.invoicePdfUrl) {
    return NextResponse.json(
      { error: "Invoice PDF not found." },
      { status: 404 }
    );
  }

  return NextResponse.redirect(order.invoicePdfUrl, {
    headers: {
      "Content-Disposition": `inline; filename="${order.invoiceNumber || invoiceId}.pdf"`,
    },
  });
}
