import { Buffer } from "node:buffer";
import { randomBytes } from "node:crypto";
import { SignJWT, importPKCS8 } from "jose";

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

function getPemKey(raw: string) {
  if (raw.includes("-----BEGIN")) return raw;
  return raw.replace(/\\n/g, "\n");
}

async function buildFacilitatorAuthorizationHeader() {
  const explicitAuth = process.env.X402_FACILITATOR_AUTH_HEADER?.trim();
  if (explicitAuth) return explicitAuth;

  const apiKeyId = process.env.CDP_API_KEY_ID?.trim() || "";
  const apiKeySecret = process.env.CDP_API_KEY_SECRET?.trim() || "";
  if (!apiKeyId || !apiKeySecret) return "";

  const mode = (process.env.X402_FACILITATOR_AUTH_MODE || "cdp_jwt").trim().toLowerCase();
  if (mode === "basic") {
    const token = Buffer.from(`${apiKeyId}:${apiKeySecret}`, "utf-8").toString("base64");
    return `Basic ${token}`;
  }

  const now = Math.floor(Date.now() / 1000);
  const pem = getPemKey(apiKeySecret);
  const alg = (process.env.CDP_JWT_ALG || "ES256").trim();
  const audience = (process.env.CDP_JWT_AUD || "cdp").trim();
  const ttlSec = Math.max(30, Math.min(300, Number(process.env.CDP_JWT_TTL_SECONDS || 120)));

  const privateKey = await importPKCS8(pem, alg);
  const jwt = await new SignJWT({
    iss: apiKeyId,
    sub: apiKeyId,
    aud: audience,
    nonce: randomBytes(16).toString("hex"),
  })
    .setProtectedHeader({
      alg,
      kid: apiKeyId,
      typ: "JWT",
    })
    .setIssuedAt(now)
    .setNotBefore(now - 5)
    .setExpirationTime(now + ttlSec)
    .sign(privateKey);

  return `Bearer ${jwt}`;
}

async function facilitatorHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const authHeader = await buildFacilitatorAuthorizationHeader();
  if (authHeader) {
    headers["Authorization"] = authHeader;
  }
  return headers;
}

async function post(path: "/verify" | "/settle", body: unknown) {
  const url = `${FACILITATOR_URL.replace(/\/+$/, "")}${path}`;
  const headers = await facilitatorHeaders();
  const res = await fetch(url, {
    method: "POST",
    headers,
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
