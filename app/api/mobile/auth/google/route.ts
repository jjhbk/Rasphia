import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { resolveManagementAccessByEmail } from "@/app/lib/auth";

const mobileSecretRaw =
  process.env.MOBILE_APP_JWT_SECRET || process.env.EXTENSION_JWT_SECRET || "";
const mobileSecret = mobileSecretRaw
  ? new TextEncoder().encode(mobileSecretRaw)
  : null;

function getAllowedAudiences() {
  const csv = String(process.env.MOBILE_GOOGLE_ALLOWED_AUDIENCES || "").trim();
  if (csv) {
    return csv
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [String(process.env.GOOGLE_CLIENT_ID || "").trim()].filter(Boolean);
}

type GoogleTokenInfo = {
  email?: string;
  email_verified?: string;
  aud?: string;
  iss?: string;
  exp?: string;
};

async function verifyGoogleIdToken(idToken: string): Promise<string | null> {
  const allowedAudiences = getAllowedAudiences();
  if (!allowedAudiences.length) return null;

  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(
      idToken
    )}`,
    { method: "GET", cache: "no-store" }
  );
  if (!response.ok) return null;

  const data = (await response.json()) as GoogleTokenInfo;
  const email = String(data.email || "").trim().toLowerCase();
  const audience = String(data.aud || "").trim();
  const issuer = String(data.iss || "").trim();
  const emailVerified = String(data.email_verified || "").trim() === "true";
  const exp = Number(data.exp || "0");

  if (!email || !emailVerified) return null;
  if (!allowedAudiences.includes(audience)) return null;
  if (
    issuer !== "https://accounts.google.com" &&
    issuer !== "accounts.google.com"
  ) {
    return null;
  }
  if (!Number.isFinite(exp) || exp * 1000 <= Date.now()) return null;

  return email;
}

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    if (!mobileSecret) {
      return NextResponse.json(
        { error: "Missing MOBILE_APP_JWT_SECRET configuration" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const idToken = String(body?.id_token || body?.idToken || "").trim();
    if (!idToken) {
      return NextResponse.json(
        { error: "id_token is required" },
        { status: 400 }
      );
    }

    const email = await verifyGoogleIdToken(idToken);
    if (!email) {
      return NextResponse.json(
        { error: "Invalid Google token" },
        { status: 401 }
      );
    }

    const access = await resolveManagementAccessByEmail(email);

    const accessToken = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(access.email)
      .setAudience("rasphia_mobile_app")
      .setIssuer("rasphia")
      .setExpirationTime("7d")
      .sign(mobileSecret);

    return NextResponse.json(
      {
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: 7 * 24 * 3600,
        management: {
          role: access.role,
          merchantId: access.merchantId,
          merchantStatus: access.merchantStatus,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed mobile Google auth";
    if (
      message.startsWith("Unauthorized") ||
      message.startsWith("Forbidden")
    ) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
