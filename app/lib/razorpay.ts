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
