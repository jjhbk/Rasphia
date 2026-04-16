import { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/prisma";
import { generateBahiInvoice, type BahiWebhookLineItem } from "@/app/lib/bahi";
import { getMerchantBahiConfig } from "@/app/lib/merchant-bahi";

type OrderProductSnapshot = {
  name?: string;
  description?: string;
  quantity?: number;
  price?: number;
};

type OrderCustomerSnapshot = {
  name?: string;
  email?: string;
  phone?: string;
};

function toPaise(value: number) {
  return Math.max(1, Math.round(Math.max(0, Number(value || 0)) * 100));
}

function normalizePhone(phoneRaw: string) {
  const raw = String(phoneRaw || "").trim();
  if (/^\+[0-9]{10,15}$/.test(raw)) return raw;

  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }

  return "+10000000000";
}

function buildLineItems(order: {
  products: unknown;
  amount: number;
}): BahiWebhookLineItem[] {
  const snapshots = Array.isArray(order.products)
    ? (order.products as Array<OrderProductSnapshot>)
    : [];

  const items = snapshots
    .map((p) => {
      const quantity = Math.max(1, Number(p.quantity || 1));
      const unit = Number(p.price || 0);
      return {
        name: String(p.name || "Order Item").trim() || "Order Item",
        description: String(p.description || "").trim(),
        quantity,
        unit_price_paise: toPaise(unit || order.amount / quantity),
      };
    })
    .filter((item) => item.name && item.quantity > 0 && item.unit_price_paise > 0);

  if (items.length > 0) return items;

  return [
    {
      name: "Order total",
      description: "Auto-generated order line item",
      quantity: 1,
      unit_price_paise: toPaise(order.amount),
    },
  ];
}

export async function syncOrderInvoiceWithBahi(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { orderId },
    select: {
      id: true,
      orderId: true,
      merchantId: true,
      amount: true,
      verifiedAt: true,
      customer: true,
      products: true,
      invoiceNumber: true,
      statusHistory: true,
    },
  });

  if (!order || !order.merchantId) return;
  if (order.invoiceNumber) return;

  const merchant = await prisma.merchant.findUnique({
    where: { id: order.merchantId },
    select: {
      id: true,
      name: true,
      email: true,
      address: true,
      bahiAutoReceiptEnabled: true,
    },
  });

  if (!merchant || !merchant.bahiAutoReceiptEnabled) return;

  const config = await getMerchantBahiConfig(merchant.id);

  const customer = (order.customer || {}) as OrderCustomerSnapshot;
  const customerName = String(customer.name || "Customer").trim() || "Customer";
  const customerEmail =
    String(customer.email || "").trim() || `${order.orderId}@example.com`;
  const customerPhone = normalizePhone(String(customer.phone || ""));

  const totalAmountPaise = toPaise(order.amount);

  try {
    const result = await generateBahiInvoice({
      baseUrl: config.baseUrl,
      webhookSecret: config.webhookSecret,
      payload: {
        event_type: "order.completed",
        timestamp: new Date().toISOString(),
        order_id: order.orderId,
        total_amount_paise: totalAmountPaise,
        payment_timestamp: (order.verifiedAt || new Date()).toISOString(),
        merchant: {
          merchant_id: config.bahiMerchantId,
          business_name: merchant.name,
          gstin: null,
          upi_id: config.bahiUpiId,
          address: merchant.address,
          email: merchant.email,
        },
        customer: {
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
        },
        line_items: buildLineItems({ products: order.products, amount: order.amount }),
      },
    });

    const statusHistory = Array.isArray(order.statusHistory)
      ? (order.statusHistory as Array<Record<string, unknown>>)
      : [];
    const nextStatusHistory = [
      ...statusHistory,
      {
        status: "invoice_generated",
        note: `Bahi invoice generated${
          result.data.invoice_number ? ` (${result.data.invoice_number})` : ""
        }`,
        by: "bahi_sync",
        at: new Date().toISOString(),
      },
    ];

    await prisma.order.update({
      where: { id: order.id },
      data: {
        invoiceId: String(result.data.invoice_id || "").trim() || null,
        invoiceNumber: String(result.data.invoice_number || "").trim() || null,
        invoicePdfUrl: String(result.data.pdf_url || "").trim() || null,
        invoiceGeneratedAt: new Date(),
        invoiceSyncStatus: result.statusCode === 409 ? "duplicate" : "generated",
        invoiceSyncError: null,
        invoiceSyncedAt: new Date(),
        statusHistory: nextStatusHistory as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Bahi invoice sync failed";
    await prisma.order.update({
      where: { id: order.id },
      data: {
        invoiceSyncStatus: "failed",
        invoiceSyncError: message.slice(0, 400),
        invoiceSyncedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }
}
