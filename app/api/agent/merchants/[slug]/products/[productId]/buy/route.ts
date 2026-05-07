import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import {
  decodeXPaymentHeader,
  settlePayment,
  verifyPayment,
  type X402Requirements,
} from "@/app/lib/x402";
import { finalizeOrderAsPaid } from "@/app/lib/order-payment";

const NETWORK_ID = process.env.X402_NETWORK_ID?.trim() || "base-sepolia";
const USDC_ADDRESS =
  process.env.X402_USDC_ADDRESS?.trim() || "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const INR_PER_USDC = Number(process.env.X402_INR_PER_USDC || "84");
const EXPLORER_TX_BASE =
  process.env.X402_EXPLORER_TX_BASE?.trim() || "https://sepolia.basescan.org/tx/";

function parseMerchantPayTo(metadata: Prisma.JsonValue | null) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "";
  const obj = metadata as Record<string, unknown>;
  const direct = String(obj.x402PayTo || "").trim();
  if (direct) return direct;
  const alt = String(obj.paymentRecipientAddress || "").trim();
  if (alt) return alt;
  return "";
}

function amountAtomicFromInr(priceInr: number) {
  const usdc = priceInr / INR_PER_USDC;
  return String(Math.max(1, Math.round(usdc * 1_000_000)));
}

function getRequestUrl(req: Request) {
  const u = new URL(req.url);
  return `${u.origin}${u.pathname}`;
}

function jsonResponse(
  status: number,
  body: Record<string, unknown>,
  extraHeaders?: Record<string, string>
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      ...(extraHeaders || {}),
    },
  });
}

export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string; productId: string }> }
) {
  try {
    const { slug, productId } = await context.params;

    const merchant = await prisma.merchant.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        city: true,
        state: true,
        status: true,
        metadata: true,
      },
    });

    if (!merchant || merchant.status !== "approved") {
      return jsonResponse(404, { error: "merchant_not_found" });
    }

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        merchantId: merchant.id,
        isAvailable: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        brand: true,
        imageUrl: true,
        price: true,
        stockQuantity: true,
      },
    });

    if (!product) {
      return jsonResponse(404, { error: "product_not_found" });
    }

    if (product.stockQuantity <= 0) {
      return jsonResponse(409, { error: "out_of_stock" });
    }

    const priceInr = Math.max(1, Math.round(Number(product.price || 0)));
    const payTo =
      parseMerchantPayTo(merchant.metadata) ||
      String(process.env.X402_PAYMENT_RECIPIENT_ADDRESS || "").trim();

    if (!payTo) {
      return jsonResponse(500, {
        error: "x402_payto_not_configured",
        detail:
          "Set merchant.metadata.x402PayTo or X402_PAYMENT_RECIPIENT_ADDRESS in Rasphia env.",
      });
    }

    const requirements: X402Requirements = {
      scheme: "exact",
      network: NETWORK_ID,
      maxAmountRequired: amountAtomicFromInr(priceInr),
      resource: getRequestUrl(req),
      description: `${merchant.name} - ${product.name}`,
      mimeType: "application/json",
      payTo,
      maxTimeoutSeconds: 60,
      asset: USDC_ADDRESS,
      extra: {
        name: "USDC",
        version: "2",
        merchantId: merchant.id,
        merchantSlug: merchant.slug,
        merchantName: merchant.name,
        productId: product.id,
        productName: product.name,
        priceINR: priceInr,
      },
    };

    const paymentHeader = req.headers.get("x-payment") || "";

    if (!paymentHeader) {
      return jsonResponse(402, {
        x402Version: 1,
        accepts: [requirements],
        error: "X-PAYMENT header required",
      });
    }

    let paymentPayload: Record<string, unknown>;
    try {
      paymentPayload = decodeXPaymentHeader(paymentHeader);
    } catch (error) {
      return jsonResponse(400, {
        error: "invalid_x_payment_header",
        detail: error instanceof Error ? error.message : String(error),
      });
    }

    const verifyRes = await verifyPayment(paymentPayload, requirements);
    if (!verifyRes.ok) {
      return jsonResponse(402, {
        error: "verification_failed",
        detail: {
          status: verifyRes.status,
          body: verifyRes.body,
        },
      });
    }

    const verifyBody = verifyRes.body as Record<string, unknown>;
    const isValid =
      verifyBody.isValid === true ||
      verifyBody.valid === true ||
      verifyBody.success === true;
    if (!isValid) {
      return jsonResponse(402, {
        error: "verification_failed",
        detail: verifyBody,
      });
    }

    const settleRes = await settlePayment(paymentPayload, requirements);
    if (!settleRes.ok) {
      return jsonResponse(402, {
        error: "settlement_failed",
        detail: {
          status: settleRes.status,
          body: settleRes.body,
        },
      });
    }

    const settleBody = settleRes.body as Record<string, unknown>;
    const settleSuccess = settleBody.success !== false;
    if (!settleSuccess) {
      return jsonResponse(402, {
        error: "settlement_failed",
        detail: settleBody,
      });
    }

    const txHash = String(settleBody.transaction || settleBody.txHash || "").trim();
    const auth =
      paymentPayload && typeof paymentPayload.payload === "object"
        ? (paymentPayload.payload as Record<string, unknown>).authorization
        : null;
    const payerAddress =
      String(settleBody.payer || "").trim() ||
      (auth && typeof auth === "object"
        ? String((auth as Record<string, unknown>).from || "").trim()
        : "");

    const orderId = `x402_ord_${Date.now()}_${randomUUID().slice(0, 8)}`;

    await prisma.order.create({
      data: {
        orderId,
        merchantId: merchant.id,
        paymentId: null,
        amount: priceInr,
        currency: "INR",
        receipt: `x402_${merchant.id}_${Date.now()}`,
        status: "created",
        mode: "x402_agentic",
        products: [
          {
            productId: product.id,
            name: product.name,
            brand: product.brand,
            price: priceInr,
            imageUrl: product.imageUrl,
            quantity: 1,
          },
        ],
        customer: {
          source: "agent",
          channel: "x402",
          agentNetwork: NETWORK_ID,
          payerAddress,
          txHash,
        },
        statusHistory: [
          {
            status: "created",
            note: "Order created via x402 agent checkout",
            by: "x402_agent",
            at: new Date().toISOString(),
          },
        ] as unknown as Prisma.InputJsonValue,
      },
    });

    const finalize = await finalizeOrderAsPaid({
      orderId,
      paymentId: txHash ? `x402_${txHash}` : `x402_${Date.now()}`,
      by: "x402_agent",
      note: "x402 payment settled",
      verifiedAt: new Date(),
    });

    if (!finalize.ok) {
      return jsonResponse(500, {
        error: "order_finalize_failed",
        detail: finalize.reason,
      });
    }

    const paymentResponseHeader = Buffer.from(JSON.stringify(settleBody), "utf-8").toString(
      "base64"
    );

    return jsonResponse(
      200,
      {
        order_id: orderId,
        status: "confirmed",
        merchant: merchant.name,
        merchant_location: `${merchant.city}, ${merchant.state}`,
        product: product.name,
        amount_inr: priceInr,
        amount_usdc_atomic: requirements.maxAmountRequired,
        chain: NETWORK_ID,
        tx_hash: txHash || null,
        payer_address: payerAddress || null,
        explorer_url: txHash ? `${EXPLORER_TX_BASE}${txHash}` : null,
      },
      {
        "X-Payment-Response": paymentResponseHeader,
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return jsonResponse(500, { error: message });
  }
}
