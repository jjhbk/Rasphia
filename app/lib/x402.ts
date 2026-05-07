import { Buffer } from "node:buffer";

export type X402Requirements = {
  scheme: "exact";
  network: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: "application/json";
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  extra: Record<string, unknown>;
};

const FACILITATOR_URL =
  process.env.X402_FACILITATOR_URL?.trim() || "https://x402.org/facilitator";

function facilitatorHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const explicitAuth = process.env.X402_FACILITATOR_AUTH_HEADER?.trim();
  if (explicitAuth) {
    headers["Authorization"] = explicitAuth;
  }
  return headers;
}

async function post(path: "/verify" | "/settle", body: unknown) {
  const url = `${FACILITATOR_URL.replace(/\/+$/, "")}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: facilitatorHeaders(),
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { raw: text };
  }
  if (!res.ok) {
    return {
      ok: false as const,
      status: res.status,
      body: parsed,
    };
  }
  return {
    ok: true as const,
    status: res.status,
    body: parsed as Record<string, unknown>,
  };
}

export async function verifyPayment(
  paymentPayload: Record<string, unknown>,
  paymentRequirements: X402Requirements
) {
  return post("/verify", {
    x402Version: 1,
    paymentPayload,
    paymentRequirements,
  });
}

export async function settlePayment(
  paymentPayload: Record<string, unknown>,
  paymentRequirements: X402Requirements
) {
  return post("/settle", {
    x402Version: 1,
    paymentPayload,
    paymentRequirements,
  });
}

export function decodeXPaymentHeader(headerValue: string) {
  const raw = Buffer.from(headerValue, "base64").toString("utf-8");
  return JSON.parse(raw) as Record<string, unknown>;
}
