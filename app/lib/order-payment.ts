import { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/prisma";
import { generateInternalInvoiceForOrder } from "@/app/lib/order-invoice";

type FinalizeOrderPaymentInput = {
  orderId: string;
  paymentId: string;
  by?: string;
  note?: string;
  verifiedAt?: Date;
};

export async function finalizeOrderAsPaid(input: FinalizeOrderPaymentInput) {
  const order = await prisma.order.findUnique({
    where: { orderId: input.orderId },
  });

  if (!order) {
    return { ok: false as const, reason: "not_found" as const };
  }

  if (order.status === "paid") {
    return { ok: true as const, alreadyPaid: true as const, order, invoiceWarning: null };
  }

  const orderedItems = Array.isArray(order.products)
    ? (order.products as Array<{ productId?: string; quantity?: number }>)
    : [];

  const stockOps: Array<{ productId: string; quantity: number }> = orderedItems
    .map((item) => ({
      productId: String(item.productId || "").trim(),
      quantity: Math.max(1, Number(item.quantity || 1)),
    }))
    .filter((item) => item.productId);

  await prisma.$transaction(async (tx) => {
    for (const op of stockOps) {
      const decreased = await tx.product.updateMany({
        where: {
          id: op.productId,
          isAvailable: true,
          stockQuantity: { gte: op.quantity },
        },
        data: {
          stockQuantity: { decrement: op.quantity },
          updatedAt: new Date(),
        },
      });

      if (decreased.count === 0) {
        const p = await tx.product.findUnique({ where: { id: op.productId } });
        throw new Error(
          `Insufficient stock for ${p?.name || op.productId} during payment finalization`
        );
      }
    }

    for (const pid of stockOps.map((s) => s.productId)) {
      const p = await tx.product.findUnique({ where: { id: pid } });
      if (p && p.stockQuantity <= 0 && p.isAvailable) {
        await tx.product.update({
          where: { id: pid },
          data: { isAvailable: false, stockQuantity: 0, updatedAt: new Date() },
        });
      }
    }

    const statusHistory = Array.isArray(order.statusHistory)
      ? (order.statusHistory as Array<Record<string, unknown>>)
      : [];
    const nextStatusHistory = [
      ...statusHistory,
      {
        status: "paid",
        note: input.note || "Payment verified",
        by: input.by || "system",
        at: (input.verifiedAt || new Date()).toISOString(),
      },
    ];

    await tx.order.update({
      where: { orderId: input.orderId },
      data: {
        status: "paid",
        paymentId: input.paymentId,
        verifiedAt: input.verifiedAt || new Date(),
        statusHistory: nextStatusHistory as unknown as Prisma.InputJsonValue,
      },
    });
  });

  let invoiceWarning: string | null = null;
  try {
    await generateInternalInvoiceForOrder(input.orderId);
  } catch (error) {
    // Never fail payment finalization because downstream invoice generation failed.
    invoiceWarning = "Payment verified, but invoice generation or invoice email failed.";
    console.error("[order-payment] Internal invoice generation failed", {
      orderId: input.orderId,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return { ok: true as const, alreadyPaid: false as const, order, invoiceWarning };
}
