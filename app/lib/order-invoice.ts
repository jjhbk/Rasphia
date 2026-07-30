import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { put } from "@vercel/blob";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { prisma } from "@/app/lib/prisma";
import { sendInvoiceEmailForOrder } from "@/app/lib/invoice-email";

function buildInvoiceNumber(slug: string, sequence: number) {
  const safeSlug = String(slug || "merchant")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 20) || "merchant";
  return `INV-${safeSlug}-${String(sequence).padStart(4, "0")}`;
}

type InvoiceLineItem = {
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

function formatCurrency(amount: number, currency = "INR") {
  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

  // pdf-lib's built-in WinAnsi fonts cannot encode the rupee symbol.
  return formatted.replace(/\u20B9/g, "Rs ");
}

function toInvoiceLineItems(products: unknown, orderAmount: number) {
  const snapshots = Array.isArray(products)
    ? (products as Array<{
        name?: string;
        description?: string;
        quantity?: number;
        price?: number;
      }>)
    : [];

  const items = snapshots
    .map((item) => {
      const quantity = Math.max(1, Number(item.quantity || 1));
      const unitPrice = Math.max(0, Number(item.price || 0));
      return {
        name: String(item.name || "Order Item").trim() || "Order Item",
        description: String(item.description || "").trim(),
        quantity,
        unitPrice,
        totalPrice: quantity * unitPrice,
      } satisfies InvoiceLineItem;
    })
    .filter((item) => item.totalPrice > 0);

  if (items.length > 0) return items;

  return [
    {
      name: "Order total",
      description: "Auto-generated order line item",
      quantity: 1,
      unitPrice: Math.max(0, Number(orderAmount || 0)),
      totalPrice: Math.max(0, Number(orderAmount || 0)),
    },
  ] satisfies InvoiceLineItem[];
}

async function generateInvoicePdf(input: {
  invoiceNumber: string;
  merchantName: string;
  merchantEmail: string;
  merchantAddress: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: InvoiceLineItem[];
  totalAmount: number;
  currency: string;
  issuedAt: Date;
}) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { height } = page.getSize();

  let y = height - 60;
  page.drawText("Rasphia Invoice", {
    x: 40,
    y,
    size: 24,
    font: fontBold,
    color: rgb(0.12, 0.12, 0.16),
  });
  y -= 28;
  page.drawText(input.invoiceNumber, { x: 40, y, size: 12, font });
  y -= 18;
  page.drawText(`Issued: ${input.issuedAt.toLocaleString("en-IN")}`, {
    x: 40,
    y,
    size: 10,
    font,
  });

  y -= 34;
  page.drawText(`Merchant: ${input.merchantName}`, {
    x: 40,
    y,
    size: 12,
    font: fontBold,
  });
  y -= 18;
  page.drawText(`Email: ${input.merchantEmail}`, { x: 40, y, size: 11, font });
  y -= 18;
  page.drawText(`Address: ${input.merchantAddress}`, { x: 40, y, size: 11, font });

  y -= 30;
  page.drawText(`Customer: ${input.customerName}`, {
    x: 40,
    y,
    size: 12,
    font: fontBold,
  });
  y -= 18;
  page.drawText(`Email: ${input.customerEmail}`, { x: 40, y, size: 11, font });
  y -= 18;
  page.drawText(`Phone: ${input.customerPhone}`, { x: 40, y, size: 11, font });

  y -= 32;
  page.drawText("Items", { x: 40, y, size: 14, font: fontBold });
  y -= 20;

  for (const item of input.items) {
    page.drawText(
      `${item.name} x${item.quantity} - ${formatCurrency(item.totalPrice, input.currency)}`,
      { x: 44, y, size: 11, font }
    );
    y -= 16;
    if (item.description) {
      page.drawText(item.description.slice(0, 90), {
        x: 56,
        y,
        size: 9,
        font,
        color: rgb(0.35, 0.35, 0.4),
      });
      y -= 14;
    }
    if (y < 120) break;
  }

  y -= 16;
  page.drawText(
    `Total: ${formatCurrency(input.totalAmount, input.currency)}`,
    { x: 40, y, size: 14, font: fontBold }
  );

  return Buffer.from(await pdf.save());
}

async function uploadInvoicePdfToBlob(input: {
  merchantId: string;
  invoiceNumber: string;
  pdfBytes: Buffer;
}) {
  const filename = `${input.invoiceNumber}.pdf`;
  const blob = await put(`invoices/${input.merchantId}/${filename}`, input.pdfBytes, {
    access: "public",
    contentType: "application/pdf",
    addRandomSuffix: false,
  });
  return blob.url;
}

export async function generateInternalInvoiceForOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { orderId },
    select: {
      id: true,
      orderId: true,
      merchantId: true,
      amount: true,
      currency: true,
      verifiedAt: true,
      invoiceNumber: true,
      statusHistory: true,
      customer: true,
      products: true,
    },
  });

  if (!order || !order.merchantId) return;
  if (order.invoiceNumber) return;

  const merchant = await prisma.merchant.findUnique({
    where: { id: order.merchantId },
    select: {
      id: true,
      slug: true,
      name: true,
      email: true,
      address: true,
    },
  });

  if (!merchant) return;

  const existingInvoiceCount = await prisma.order.count({
    where: {
      merchantId: merchant.id,
      invoiceNumber: { not: null },
    },
  });

  const invoiceNumber = buildInvoiceNumber(merchant.slug, existingInvoiceCount + 1);
  const invoiceId = randomUUID();
  const customer = (order.customer || {}) as {
    name?: string;
    email?: string;
    phone?: string;
  };
  const invoiceDate = order.verifiedAt || new Date();
  const invoiceItems = toInvoiceLineItems(order.products, order.amount);
  const pdfBytes = await generateInvoicePdf({
    invoiceNumber,
    merchantName: merchant.name,
    merchantEmail: merchant.email,
    merchantAddress: merchant.address,
    customerName: String(customer.name || "Customer").trim() || "Customer",
    customerEmail: String(customer.email || "").trim(),
    customerPhone: String(customer.phone || "").trim(),
    items: invoiceItems,
    totalAmount: Number(order.amount || 0),
    currency: order.currency || "INR",
    issuedAt: invoiceDate,
  });
  const invoicePdfUrl = await uploadInvoicePdfToBlob({
    merchantId: merchant.id,
    invoiceNumber,
    pdfBytes,
  });

  const statusHistory = Array.isArray(order.statusHistory)
    ? (order.statusHistory as Array<Record<string, unknown>>)
    : [];
  const nextStatusHistory = [
    ...statusHistory,
    {
      status: "invoice_generated",
      note: `Internal invoice generated (${invoiceNumber})`,
      by: "internal_invoice",
      at: new Date().toISOString(),
    },
  ];

  await prisma.order.update({
    where: { id: order.id },
    data: {
      invoiceId,
      invoiceNumber,
      invoicePdfUrl,
      invoiceGeneratedAt: order.verifiedAt || new Date(),
      invoiceSyncStatus: "generated_internal",
      invoiceSyncError: null,
      invoiceSyncedAt: new Date(),
      statusHistory: nextStatusHistory as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
  });

  try {
    await sendInvoiceEmailForOrder(order.orderId, {
      attachment: {
        filename: `${invoiceNumber}.pdf`,
        content: pdfBytes,
      },
    });
  } catch (error) {
    console.error("[order-invoice] Invoice email send failed", {
      orderId: order.orderId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export type MerchantInvoiceSummary = {
  invoice_id: string | null;
  merchant_id: string;
  invoice_number: string | null;
  customer_name: string;
  customer_email: string;
  total_amount_paise: number;
  pdf_url: string | null;
  created_at: string;
  email_sent_at: string | null;
  order_id: string;
};

export async function listMerchantInternalInvoices(input: {
  merchantId: string;
  since?: Date;
  limit?: number;
}) {
  const orders = await prisma.order.findMany({
    where: {
      merchantId: input.merchantId,
      invoiceNumber: { not: null },
      ...(input.since ? { invoiceGeneratedAt: { gt: input.since } } : {}),
    },
    orderBy: { invoiceGeneratedAt: "desc" },
    take: Math.min(Math.max(input.limit || 100, 1), 200),
    select: {
      orderId: true,
      merchantId: true,
      invoiceId: true,
      invoiceNumber: true,
      invoicePdfUrl: true,
      invoiceGeneratedAt: true,
      amount: true,
      customer: true,
      statusHistory: true,
    },
  });

  return orders.map((order) => {
    const customer = (order.customer || {}) as {
      name?: string;
      email?: string;
    };
    const statusHistory = Array.isArray(order.statusHistory)
      ? (order.statusHistory as Array<Record<string, unknown>>)
      : [];
    const lastEmailEvent = [...statusHistory]
      .reverse()
      .find((entry) => String(entry.status || "").trim() === "invoice_emailed");
    return {
      invoice_id: order.invoiceId || null,
      merchant_id: String(order.merchantId || ""),
      invoice_number: order.invoiceNumber || null,
      customer_name: String(customer.name || "Customer"),
      customer_email: String(customer.email || ""),
      total_amount_paise: Math.round(Number(order.amount || 0) * 100),
      pdf_url: order.invoicePdfUrl || null,
      created_at: (order.invoiceGeneratedAt || new Date()).toISOString(),
      email_sent_at:
        typeof lastEmailEvent?.at === "string" ? String(lastEmailEvent.at) : null,
      order_id: order.orderId,
    } satisfies MerchantInvoiceSummary;
  });
}

export async function getMerchantInternalInvoiceDashboard(merchantId: string) {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const yearStart = new Date(now);
  yearStart.setMonth(0, 1);
  yearStart.setHours(0, 0, 0, 0);

  const [merchant, todayOrders, ytdOrders, recentInvoices] = await Promise.all([
    prisma.merchant.findUnique({
      where: { id: merchantId },
      select: {
        id: true,
        slug: true,
        name: true,
        email: true,
        address: true,
      },
    }),
    prisma.order.findMany({
      where: {
        merchantId,
        invoiceNumber: { not: null },
        invoiceGeneratedAt: { gte: todayStart },
      },
      select: { amount: true },
    }),
    prisma.order.findMany({
      where: {
        merchantId,
        invoiceNumber: { not: null },
        invoiceGeneratedAt: { gte: yearStart },
      },
      select: { amount: true },
    }),
    listMerchantInternalInvoices({ merchantId, limit: 50 }),
  ]);

  const todayRevenue = todayOrders.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const ytdRevenue = ytdOrders.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const threshold = 4000000;
  const thresholdPercentage = threshold > 0 ? (ytdRevenue / threshold) * 100 : 0;
  const monthsElapsed = (Date.now() - yearStart.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
  const monthlyRate = monthsElapsed > 0 ? ytdRevenue / monthsElapsed : 0;
  const monthsToThreshold =
    monthlyRate > 0 && ytdRevenue < threshold
      ? (threshold - ytdRevenue) / monthlyRate
      : ytdRevenue >= threshold
      ? 0
      : null;

  return {
    merchant,
    today_revenue: todayRevenue,
    today_count: todayOrders.length,
    ytd_revenue: ytdRevenue,
    threshold_percentage: thresholdPercentage,
    months_to_threshold: monthsToThreshold,
    recent_invoices: recentInvoices,
  };
}
