import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { decryptSecret } from "@/app/lib/secret-crypto";
import { finalizeOrderAsPaid } from "@/app/lib/order-payment";
import { isSeedhapePaidStatus, type SeedhapeOrderStatus } from "@/app/lib/seedhape";

function safeEqualString(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function verifySignature(raw: string, secret: string, signature: string) {
  const digest = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  return safeEqualString(digest, signature.trim());
}

function pickOrderInfo(payload: any) {
  const data = payload?.data || payload?.order || {};
  const orderId = String(
    data.id || data.orderId || payload?.orderId || payload?.id || ""
  ).trim();
  const status = String(data.status || payload?.status || "").trim().toUpperCase();
  const paymentId = String(
    data.paymentId ||
      data.transactionId ||
      payload?.paymentId ||
      payload?.transactionId ||
      ""
  ).trim();
  const merchantId = String(
    data?.metadata?.merchantId ||
      payload?.metadata?.merchantId ||
      payload?.merchantId ||
      ""
  ).trim();
  const eventType = String(payload?.event || payload?.type || "")
    .trim()
    .toLowerCase();

  return {
    orderId,
    merchantId,
    status: status as SeedhapeOrderStatus,
    paymentId,
    eventType,
  };
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    const signature = String(req.headers.get("x-seedhape-signature") || "").trim();
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    const payload = raw ? JSON.parse(raw) : {};
    const { orderId, merchantId: merchantFromPayload, status, paymentId, eventType } =
      pickOrderInfo(payload);

    const order = orderId
      ? await prisma.order.findUnique({
          where: { orderId },
          select: {
            orderId: true,
            merchantId: true,
            paymentId: true,
          },
        })
      : null;

    const merchantId = String(order?.merchantId || merchantFromPayload || "").trim();
    if (!merchantId) {
      return NextResponse.json({ ok: true, ignored: "missing_merchant" }, { status: 200 });
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { seedhapeWebhookSecretEncrypted: true },
    });
    if (!merchant) {
      return NextResponse.json({ ok: true, ignored: "merchant_not_found" }, { status: 200 });
    }

    const secret = decryptSecret(merchant.seedhapeWebhookSecretEncrypted);
    if (!secret || !verifySignature(raw, secret, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    if (!orderId) {
      return NextResponse.json({ ok: true, ignored: "missing_order_id" }, { status: 200 });
    }
    if (!order) {
      return NextResponse.json({ ok: true, ignored: "order_not_found" }, { status: 200 });
    }

    if (
      isSeedhapePaidStatus(status) ||
      eventType.includes("verified") ||
      eventType.includes("resolved")
    ) {
      await finalizeOrderAsPaid({
        orderId,
        paymentId: paymentId || order.paymentId || `seedhape_${orderId}`,
        by: "seedhape_webhook",
        note: `SeedhaPe webhook ${eventType || status.toLowerCase()}`,
      });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "SeedhaPe webhook processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
