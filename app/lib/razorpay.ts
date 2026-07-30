import crypto from "crypto";
import Razorpay from "razorpay";

export type CreateRazorpayOrderInput = {
  amount: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
};

export type RazorpayRequestConfig = {
  keyId: string;
  keySecret: string;
};

export type CreateRazorpayPaymentLinkInput = {
  amount: number;
  currency?: string;
  referenceId?: string;
  description?: string;
  customer?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  expireBy?: number;
};

export type RazorpayPaymentLinkData = {
  id: string;
  short_url?: string;
  status?: string;
  amount?: number;
  currency?: string;
  expire_by?: number;
};

export async function createRazorpayOrderWithConfig(
  input: CreateRazorpayOrderInput,
  config: RazorpayRequestConfig
) {
  const keyId = String(config.keyId || "").trim();
  const keySecret = String(config.keySecret || "").trim();
  if (!keyId || !keySecret) {
    throw new Error("Missing Razorpay credentials.");
  }

  const razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  return razorpay.orders.create({
    amount: Math.max(100, Math.round(Number(input.amount || 0))),
    currency: String(input.currency || "INR").trim() || "INR",
    ...(String(input.receipt || "").trim()
      ? { receipt: String(input.receipt).trim().slice(0, 40) }
      : {}),
    ...(input.notes ? { notes: input.notes } : {}),
  });
}

function buildRazorpayAuthHeader(config: RazorpayRequestConfig) {
  const keyId = String(config.keyId || "").trim();
  const keySecret = String(config.keySecret || "").trim();
  if (!keyId || !keySecret) {
    throw new Error("Missing Razorpay credentials.");
  }
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

export async function createRazorpayPaymentLinkWithConfig(
  input: CreateRazorpayPaymentLinkInput,
  config: RazorpayRequestConfig
): Promise<RazorpayPaymentLinkData> {
  const auth = buildRazorpayAuthHeader(config);
  const payload = {
    amount: Math.max(100, Math.round(Number(input.amount || 0))),
    currency: String(input.currency || "INR").trim() || "INR",
    ...(String(input.referenceId || "").trim()
      ? { reference_id: String(input.referenceId).trim().slice(0, 40) }
      : {}),
    ...(String(input.description || "").trim()
      ? { description: String(input.description).trim().slice(0, 255) }
      : {}),
    ...(input.customer
      ? {
          customer: {
            ...(String(input.customer.name || "").trim()
              ? { name: String(input.customer.name).trim().slice(0, 80) }
              : {}),
            ...(String(input.customer.email || "").trim()
              ? { email: String(input.customer.email).trim() }
              : {}),
            ...(String(input.customer.contact || "").trim()
              ? { contact: String(input.customer.contact).replace(/[^\d]/g, "").slice(-15) }
              : {}),
          },
        }
      : {}),
    ...(input.notes ? { notes: input.notes } : {}),
    ...(Number.isFinite(Number(input.expireBy))
      ? { expire_by: Math.max(Math.floor(Number(input.expireBy)), Math.floor(Date.now() / 1000) + 300) }
      : {}),
  };

  const res = await fetch("https://api.razorpay.com/v1/payment_links", {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const message =
      typeof json.error === "object" && json.error && "description" in json.error
        ? String((json.error as Record<string, unknown>).description || "")
        : typeof json.description === "string"
        ? json.description
        : "";
    throw new Error(
      `Razorpay payment link create failed (${res.status})${message ? `: ${message}` : ""}`
    );
  }

  return json as RazorpayPaymentLinkData;
}

export async function getRazorpayPaymentLinkWithConfig(
  paymentLinkId: string,
  config: RazorpayRequestConfig
): Promise<RazorpayPaymentLinkData> {
  const auth = buildRazorpayAuthHeader(config);
  const res = await fetch(
    `https://api.razorpay.com/v1/payment_links/${encodeURIComponent(paymentLinkId)}`,
    {
      method: "GET",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
      },
    }
  );

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const message =
      typeof json.error === "object" && json.error && "description" in json.error
        ? String((json.error as Record<string, unknown>).description || "")
        : typeof json.description === "string"
        ? json.description
        : "";
    throw new Error(
      `Razorpay payment link fetch failed (${res.status})${message ? `: ${message}` : ""}`
    );
  }

  return json as RazorpayPaymentLinkData;
}

export function verifyRazorpayPaymentSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
  keySecret: string;
}) {
  const expected = crypto
    .createHmac("sha256", input.keySecret)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest("hex");

  return expected === input.signature;
}
