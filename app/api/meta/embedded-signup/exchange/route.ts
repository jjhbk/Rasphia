import { NextRequest, NextResponse } from "next/server";
import { authGuard } from "@/app/lib/auth-guard";
import { prisma } from "@/app/lib/prisma";
import {
  exchangeMetaEmbeddedSignupCode,
  mergeMerchantMetaEmbeddedSignup,
  subscribeAppToWabaIfPossible,
} from "@/app/lib/meta-embedded-signup";
import { ensureUniqueMerchantSlug } from "@/app/lib/merchantSlug";

function fallbackBusinessName(email: string, preferred?: string) {
  const value = String(preferred || "").trim();
  if (value) return value;
  const localPart = String(email || "").split("@")[0] || "merchant";
  return localPart.replace(/[._-]+/g, " ").trim() || "Merchant";
}

function createAddressPlaceholder() {
  return {
    address: "Pending merchant onboarding details",
    addressLine1: "Pending onboarding",
    addressLine2: "Pending onboarding",
    city: "Pending",
    state: "Pending",
    zipCode: "0000",
    locationLink: "",
  };
}

export async function POST(req: NextRequest) {
  try {
    const { sessionEmail, body, errorResponse } = await authGuard(req);
    if (errorResponse || !sessionEmail) return errorResponse;

    const code = String(body?.code || "").trim();
    if (!code) {
      return NextResponse.json({ error: "Missing Meta signup code." }, { status: 400 });
    }

    const exchange = await exchangeMetaEmbeddedSignupCode(code);
    const businessName = fallbackBusinessName(
      sessionEmail,
      exchange.business?.name || exchange.profile?.name
    );
    const displayPhone = String(
      exchange.whatsapp?.displayPhoneNumber || ""
    ).trim();
    const placeholders = createAddressPlaceholder();

    const existing = await prisma.merchant.findUnique({
      where: { email: sessionEmail },
      select: {
        id: true,
        slug: true,
        metadata: true,
      },
    });

    const nextSlug = existing?.slug
      ? await ensureUniqueMerchantSlug(existing.slug, existing.id)
      : await ensureUniqueMerchantSlug(businessName);

    const merchant = await prisma.merchant.upsert({
      where: { email: sessionEmail },
      create: {
        slug: nextSlug,
        name: businessName,
        phone: displayPhone || "+91 0000000000",
        email: sessionEmail.toLowerCase(),
        address: placeholders.address,
        addressLine1: placeholders.addressLine1,
        addressLine2: placeholders.addressLine2,
        city: placeholders.city,
        state: placeholders.state,
        zipCode: placeholders.zipCode,
        locationLink: placeholders.locationLink,
        status: "pending",
        chatbotWelcomeMessage:
          "Hi, welcome to our store. Tell me what you are looking for and I will help you quickly.",
        metadata: mergeMerchantMetaEmbeddedSignup(existing?.metadata ?? null, exchange),
      },
      update: {
        slug: nextSlug,
        name: businessName,
        phone: displayPhone || undefined,
        metadata: mergeMerchantMetaEmbeddedSignup(existing?.metadata ?? null, exchange),
        updatedAt: new Date(),
      },
    });

    await prisma.userProfile.upsert({
      where: { email: sessionEmail },
      create: {
        email: sessionEmail,
        name: businessName,
        phone: displayPhone || "",
        address: merchant.address,
        role: "merchant",
        credits: 0,
      },
      update: {
        name: businessName,
        phone: displayPhone || undefined,
        role: "merchant",
        updatedAt: new Date(),
      },
    });

    await subscribeAppToWabaIfPossible(
      exchange.accessTokenPlain,
      exchange.whatsapp?.wabaId || ""
    );

    return NextResponse.json(
      {
        ok: true,
        merchant,
        meta: {
          business: exchange.business,
          whatsapp: exchange.whatsapp,
          instagram: exchange.instagram,
        },
        message:
          "Meta business connection saved. Complete any remaining merchant details below.",
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to complete Meta Embedded Signup.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
