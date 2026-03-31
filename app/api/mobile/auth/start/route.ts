import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";
import crypto from "crypto";

const DEFAULT_MOBILE_REDIRECT = "rasphiamerchant://auth/callback";
const MOBILE_ONE_TIME_TOKEN_TTL_MS = 5 * 60 * 1000;

function appendParams(base: string, params: Record<string, string>) {
  const query = new URLSearchParams(params).toString();
  return `${base}${base.includes("?") ? "&" : "?"}${query}`;
}

export async function GET(req: NextRequest) {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || req.nextUrl.origin;

  const mobileRedirectRaw = String(
    req.nextUrl.searchParams.get("mobile_redirect") || DEFAULT_MOBILE_REDIRECT
  ).trim();
  const mobileRedirect = mobileRedirectRaw.startsWith("rasphiamerchant://")
    ? mobileRedirectRaw
    : DEFAULT_MOBILE_REDIRECT;

  const dashboardPath = String(
    req.nextUrl.searchParams.get("dashboard_path") || "/admin"
  ).trim();

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    const callbackUrl = new URL(`${baseUrl}/api/mobile/auth/start`);
    callbackUrl.searchParams.set("mobile_redirect", mobileRedirect);
    callbackUrl.searchParams.set("dashboard_path", dashboardPath);

    const signinUrl = new URL(`${baseUrl}/api/auth/signin/google`);
    signinUrl.searchParams.set("callbackUrl", callbackUrl.toString());
    return NextResponse.redirect(signinUrl, { status: 302 });
  }

  const email = session.user.email.trim();
  const merchant = await prisma.merchant.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: {
      slug: true,
      status: true,
    },
  });

  if (!merchant || merchant.status !== "approved") {
    const merchantErrorRedirect = appendParams(mobileRedirect, {
      status: "error",
      reason: "merchant_not_approved",
      merchantStatus: merchant?.status || "none",
      apiBaseUrl: baseUrl,
      dashboardPath,
    });
    return NextResponse.redirect(merchantErrorRedirect, { status: 302 });
  }

  const oneTimeToken = `mbl_${crypto.randomBytes(32).toString("hex")}`;
  await prisma.extensionToken.create({
    data: {
      email,
      token: oneTimeToken,
      expiresAt: new Date(Date.now() + MOBILE_ONE_TIME_TOKEN_TTL_MS),
      usedAt: null,
    },
  });

  const successRedirect = appendParams(mobileRedirect, {
    status: "success",
    email,
    apiBaseUrl: baseUrl,
    dashboardPath,
    merchantSlug: merchant.slug,
    merchantStatus: merchant.status,
    oneTimeToken,
  });

  return NextResponse.redirect(successRedirect, { status: 302 });
}
