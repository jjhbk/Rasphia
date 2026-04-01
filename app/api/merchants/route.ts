import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";
import { ensureUniqueMerchantSlug } from "@/app/lib/merchantSlug";
import { ensureMerchantSeedhapeDefaults } from "@/app/lib/merchant-seedhape";

function validateMerchantPayload(input: {
  businessName?: unknown;
  phone?: unknown;
  email?: unknown;
  addressLine1?: unknown;
  addressLine2?: unknown;
  city?: unknown;
  state?: unknown;
  zipCode?: unknown;
  locationLink?: unknown;
}) {
  const businessName = String(input.businessName ?? "").trim();
  const phone = String(input.phone ?? "").trim();
  const email = String(input.email ?? "").trim().toLowerCase();
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
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Email format is invalid." };
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
    email,
    addressLine1,
    addressLine2,
    city,
    state,
    zipCode,
    locationLink,
  };
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json();
    const validated = validateMerchantPayload(body || {});
    if ("error" in validated) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const {
      businessName,
      phone,
      email,
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
      [city, state, zipCode].filter(Boolean).join(" "),
    ]
      .filter(Boolean)
      .join(", ");
    const slug = await ensureUniqueMerchantSlug(businessName);

    const merchant = await prisma.merchant.create({
      data: {
        slug,
        name: businessName,
        phone,
        email,
        address: composedAddress,
        addressLine1,
        addressLine2,
        city,
        state,
        zipCode,
        locationLink,
        chatbotWelcomeMessage:
          "Hi, welcome to our store. Tell me what you are looking for and I will help you quickly.",
      },
    });
    await ensureMerchantSeedhapeDefaults(merchant.id);

    return NextResponse.json(merchant, { status: 201 });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A merchant with this email already exists" },
        { status: 409 }
      );
    }

    const message =
      error instanceof Error ? error.message : "Failed to create merchant";

    if (message.startsWith("Unauthorized") || message.startsWith("Forbidden")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const limit = Math.min(
      Math.max(parseInt(req.nextUrl.searchParams.get("limit") || "50", 10), 1),
      200
    );
    const skip = Math.max(
      parseInt(req.nextUrl.searchParams.get("skip") || "0", 10),
      0
    );
    const statusFilter = req.nextUrl.searchParams.get("status");

    const merchants = await prisma.merchant.findMany({
      where: statusFilter ? { status: statusFilter } : undefined,
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
      include: {
        products: {
          orderBy: { createdAt: "desc" },
          select: {
            productId: true,
            name: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json(merchants, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch merchants";
    if (message.startsWith("Unauthorized") || message.startsWith("Forbidden")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
