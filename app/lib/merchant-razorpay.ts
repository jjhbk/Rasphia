import { prisma } from "@/app/lib/prisma";
import { decryptSecret, encryptSecret } from "@/app/lib/secret-crypto";

export type MerchantRazorpayConfig = {
  merchantId: string;
  keyId: string;
  keySecret: string;
};

export type PreferredPaymentProvider = "seedhape" | "razorpay";

export function maskRazorpayKeyId(keyId: string) {
  const clean = String(keyId || "").trim();
  if (clean.length <= 8) return "********";
  return `${clean.slice(0, 7)}...${clean.slice(-4)}`;
}

export async function setMerchantRazorpayConfig(input: {
  merchantId: string;
  keyId?: string;
  keySecret?: string;
  preferredPaymentProvider?: PreferredPaymentProvider | null;
}) {
  const existing = await prisma.merchant.findUnique({
    where: { id: input.merchantId },
    select: { id: true },
  });
  if (!existing) throw new Error("Merchant not found");

  const data: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (input.keyId !== undefined) {
    const keyId = String(input.keyId).trim();
    if (!keyId) throw new Error("Razorpay Key ID cannot be empty.");
    data.razorpayKeyIdEncrypted = encryptSecret(keyId);
    data.razorpayConfiguredAt = new Date();
  }

  if (input.keySecret !== undefined) {
    const keySecret = String(input.keySecret).trim();
    if (!keySecret) throw new Error("Razorpay Key Secret cannot be empty.");
    data.razorpayKeySecretEncrypted = encryptSecret(keySecret);
    data.razorpayConfiguredAt = new Date();
  }

  if (input.preferredPaymentProvider !== undefined) {
    data.preferredPaymentProvider =
      input.preferredPaymentProvider === null
        ? null
        : String(input.preferredPaymentProvider).trim() || null;
  }

  await prisma.merchant.update({
    where: { id: input.merchantId },
    data,
  });
}

export async function getMerchantRazorpayConfig(
  merchantId: string
): Promise<MerchantRazorpayConfig> {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: {
      id: true,
      razorpayKeyIdEncrypted: true,
      razorpayKeySecretEncrypted: true,
    },
  });
  if (!merchant) throw new Error("Merchant not found");

  const keyId = decryptSecret(merchant.razorpayKeyIdEncrypted);
  const keySecret = decryptSecret(merchant.razorpayKeySecretEncrypted);

  if (!keyId || !keySecret) {
    throw new Error("Merchant Razorpay credentials are not configured.");
  }

  return {
    merchantId: merchant.id,
    keyId,
    keySecret,
  };
}

export async function getMerchantRazorpayPublicSummary(merchantId: string) {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: {
      razorpayKeyIdEncrypted: true,
      razorpayKeySecretEncrypted: true,
      razorpayConfiguredAt: true,
      preferredPaymentProvider: true,
    },
  });
  if (!merchant) throw new Error("Merchant not found");

  const keyId = decryptSecret(merchant.razorpayKeyIdEncrypted);
  const keySecret = decryptSecret(merchant.razorpayKeySecretEncrypted);
  return {
    configured: Boolean(keyId && keySecret),
    keyIdMasked: keyId ? maskRazorpayKeyId(keyId) : null,
    configuredAt: merchant.razorpayConfiguredAt,
    preferredPaymentProvider:
      merchant.preferredPaymentProvider === "razorpay" ||
      merchant.preferredPaymentProvider === "seedhape"
        ? merchant.preferredPaymentProvider
        : "razorpay",
  };
}

export async function getMerchantPreferredPaymentProvider(merchantId: string) {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { preferredPaymentProvider: true },
  });
  if (!merchant) throw new Error("Merchant not found");
  return merchant.preferredPaymentProvider === "razorpay" ||
    merchant.preferredPaymentProvider === "seedhape"
    ? merchant.preferredPaymentProvider
    : "razorpay";
}
