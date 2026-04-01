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

function normalizeSignature(value: string) {
  return String(value || "")
    .trim()
    .replace(/^sha256=/i, "")
    .trim();
}

function verifySignature(raw: string, secret: string, signature: string) {
  const normalized = normalizeSignature(signature);
  if (!normalized) return false;

  const hmac = crypto.createHmac("sha256", secret).update(raw);
  const digestHex = hmac.digest("hex");
  const digestBase64 = crypto
    .createHmac("sha256", secret)
    .update(raw)
    .digest("base64");

  return (
    safeEqualString(digestHex, normalized) ||
    safeEqualString(digestBase64, normalized)
  );
}

function getSignature(req: NextRequest) {
  const candidates = [
    req.headers.get("x-seedhape-signature"),
    req.headers.get("x-signature"),
    req.headers.get("x-webhook-signature"),
    req.headers.get("x-seedhape-hmac-sha256"),
  ];
  return candidates.find((v) => String(v || "").trim().length > 0)?.trim() || "";
}

function getGlobalWebhookSecrets() {
  const candidates = [
    process.env.SEEDHAPE_WEBHOOK_SECRET,
    process.env.WEBHOOK_SIGNING_SECRET,
  ];
  return candidates
    .map((v) => String(v || "").trim())
    .filter((v) => v.length > 0);
}

function safeDecryptSecret(payload: string | null | undefined) {
  try {
    return decryptSecret(payload);
  } catch {
    return "";
  }
}

async function resolveCandidateSecrets(input: {
  merchantId?: string;
  includeAllMerchants?: boolean;
}) {
  const secrets = new Set<string>();

  for (const globalSecret of getGlobalWebhookSecrets()) {
    if (globalSecret) secrets.add(globalSecret);
  }

  if (input.merchantId) {
    const merchant = await prisma.merchant.findUnique({
      where: { id: input.merchantId },
      select: { seedhapeWebhookSecretEncrypted: true },
    });
    const secret = safeDecryptSecret(merchant?.seedhapeWebhookSecretEncrypted);
    if (secret) secrets.add(secret);
    return Array.from(secrets);
  }

  if (input.includeAllMerchants) {
    const merchants = await prisma.merchant.findMany({
      where: { seedhapeWebhookSecretEncrypted: { not: null } },
      select: { seedhapeWebhookSecretEncrypted: true },
    });
    for (const merchant of merchants) {
      const secret = safeDecryptSecret(merchant.seedhapeWebhookSecretEncrypted);
      if (secret) secrets.add(secret);
    }
  }

  return Array.from(secrets);
}

function verifyAgainstCandidates(raw: string, signature: string, secrets: string[]) {
  for (const secret of secrets) {
    if (verifySignature(raw, secret, signature)) return true;
  }
  return false;
}

function pickOrderInfo(payload: any) {
  const data = payload?.data || payload?.order || {};
  const orderId = String(
    data.id || data.orderId || payload?.orderId || payload?.id || ""
  ).trim();
  const externalOrderId = String(
    data.externalOrderId ||
      data.referenceId ||
      payload?.externalOrderId ||
      payload?.referenceId ||
      ""
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
    externalOrderId,
    merchantId,
    status: status as SeedhapeOrderStatus,
    paymentId,
    eventType,
  };
}

async function resolveWebhookOrder(input: {
  orderId: string;
  externalOrderId: string;
}) {
  if (input.orderId) {
    const byOrderId = await prisma.order.findUnique({
      where: { orderId: input.orderId },
      select: { orderId: true, merchantId: true, paymentId: true, receipt: true },
    });
    if (byOrderId) return byOrderId;
  }

  if (input.externalOrderId) {
    const byExternal = await prisma.order.findFirst({
      where: {
        OR: [{ id: input.externalOrderId }, { receipt: input.externalOrderId }],
      },
      orderBy: { createdAt: "desc" },
      select: { orderId: true, merchantId: true, paymentId: true, receipt: true },
    });
    if (byExternal) return byExternal;
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    const signature = getSignature(req);
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    const payload = raw ? JSON.parse(raw) : {};
    const merchantFromQuery = String(
      req.nextUrl.searchParams.get("merchantId") || ""
    ).trim();
    const merchantFromHeader = String(
      req.headers.get("x-seedhape-merchant-id") ||
        req.headers.get("x-merchant-id") ||
        ""
    ).trim();
    const {
      orderId,
      externalOrderId,
      merchantId: merchantFromPayload,
      status,
      paymentId,
      eventType,
    } = pickOrderInfo(payload);

    const order = await resolveWebhookOrder({ orderId, externalOrderId });

    const merchantId = String(
      order?.merchantId ||
        merchantFromPayload ||
        merchantFromQuery ||
        merchantFromHeader ||
        ""
    ).trim();
    const candidateSecrets = await resolveCandidateSecrets({
      merchantId: merchantId || undefined,
      includeAllMerchants: !merchantId,
    });
    if (!candidateSecrets.length || !verifyAgainstCandidates(raw, signature, candidateSecrets)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    if (!orderId && !externalOrderId) {
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
        orderId: order.orderId,
        paymentId: paymentId || order.paymentId || `seedhape_${order.orderId}`,
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
