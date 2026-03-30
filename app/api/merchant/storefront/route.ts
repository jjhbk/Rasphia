import { NextRequest, NextResponse } from "next/server";
import { getManagementAccess } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import {
  ensureUniqueMerchantSlug,
  isMerchantSlugAvailable,
  validateMerchantSlug,
} from "@/app/lib/merchantSlug";

function isValidUrl(value: string) {
  return /^https?:\/\/.+/i.test(value);
}

export async function GET(req: NextRequest) {
  try {
    const access = await getManagementAccess();
    const merchantIdParam = req.nextUrl.searchParams.get("merchantId");

    const merchant = await prisma.merchant.findFirst({
      where:
        access.role === "admin" && merchantIdParam
          ? { id: merchantIdParam }
          : { email: access.email },
      select: {
        id: true,
        slug: true,
        name: true,
        email: true,
        status: true,
        logoUrl: true,
        coverImageUrl: true,
        storefrontDescription: true,
        chatbotWelcomeMessage: true,
        locationLink: true,
        updatedAt: true,
      },
    });

    if (!merchant) {
      return NextResponse.json(
        { error: "Merchant storefront not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ storefront: merchant }, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to load storefront";
    if (message.startsWith("Unauthorized") || message.startsWith("Forbidden")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const access = await getManagementAccess();
    const body = await req.json();

    const merchantIdParam =
      access.role === "admin" ? String(body?.merchantId || "").trim() : "";
    const where =
      access.role === "admin" && merchantIdParam
        ? { id: merchantIdParam }
        : { email: access.email };

    const existing = await prisma.merchant.findFirst({
      where,
      select: { id: true, slug: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Merchant storefront not found" },
        { status: 404 }
      );
    }

    const name = body?.name !== undefined ? String(body.name).trim() : undefined;
    const incomingSlug =
      body?.slug !== undefined ? String(body.slug).trim() : undefined;
    const logoUrl =
      body?.logoUrl !== undefined ? String(body.logoUrl).trim() : undefined;
    const coverImageUrl =
      body?.coverImageUrl !== undefined
        ? String(body.coverImageUrl).trim()
        : undefined;
    const storefrontDescription =
      body?.storefrontDescription !== undefined
        ? String(body.storefrontDescription).trim()
        : undefined;
    const chatbotWelcomeMessage =
      body?.chatbotWelcomeMessage !== undefined
        ? String(body.chatbotWelcomeMessage).trim()
        : undefined;

    if (name !== undefined && name.length < 2) {
      return NextResponse.json(
        { error: "Business name must be at least 2 characters." },
        { status: 400 }
      );
    }

    if (logoUrl && !isValidUrl(logoUrl)) {
      return NextResponse.json(
        { error: "Logo URL must be a valid URL." },
        { status: 400 }
      );
    }
    if (coverImageUrl && !isValidUrl(coverImageUrl)) {
      return NextResponse.json(
        { error: "Cover image URL must be a valid URL." },
        { status: 400 }
      );
    }

    const parsedSlug =
      incomingSlug !== undefined
        ? validateMerchantSlug(incomingSlug)
        : { valid: true as const, slug: existing.slug };
    if (!parsedSlug.valid) {
      return NextResponse.json(
        { error: parsedSlug.error, suggestedSlug: parsedSlug.slug },
        { status: 400 }
      );
    }
    const slug = parsedSlug.slug;
    const slugAvailable = await isMerchantSlugAvailable(slug, existing.id);
    if (!slugAvailable) {
      const suggested = await ensureUniqueMerchantSlug(slug, existing.id);
      return NextResponse.json(
        {
          error: "This storefront URL is already taken. Please choose another.",
          suggestedSlug: suggested,
        },
        { status: 409 }
      );
    }

    const updated = await prisma.merchant.update({
      where: { id: existing.id },
      data: {
        ...(name !== undefined && { name }),
        slug,
        ...(logoUrl !== undefined && { logoUrl: logoUrl || null }),
        ...(coverImageUrl !== undefined && {
          coverImageUrl: coverImageUrl || null,
        }),
        ...(storefrontDescription !== undefined && {
          storefrontDescription: storefrontDescription || null,
        }),
        ...(chatbotWelcomeMessage !== undefined && {
          chatbotWelcomeMessage: chatbotWelcomeMessage || null,
        }),
        updatedAt: new Date(),
      },
      select: {
        id: true,
        slug: true,
        name: true,
        email: true,
        status: true,
        logoUrl: true,
        coverImageUrl: true,
        storefrontDescription: true,
        chatbotWelcomeMessage: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ storefront: updated }, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update storefront";
    if (message.startsWith("Unauthorized") || message.startsWith("Forbidden")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
