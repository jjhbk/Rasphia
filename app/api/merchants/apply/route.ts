import { NextRequest, NextResponse } from "next/server";
import { authGuard } from "@/app/lib/auth-guard";
import { prisma } from "@/app/lib/prisma";
import { ensureUniqueMerchantSlug } from "@/app/lib/merchantSlug";
import { ensureMerchantSeedhapeDefaults } from "@/app/lib/merchant-seedhape";

function validateMerchantApplication(input: {
  businessName?: unknown;
  phone?: unknown;
  addressLine1?: unknown;
  addressLine2?: unknown;
  city?: unknown;
  state?: unknown;
  zipCode?: unknown;
  locationLink?: unknown;
}) {
  const businessName = String(input.businessName ?? "").trim();
  const phone = String(input.phone ?? "").trim();
  const addressLine1 = String(input.addressLine1 ?? "").trim();
  const addressLine2 = String(input.addressLine2 ?? "").trim();
  const city = String(input.city ?? "").trim();
  const state = String(input.state ?? "").trim();
  const zipCode = String(input.zipCode ?? "").trim();
  const locationLink = String(input.locationLink ?? "").trim();

  if (businessName.length < 2) {
    return { error: "Business name must be at least 2 characters." };
  }
  if (!/^\+?[0-9\s\-()]{8,20}$/.test(phone)) {
    return { error: "Phone number format is invalid." };
  }
  if (addressLine1.length < 3) {
    return { error: "Address line 1 must be at least 3 characters." };
  }
  if (addressLine2.length < 2) {
    return { error: "Address line 2 must be at least 2 characters." };
  }
  if (city.length < 2) {
    return { error: "City must be at least 2 characters." };
  }
  if (state.length < 2) {
    return { error: "State must be at least 2 characters." };
  }
  if (!/^[A-Za-z0-9\- ]{4,12}$/.test(zipCode)) {
    return { error: "ZIP code format is invalid." };
  }
  if (!locationLink) {
    return { error: "Location link is required." };
  }
  if (!/^https?:\/\/.+/i.test(locationLink)) {
    return { error: "Location link must be a valid URL." };
  }

  return {
    businessName,
    phone,
    addressLine1,
    addressLine2,
    city,
    state,
    zipCode,
    locationLink,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { sessionEmail, errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;

    const merchant = await prisma.merchant.findUnique({
      where: { email: sessionEmail },
    });

    return NextResponse.json(
      {
        merchant: merchant || null,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch merchant status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { sessionEmail, body, errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;

    const validated = validateMerchantApplication(body || {});
    if ("error" in validated) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const {
      businessName,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      zipCode,
      locationLink,
    } = validated;
    const composedAddress = [
      addressLine1,
      addressLine2,
      `${city}, ${state} ${zipCode}`,
    ]
      .filter(Boolean)
      .join(", ");

    const existing = await prisma.merchant.findUnique({
      where: { email: sessionEmail },
      select: { id: true, slug: true },
    });
    const nextSlug = existing?.slug
      ? await ensureUniqueMerchantSlug(existing.slug, existing.id)
      : await ensureUniqueMerchantSlug(businessName);

    const merchant = await prisma.merchant.upsert({
      where: { email: sessionEmail },
      create: {
        slug: nextSlug,
        name: businessName,
        phone,
        email: String(sessionEmail).trim().toLowerCase(),
        address: composedAddress,
        addressLine1,
        addressLine2,
        city,
        state,
        zipCode,
        locationLink,
        chatbotWelcomeMessage:
          "Hi, welcome to our store. Tell me what you are looking for and I will help you quickly.",
        status: "pending",
      },
      update: {
        slug: nextSlug,
        name: businessName,
        phone,
        address: composedAddress,
        addressLine1,
        addressLine2,
        city,
        state,
        zipCode,
        locationLink,
        status: "pending",
        approvedAt: null,
        approvedBy: null,
      },
    });
    await ensureMerchantSeedhapeDefaults(merchant.id);

    await prisma.userProfile.upsert({
      where: { email: sessionEmail },
      create: {
        email: sessionEmail,
        name: businessName,
        phone,
        address: composedAddress,
        role: "merchant",
        credits: 0,
      },
      update: {
        name: businessName,
        phone,
        address: composedAddress,
        role: "merchant",
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        success: true,
        merchant,
        message: "Application submitted. Awaiting admin approval.",
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to submit application";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
