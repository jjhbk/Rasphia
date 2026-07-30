import { NextRequest, NextResponse } from "next/server";
import { getManagementAccessFromRequest } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import {
  ensureMerchantBahiDefaults,
  generateRandomSecret,
  getMerchantBahiConfig,
  getMerchantBahiPublicSummary,
  setMerchantBahiConfig,
} from "@/app/lib/merchant-bahi";
import { listBahiInvoices } from "@/app/lib/bahi";

async function resolveMerchantId(req: NextRequest, body?: Record<string, unknown>) {
  const access = await getManagementAccessFromRequest(req);
  const merchantIdParam =
    access.role === "admin"
      ? String(req.nextUrl.searchParams.get("merchantId") || body?.merchantId || "").trim()
      : "";

  const merchant = await prisma.merchant.findFirst({
    where:
      access.role === "admin" && merchantIdParam
        ? { id: merchantIdParam }
        : access.merchantId
        ? { id: access.merchantId }
        : { email: { equals: access.email, mode: "insensitive" } },
    select: { id: true },
  });

  if (!merchant) throw new Error("Merchant profile not found");
  return merchant.id;
}

export async function GET(req: NextRequest) {
  try {
    const merchantId = await resolveMerchantId(req);
    const ensured = await ensureMerchantBahiDefaults(merchantId);
    const summary = await getMerchantBahiPublicSummary(merchantId);

    const recentTracked = await prisma.order.count({
      where: {
        merchantId,
        invoiceNumber: { not: null },
      },
    });

    return NextResponse.json(
      {
        bahi: {
          ...summary,
          generatedWebhookSecret: ensured.webhookSecret || null,
          trackedInvoiceCount: recentTracked,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load Bahi settings";
    if (message.startsWith("Unauthorized") || message.startsWith("Forbidden")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const merchantId = await resolveMerchantId(req, body);
    await ensureMerchantBahiDefaults(merchantId);

    const rotateWebhookSecret = Boolean(body.rotateWebhookSecret);
    const rotatedWebhookSecret = rotateWebhookSecret ? generateRandomSecret(32) : null;

    await setMerchantBahiConfig({
      merchantId,
      apiKey:
        body.bahiApiKey !== undefined ? String(body.bahiApiKey || "") : undefined,
      webhookSecret: rotateWebhookSecret
        ? String(rotatedWebhookSecret || "")
        : body.bahiWebhookSecret !== undefined
        ? String(body.bahiWebhookSecret || "")
        : undefined,
      bahiMerchantId:
        body.bahiMerchantId !== undefined ? String(body.bahiMerchantId || "") : undefined,
      bahiUpiId: body.bahiUpiId !== undefined ? String(body.bahiUpiId || "") : undefined,
      baseUrl: body.bahiBaseUrl !== undefined ? String(body.bahiBaseUrl || "") : undefined,
      autoReceiptEnabled:
        body.autoReceiptEnabled !== undefined ? Boolean(body.autoReceiptEnabled) : undefined,
    });

    const summary = await getMerchantBahiPublicSummary(merchantId);

    return NextResponse.json(
      {
        bahi: summary,
        rotated: {
          webhookSecret: rotateWebhookSecret,
          generatedWebhookSecret: rotatedWebhookSecret,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update Bahi settings";
    if (message.startsWith("Unauthorized") || message.startsWith("Forbidden")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const merchantId = await resolveMerchantId(req, body);
    const config = await getMerchantBahiConfig(merchantId);

    const sinceHours = Math.max(1, Number(body.sinceHours || 168));
    const sinceIso = new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString();

    const invoices = await listBahiInvoices({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      merchantId: config.bahiMerchantId,
      since: sinceIso,
    });

    let matchedOrders = 0;
    let updatedOrders = 0;

    for (const invoice of invoices) {
      const providerOrderId = String(invoice.seedhape_order_id || "").trim();
      if (!providerOrderId) continue;

      const existing = await prisma.order.findFirst({
        where: { merchantId, orderId: providerOrderId },
        select: { id: true, invoiceNumber: true, invoicePdfUrl: true },
      });

      if (!existing) continue;
      matchedOrders += 1;

      const nextNumber = String(invoice.invoice_number || "").trim() || null;
      const nextPdf = String(invoice.pdf_url || "").trim() || null;
      const changed = existing.invoiceNumber !== nextNumber || existing.invoicePdfUrl !== nextPdf;

      await prisma.order.update({
        where: { id: existing.id },
        data: {
          invoiceId: String(invoice.invoice_id || "").trim() || null,
          invoiceNumber: nextNumber,
          invoicePdfUrl: nextPdf,
          invoiceGeneratedAt: invoice.created_at ? new Date(invoice.created_at) : null,
          invoiceSyncedAt: new Date(),
          invoiceSyncStatus: "tracked",
          invoiceSyncError: null,
          updatedAt: new Date(),
        },
      });

      if (changed) updatedOrders += 1;
    }

    return NextResponse.json(
      {
        ok: true,
        tracked: {
          fetchedInvoices: invoices.length,
          matchedOrders,
          updatedOrders,
          since: sinceIso,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to sync Bahi invoice tracking";
    if (message.startsWith("Unauthorized") || message.startsWith("Forbidden")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
