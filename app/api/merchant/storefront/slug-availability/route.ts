import { NextRequest, NextResponse } from "next/server";
import { getManagementAccess } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import {
  isMerchantSlugAvailable,
  validateMerchantSlug,
} from "@/app/lib/merchantSlug";

export async function GET(req: NextRequest) {
  try {
    const access = await getManagementAccess();
    const raw = String(req.nextUrl.searchParams.get("slug") || "").trim();

    if (!raw) {
      return NextResponse.json(
        { error: "slug query param is required" },
        { status: 400 }
      );
    }

    const parsed = validateMerchantSlug(raw);
    if (!parsed.valid) {
      return NextResponse.json(
        { error: parsed.error, slug: parsed.slug, available: false },
        { status: 400 }
      );
    }
    const normalizedSlug = parsed.slug;

    const merchant = await prisma.merchant.findFirst({
      where: { email: access.email },
      select: { id: true, slug: true },
    });

    const available = await isMerchantSlugAvailable(
      normalizedSlug,
      merchant?.id || undefined
    );

    return NextResponse.json(
      {
        slug: normalizedSlug,
        available,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to validate slug availability";
    if (message.startsWith("Unauthorized") || message.startsWith("Forbidden")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
