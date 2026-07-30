import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { put } from "@vercel/blob";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { prisma } from "@/app/lib/prisma";
import { sendInvoiceEmailForOrder } from "@/app/lib/invoice-email";
import { classifyInvoiceLineItem } from "@/app/lib/gst-classification";

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
  category?: string;
  brand?: string | null;
  quantity: number;
  unitPrice: number;
  grossAmount: number;
  hsnCode: string;
  gstRate: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
};

type InvoiceTotals = {
  grossAmount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  taxAmount: number;
};

type MerchantInvoiceParty = {
  name: string;
  email: string;
  phone?: string | null;
  gstin?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  address: string;
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

function formatAddress(party: MerchantInvoiceParty) {
  const parts = [
    String(party.addressLine1 || "").trim(),
    String(party.addressLine2 || "").trim(),
    [String(party.city || "").trim(), String(party.state || "").trim()]
      .filter(Boolean)
      .join(", "),
    String(party.zipCode || "").trim(),
  ].filter(Boolean);

  return parts.join(", ") || String(party.address || "").trim();
}

function normalizeState(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

async function toInvoiceLineItems(
  products: unknown,
  orderAmount: number,
  opts: { interstateSupply: boolean }
) {
  const snapshots = Array.isArray(products)
    ? (products as Array<{
        productId?: string;
        name?: string;
        description?: string;
        category?: string;
        brand?: string | null;
        quantity?: number;
        price?: number;
      }>)
    : [];

  const productIds = snapshots
    .map((item) => String(item.productId || "").trim())
    .filter(Boolean);
  const dbProducts = productIds.length
    ? await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, description: true, category: true, brand: true },
      })
    : [];
  const productMap = new Map(dbProducts.map((item) => [item.id, item]));

  const items = (
    await Promise.all(
      snapshots.map(async (item) => {
        const quantity = Math.max(1, Number(item.quantity || 1));
        const unitPrice = Math.max(0, Number(item.price || 0));
        const grossAmount = quantity * unitPrice;
        const productId = String(item.productId || "").trim();
        const dbProduct = productId ? productMap.get(productId) : null;
        const description = String(item.description || dbProduct?.description || "").trim();
        const category = String(item.category || dbProduct?.category || "").trim() || undefined;
        const brand = item.brand || dbProduct?.brand || undefined;
        const classification = await classifyInvoiceLineItem({
          name: String(item.name || "Order Item").trim() || "Order Item",
          description,
          category,
          brand,
        });
        const taxableAmount = Number(
          (grossAmount / (1 + classification.gstRate / 100)).toFixed(2)
        );
        const totalTax = Number((grossAmount - taxableAmount).toFixed(2));
        const cgstAmount = opts.interstateSupply ? 0 : Number((totalTax / 2).toFixed(2));
        const sgstAmount = opts.interstateSupply
          ? 0
          : Number((totalTax - cgstAmount).toFixed(2));
        const igstAmount = opts.interstateSupply ? totalTax : 0;
        return {
          name: String(item.name || "Order Item").trim() || "Order Item",
          description,
          category,
          brand,
          quantity,
          unitPrice,
          grossAmount,
          hsnCode: classification.hsnCode,
          gstRate: classification.gstRate,
          taxableAmount,
          cgstAmount,
          sgstAmount,
          igstAmount,
        } satisfies InvoiceLineItem;
      })
    )
  ).filter((item) => item.grossAmount > 0);

  if (items.length > 0) return items;

  const fallbackClassification = await classifyInvoiceLineItem({
    name: "Order total",
    description: "Auto-generated order line item",
    category: "General",
  });
  const taxableAmount = Number(
    (Math.max(0, Number(orderAmount || 0)) / (1 + fallbackClassification.gstRate / 100)).toFixed(2)
  );
  const totalTax = Number((Math.max(0, Number(orderAmount || 0)) - taxableAmount).toFixed(2));
  const fallback = [
    {
      name: "Order total",
      description: "Auto-generated order line item",
      quantity: 1,
      unitPrice: Math.max(0, Number(orderAmount || 0)),
      grossAmount: Math.max(0, Number(orderAmount || 0)),
      hsnCode: fallbackClassification.hsnCode,
      gstRate: fallbackClassification.gstRate,
      taxableAmount,
      cgstAmount: opts.interstateSupply ? 0 : Number((totalTax / 2).toFixed(2)),
      sgstAmount: opts.interstateSupply ? 0 : Number((totalTax - totalTax / 2).toFixed(2)),
      igstAmount: opts.interstateSupply ? totalTax : 0,
    },
  ] satisfies InvoiceLineItem[];
  return fallback;
}

function sumInvoiceTotals(items: InvoiceLineItem[]): InvoiceTotals {
  const grossAmount = items.reduce((sum, item) => sum + item.grossAmount, 0);
  const taxableAmount = items.reduce((sum, item) => sum + item.taxableAmount, 0);
  const cgstAmount = items.reduce((sum, item) => sum + item.cgstAmount, 0);
  const sgstAmount = items.reduce((sum, item) => sum + item.sgstAmount, 0);
  const igstAmount = items.reduce((sum, item) => sum + item.igstAmount, 0);
  const taxAmount = cgstAmount + sgstAmount + igstAmount;
  return {
    grossAmount: Number(grossAmount.toFixed(2)),
    taxableAmount: Number(taxableAmount.toFixed(2)),
    cgstAmount: Number(cgstAmount.toFixed(2)),
    sgstAmount: Number(sgstAmount.toFixed(2)),
    igstAmount: Number(igstAmount.toFixed(2)),
    taxAmount: Number(taxAmount.toFixed(2)),
  };
}

async function generateInvoicePdf(input: {
  invoiceNumber: string;
  merchant: MerchantInvoiceParty;
  customer: MerchantInvoiceParty;
  items: InvoiceLineItem[];
  totals: InvoiceTotals;
  currency: string;
  issuedAt: Date;
  placeOfSupply: string;
  interstateSupply: boolean;
}) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { height } = page.getSize();

  let y = height - 60;
  page.drawText("Tax Invoice", {
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
  page.drawText(`Supplier: ${input.merchant.name}`, {
    x: 40,
    y,
    size: 12,
    font: fontBold,
  });
  y -= 18;
  page.drawText(`Email: ${input.merchant.email}`, { x: 40, y, size: 11, font });
  y -= 18;
  page.drawText(
    `GSTIN: ${String(input.merchant.gstin || "").trim() || "Unregistered"}`,
    { x: 40, y, size: 11, font }
  );
  y -= 18;
  page.drawText(`Address: ${formatAddress(input.merchant).slice(0, 90)}`, {
    x: 40,
    y,
    size: 11,
    font,
  });

  y -= 30;
  page.drawText(`Recipient: ${input.customer.name}`, {
    x: 40,
    y,
    size: 12,
    font: fontBold,
  });
  y -= 18;
  page.drawText(`Email: ${input.customer.email}`, { x: 40, y, size: 11, font });
  y -= 18;
  page.drawText(`Phone: ${String(input.customer.phone || "").trim() || "-"}`, {
    x: 40,
    y,
    size: 11,
    font,
  });
  y -= 18;
  page.drawText(`Address: ${formatAddress(input.customer).slice(0, 90)}`, {
    x: 40,
    y,
    size: 11,
    font,
  });
  y -= 18;
  page.drawText(
    `Place of Supply: ${input.placeOfSupply} (${input.interstateSupply ? "Inter-state / IGST" : "Intra-state / CGST+SGST"})`,
    { x: 40, y, size: 10, font }
  );

  y -= 32;
  page.drawText("Items", { x: 40, y, size: 14, font: fontBold });
  y -= 20;
  page.drawText("Description", { x: 40, y, size: 10, font: fontBold });
  page.drawText("HSN", { x: 255, y, size: 10, font: fontBold });
  page.drawText("GST", { x: 315, y, size: 10, font: fontBold });
  page.drawText("Qty", { x: 360, y, size: 10, font: fontBold });
  page.drawText("Taxable", { x: 400, y, size: 10, font: fontBold });
  page.drawText("Total", { x: 500, y, size: 10, font: fontBold });
  y -= 14;

  for (const item of input.items) {
    page.drawText(item.name.slice(0, 32), { x: 40, y, size: 10, font });
    page.drawText(item.hsnCode, { x: 255, y, size: 10, font });
    page.drawText(`${item.gstRate}%`, { x: 315, y, size: 10, font });
    page.drawText(String(item.quantity), { x: 362, y, size: 10, font });
    page.drawText(formatCurrency(item.taxableAmount, input.currency), {
      x: 400,
      y,
      size: 10,
      font,
    });
    page.drawText(formatCurrency(item.grossAmount, input.currency), {
      x: 500,
      y,
      size: 10,
      font,
    });
    y -= 16;
    if (item.description) {
      page.drawText(item.description.slice(0, 90), {
        x: 52,
        y,
        size: 9,
        font,
        color: rgb(0.35, 0.35, 0.4),
      });
      y -= 14;
    }
    const taxLine = input.interstateSupply
      ? `IGST ${item.gstRate}%: ${formatCurrency(item.igstAmount, input.currency)}`
      : `CGST ${Number(item.gstRate / 2).toFixed(1)}%: ${formatCurrency(item.cgstAmount, input.currency)} | SGST ${Number(item.gstRate / 2).toFixed(1)}%: ${formatCurrency(item.sgstAmount, input.currency)}`;
    page.drawText(taxLine.slice(0, 90), {
      x: 52,
      y,
      size: 8,
      font,
      color: rgb(0.45, 0.45, 0.5),
    });
    y -= 12;
    if (y < 120) break;
  }

  y -= 16;
  page.drawText(`Taxable Amount: ${formatCurrency(input.totals.taxableAmount, input.currency)}`, {
    x: 40,
    y,
    size: 12,
    font,
  });
  y -= 18;
  if (input.interstateSupply) {
    page.drawText(`IGST: ${formatCurrency(input.totals.igstAmount, input.currency)}`, {
      x: 40,
      y,
      size: 12,
      font,
    });
  } else {
    page.drawText(`CGST: ${formatCurrency(input.totals.cgstAmount, input.currency)}`, {
      x: 40,
      y,
      size: 12,
      font,
    });
    y -= 18;
    page.drawText(`SGST: ${formatCurrency(input.totals.sgstAmount, input.currency)}`, {
      x: 40,
      y,
      size: 12,
      font,
    });
  }
  y -= 24;
  page.drawText(`Grand Total: ${formatCurrency(input.totals.grossAmount, input.currency)}`, {
    x: 40,
    y,
    size: 14,
    font: fontBold,
  });
  y -= 18;
  page.drawText("This invoice was generated internally by Rasphia with GST classification support.", {
    x: 40,
    y,
    size: 9,
    font,
    color: rgb(0.35, 0.35, 0.4),
  });

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
      phone: true,
      email: true,
      gstin: true,
      address: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      zipCode: true,
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
    address?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  const invoiceDate = order.verifiedAt || new Date();
  const interstateSupply =
    normalizeState(customer.state) !== "" &&
    normalizeState(merchant.state) !== "" &&
    normalizeState(customer.state) !== normalizeState(merchant.state);
  const invoiceItems = await toInvoiceLineItems(order.products, order.amount, {
    interstateSupply,
  });
  const invoiceTotals = sumInvoiceTotals(invoiceItems);
  const pdfBytes = await generateInvoicePdf({
    invoiceNumber,
    merchant: {
      name: merchant.name,
      email: merchant.email,
      phone: merchant.phone,
      gstin: merchant.gstin,
      addressLine1: merchant.addressLine1,
      addressLine2: merchant.addressLine2,
      city: merchant.city,
      state: merchant.state,
      zipCode: merchant.zipCode,
      address: merchant.address,
    },
    customer: {
      name: String(customer.name || "Customer").trim() || "Customer",
      email: String(customer.email || "").trim(),
      phone: String(customer.phone || "").trim(),
      addressLine1: String(customer.addressLine1 || "").trim(),
      addressLine2: String(customer.addressLine2 || "").trim(),
      city: String(customer.city || "").trim(),
      state: String(customer.state || "").trim(),
      zipCode: String(customer.zipCode || "").trim(),
      address: String(customer.address || "").trim(),
    },
    items: invoiceItems,
    totals: invoiceTotals,
    currency: order.currency || "INR",
    issuedAt: invoiceDate,
    placeOfSupply:
      String(customer.state || "").trim() || String(merchant.state || "").trim() || "India",
    interstateSupply,
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
