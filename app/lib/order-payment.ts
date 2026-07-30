import { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/prisma";
import { generateInternalInvoiceForOrder } from "@/app/lib/order-invoice";
import { sendText } from "@/app/lib/whatsapp";

type FinalizeOrderPaymentInput = {
  orderId: string;
  paymentId: string;
  by?: string;
  note?: string;
  verifiedAt?: Date;
};

function readOrderCustomer(customer: unknown) {
  return customer && typeof customer === "object" && !Array.isArray(customer)
    ? (customer as Record<string, unknown>)
    : {};
}

function normalizeWhatsAppPhone(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length < 10 || digits.length > 15) return "";
  return digits;
}

async function sendWhatsAppPaymentConfirmation(input: {
  order: {
    id: string;
    orderId: string;
    amount: number;
    currency: string;
    customer: unknown;
    products: unknown;
    verifiedAt: Date | null;
    invoiceNumber: string | null;
    invoicePdfUrl: string | null;
  };
  invoiceWarning: string | null;
}) {
  const customer = readOrderCustomer(input.order.customer);
  if (String(customer.channel || "").trim().toLowerCase() !== "whatsapp") {
    return;
  }

  const phone = normalizeWhatsAppPhone(customer.phone);
  if (!phone) return;

  const items = Array.isArray(input.order.products)
    ? (input.order.products as Array<{ name?: string; quantity?: number }>)
    : [];
  const itemSummary = items
    .slice(0, 3)
    .map((item) => `${String(item.name || "Item")} x${Math.max(1, Number(item.quantity || 1))}`)
    .join(", ");

  const amount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: input.order.currency || "INR",
    minimumFractionDigits: 0,
  }).format(Number(input.order.amount || 0));

  const lines = [
    `Payment confirmed for order ${input.order.id}.`,
    `Amount: ${amount}`,
    ...(itemSummary ? [`Items: ${itemSummary}`] : []),
    input.order.verifiedAt
      ? `Verified at: ${new Date(input.order.verifiedAt).toLocaleString("en-IN")}`
      : "",
    input.invoiceWarning
      ? "Invoice status: generation or email failed. Please contact support if needed."
      : input.order.invoiceNumber
      ? `Invoice status: generated (${input.order.invoiceNumber})`
      : "Invoice status: processing.",
    input.order.invoicePdfUrl ? input.order.invoicePdfUrl : "",
  ].filter(Boolean);

  await sendText(phone, lines.join("\n"));
}

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

  try {
    const latestOrder = await prisma.order.findUnique({
      where: { orderId: input.orderId },
      select: {
        id: true,
        orderId: true,
        amount: true,
        currency: true,
        customer: true,
        products: true,
        verifiedAt: true,
        invoiceNumber: true,
        invoicePdfUrl: true,
      },
    });
    if (latestOrder) {
      await sendWhatsAppPaymentConfirmation({
        order: latestOrder,
        invoiceWarning,
      });
    }
  } catch (error) {
    console.error("[order-payment] WhatsApp payment confirmation failed", {
      orderId: input.orderId,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return { ok: true as const, alreadyPaid: false as const, order, invoiceWarning };
}
