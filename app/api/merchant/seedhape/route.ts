import { NextRequest, NextResponse } from "next/server";
import { getManagementAccessFromRequest } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import {
  ensureMerchantSeedhapeDefaults,
  generateRandomSecret,
  getMerchantSeedhapePublicSummary,
  setMerchantSeedhapeConfig,
} from "@/app/lib/merchant-seedhape";

async function resolveMerchantId(req: NextRequest, body?: Record<string, unknown>) {
  const access = await getManagementAccessFromRequest(req);
  const merchantIdParam =
    access.role === "admin"
      ? String(
          req.nextUrl.searchParams.get("merchantId") ||
            body?.merchantId ||
            ""
        ).trim()
      : "";

  const merchant = await prisma.merchant.findFirst({
    where:
      access.role === "admin" && merchantIdParam
        ? { id: merchantIdParam }
        : { email: access.email },
    select: { id: true },
  });
  if (!merchant) throw new Error("Merchant profile not found");
  return merchant.id;
}

export async function GET(req: NextRequest) {
  try {
    const merchantId = await resolveMerchantId(req);
    const ensured = await ensureMerchantSeedhapeDefaults(merchantId);
    const summary = await getMerchantSeedhapePublicSummary(merchantId);
    const webhookUrl = `${req.nextUrl.origin}/api/seedhape-webhook?merchantId=${encodeURIComponent(
      merchantId
    )}`;

    return NextResponse.json(
      {
        seedhape: {
          ...summary,
          baseUrl: summary.baseUrl || ensured.baseUrl,
          generatedWebhookSecret: ensured.webhookSecret || null,
          webhookUrl,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to load SeedhaPe settings";
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
    await ensureMerchantSeedhapeDefaults(merchantId);

    const rotateWebhookSecret = Boolean(body.rotateWebhookSecret);
    const rotatedWebhookSecret = rotateWebhookSecret
      ? generateRandomSecret(32)
      : null;

    await setMerchantSeedhapeConfig({
      merchantId,
      apiKey:
        body.seedhapeApiKey !== undefined
          ? String(body.seedhapeApiKey || "")
          : undefined,
      webhookSecret: rotateWebhookSecret
        ? String(rotatedWebhookSecret || "")
        : body.seedhapeWebhookSecret !== undefined
        ? String(body.seedhapeWebhookSecret || "")
        : undefined,
    });

    const summary = await getMerchantSeedhapePublicSummary(merchantId);
    const webhookUrl = `${req.nextUrl.origin}/api/seedhape-webhook?merchantId=${encodeURIComponent(
      merchantId
    )}`;

    return NextResponse.json(
      {
        seedhape: { ...summary, webhookUrl },
        rotated: {
          webhookSecret: rotateWebhookSecret,
          generatedWebhookSecret: rotatedWebhookSecret,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update SeedhaPe settings";
    if (message.startsWith("Unauthorized") || message.startsWith("Forbidden")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
