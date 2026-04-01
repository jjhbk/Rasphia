import { prisma } from "@/app/lib/prisma";
import {
  decryptSecret,
  encryptSecret,
  generateRandomSecret,
} from "@/app/lib/secret-crypto";

function getGlobalSeedhapeBaseUrl() {
  const configured = String(process.env.SEEDHAPE_BASE_URL || "").trim();
  if (!configured) {
    throw new Error("SEEDHAPE_BASE_URL is not configured.");
  }
  return configured;
}

export type MerchantSeedhapeConfig = {
  merchantId: string;
  apiKey: string;
  webhookSecret: string;
  baseUrl: string;
};

export function maskApiKey(apiKey: string) {
  const clean = String(apiKey || "").trim();
  if (clean.length <= 8) return "********";
  return `${clean.slice(0, 7)}...${clean.slice(-4)}`;
}

export { generateRandomSecret };

export async function ensureMerchantSeedhapeDefaults(merchantId: string) {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: {
      id: true,
      seedhapeWebhookSecretEncrypted: true,
    },
  });
  if (!merchant) throw new Error("Merchant not found");

  const hasSecret = !!merchant.seedhapeWebhookSecretEncrypted;
  const nextSecret = hasSecret ? null : generateRandomSecret(32);

  if (!hasSecret) {
    await prisma.merchant.update({
      where: { id: merchant.id },
      data: {
        ...(hasSecret
          ? {}
          : { seedhapeWebhookSecretEncrypted: encryptSecret(nextSecret || "") }),
      },
    });
  }

  return {
    webhookSecret: nextSecret,
    baseUrl: getGlobalSeedhapeBaseUrl(),
  };
}

export async function setMerchantSeedhapeConfig(input: {
  merchantId: string;
  apiKey?: string;
  webhookSecret?: string;
}) {
  const existing = await prisma.merchant.findUnique({
    where: { id: input.merchantId },
    select: { id: true },
  });
  if (!existing) throw new Error("Merchant not found");

  const data: Record<string, unknown> = {
    updatedAt: new Date(),
    seedhapeConfiguredAt: new Date(),
  };

  if (input.apiKey !== undefined) {
    const key = String(input.apiKey).trim();
    if (!key) throw new Error("SeedhaPe API key cannot be empty.");
    data.seedhapeApiKeyEncrypted = encryptSecret(key);
  }
  if (input.webhookSecret !== undefined) {
    const secret = String(input.webhookSecret).trim();
    if (!secret) throw new Error("Webhook secret cannot be empty.");
    data.seedhapeWebhookSecretEncrypted = encryptSecret(secret);
  }
  await prisma.merchant.update({
    where: { id: input.merchantId },
    data,
  });
}

export async function getMerchantSeedhapeConfig(
  merchantId: string
): Promise<MerchantSeedhapeConfig> {
  await ensureMerchantSeedhapeDefaults(merchantId);
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: {
      id: true,
      seedhapeApiKeyEncrypted: true,
      seedhapeWebhookSecretEncrypted: true,
    },
  });
  if (!merchant) {
    throw new Error("Merchant not found");
  }

  const apiKey = decryptSecret(merchant.seedhapeApiKeyEncrypted);
  const webhookSecret = decryptSecret(merchant.seedhapeWebhookSecretEncrypted);
  const baseUrl = getGlobalSeedhapeBaseUrl();

  if (!apiKey) {
    throw new Error("Merchant SeedhaPe API key is not configured.");
  }

  return {
    merchantId: merchant.id,
    apiKey,
    webhookSecret,
    baseUrl,
  };
}

export async function getMerchantSeedhapePublicSummary(merchantId: string) {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: {
      id: true,
      seedhapeApiKeyEncrypted: true,
      seedhapeConfiguredAt: true,
    },
  });
  if (!merchant) throw new Error("Merchant not found");

  const plain = decryptSecret(merchant.seedhapeApiKeyEncrypted);
  return {
    configured: Boolean(plain),
    apiKeyMasked: plain ? maskApiKey(plain) : null,
    baseUrl: getGlobalSeedhapeBaseUrl(),
    configuredAt: merchant.seedhapeConfiguredAt,
  };
}
