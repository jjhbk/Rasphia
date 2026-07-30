import { NextRequest, NextResponse } from "next/server";
import { getManagementAccessFromRequest } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import {
  getMerchantRazorpayPublicSummary,
  setMerchantRazorpayConfig,
} from "@/app/lib/merchant-razorpay";

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
    const summary = await getMerchantRazorpayPublicSummary(merchantId);
    return NextResponse.json({ razorpay: summary }, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to load Razorpay settings";
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

    const preferredRaw =
      body.preferredPaymentProvider !== undefined
        ? String(body.preferredPaymentProvider || "").trim().toLowerCase()
        : undefined;
    const preferredPaymentProvider =
      preferredRaw === undefined
        ? undefined
        : preferredRaw === ""
        ? null
        : preferredRaw === "seedhape" || preferredRaw === "razorpay"
        ? preferredRaw
        : (() => {
            throw new Error("Preferred payment provider must be seedhape or razorpay.");
          })();

    await setMerchantRazorpayConfig({
      merchantId,
      keyId:
        body.razorpayKeyId !== undefined
          ? String(body.razorpayKeyId || "")
          : undefined,
      keySecret:
        body.razorpayKeySecret !== undefined
          ? String(body.razorpayKeySecret || "")
          : undefined,
      preferredPaymentProvider,
    });

    const summary = await getMerchantRazorpayPublicSummary(merchantId);
    return NextResponse.json({ razorpay: summary }, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update Razorpay settings";
    if (message.startsWith("Unauthorized") || message.startsWith("Forbidden")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
