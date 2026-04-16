import { prisma } from "@/app/lib/prisma";
import {
  decryptSecret,
  encryptSecret,
  generateRandomSecret,
} from "@/app/lib/secret-crypto";

const DEFAULT_BAHI_BASE_URL = "https://api.bahi.app/api";

export type MerchantBahiConfig = {
  merchantId: string;
  bahiMerchantId: string;
  bahiUpiId: string;
  apiKey: string;
  webhookSecret: string;
  baseUrl: string;
  autoReceiptEnabled: boolean;
};

export function normalizeBahiBaseUrl(value?: string | null) {
  const raw = String(value || "").trim();
  const fallback = String(process.env.BAHI_BASE_URL || "").trim() || DEFAULT_BAHI_BASE_URL;
  const input = raw || fallback;
  const withoutSlash = input.replace(/\/+$/, "");
  return /\/api$/i.test(withoutSlash) ? withoutSlash : `${withoutSlash}/api`;
}

export function maskApiKey(apiKey: string) {
  const clean = String(apiKey || "").trim();
  if (clean.length <= 8) return "********";
  return `${clean.slice(0, 7)}...${clean.slice(-4)}`;
}

export { generateRandomSecret };

export async function ensureMerchantBahiDefaults(merchantId: string) {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: {
      id: true,
      bahiWebhookSecretEncrypted: true,
    },
  });
  if (!merchant) throw new Error("Merchant not found");

  const hasSecret = !!merchant.bahiWebhookSecretEncrypted;
  const nextSecret = hasSecret ? null : generateRandomSecret(32);

  if (!hasSecret && nextSecret) {
    await prisma.merchant.update({
      where: { id: merchant.id },
      data: {
        bahiWebhookSecretEncrypted: encryptSecret(nextSecret),
      },
    });
  }

  return {
    webhookSecret: nextSecret,
    baseUrl: normalizeBahiBaseUrl(null),
  };
}

export async function setMerchantBahiConfig(input: {
  merchantId: string;
  apiKey?: string;
  webhookSecret?: string;
  bahiMerchantId?: string;
  bahiUpiId?: string;
  baseUrl?: string;
  autoReceiptEnabled?: boolean;
}) {
  const existing = await prisma.merchant.findUnique({
    where: { id: input.merchantId },
    select: { id: true },
  });
  if (!existing) throw new Error("Merchant not found");

  const data: Record<string, unknown> = {
    updatedAt: new Date(),
    bahiConfiguredAt: new Date(),
  };

  if (input.apiKey !== undefined) {
    const key = String(input.apiKey).trim();
    if (!key) throw new Error("Bahi API key cannot be empty.");
    data.bahiApiKeyEncrypted = encryptSecret(key);
  }

  if (input.webhookSecret !== undefined) {
    const secret = String(input.webhookSecret).trim();
    if (!secret) throw new Error("Bahi webhook secret cannot be empty.");
    data.bahiWebhookSecretEncrypted = encryptSecret(secret);
  }

  if (input.bahiMerchantId !== undefined) {
    const merchantRef = String(input.bahiMerchantId).trim();
    if (!merchantRef) throw new Error("Bahi merchant ID cannot be empty.");
    data.bahiMerchantId = merchantRef;
  }

  if (input.bahiUpiId !== undefined) {
    const upiId = String(input.bahiUpiId).trim();
    if (!upiId) throw new Error("Bahi UPI ID cannot be empty.");
    data.bahiUpiId = upiId;
  }

  if (input.baseUrl !== undefined) {
    const nextBase = normalizeBahiBaseUrl(String(input.baseUrl || "").trim());
    data.bahiBaseUrl = nextBase;
  }

  if (input.autoReceiptEnabled !== undefined) {
    data.bahiAutoReceiptEnabled = Boolean(input.autoReceiptEnabled);
  }

  await prisma.merchant.update({
    where: { id: input.merchantId },
    data,
  });
}

export async function getMerchantBahiConfig(
  merchantId: string
): Promise<MerchantBahiConfig> {
  await ensureMerchantBahiDefaults(merchantId);

  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: {
      id: true,
      bahiApiKeyEncrypted: true,
      bahiWebhookSecretEncrypted: true,
      bahiMerchantId: true,
      bahiUpiId: true,
      bahiBaseUrl: true,
      bahiAutoReceiptEnabled: true,
    },
  });

  if (!merchant) {
    throw new Error("Merchant not found");
  }

  const apiKey = decryptSecret(merchant.bahiApiKeyEncrypted);
  const webhookSecret = decryptSecret(merchant.bahiWebhookSecretEncrypted);
  const bahiMerchantId = String(merchant.bahiMerchantId || "").trim();
  const bahiUpiId = String(merchant.bahiUpiId || "").trim();

  if (!apiKey) {
    throw new Error("Merchant Bahi API key is not configured.");
  }
  if (!webhookSecret) {
    throw new Error("Merchant Bahi webhook secret is not configured.");
  }
  if (!bahiMerchantId) {
    throw new Error("Merchant Bahi merchant ID is not configured.");
  }
  if (!bahiUpiId) {
    throw new Error("Merchant Bahi UPI ID is not configured.");
  }

  return {
    merchantId: merchant.id,
    bahiMerchantId,
    bahiUpiId,
    apiKey,
    webhookSecret,
    baseUrl: normalizeBahiBaseUrl(merchant.bahiBaseUrl),
    autoReceiptEnabled: Boolean(merchant.bahiAutoReceiptEnabled),
  };
}

export async function getMerchantBahiPublicSummary(merchantId: string) {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: {
      id: true,
      bahiApiKeyEncrypted: true,
      bahiMerchantId: true,
      bahiUpiId: true,
      bahiBaseUrl: true,
      bahiAutoReceiptEnabled: true,
      bahiConfiguredAt: true,
    },
  });
  if (!merchant) throw new Error("Merchant not found");

  const plain = decryptSecret(merchant.bahiApiKeyEncrypted);
  return {
    configured: Boolean(plain && merchant.bahiMerchantId && merchant.bahiUpiId),
    apiKeyMasked: plain ? maskApiKey(plain) : null,
    bahiMerchantId: merchant.bahiMerchantId || null,
    bahiUpiId: merchant.bahiUpiId || null,
    baseUrl: normalizeBahiBaseUrl(merchant.bahiBaseUrl),
    autoReceiptEnabled: Boolean(merchant.bahiAutoReceiptEnabled),
    configuredAt: merchant.bahiConfiguredAt,
  };
}
