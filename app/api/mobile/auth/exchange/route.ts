import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { prisma } from "@/app/lib/prisma";

const secretRaw =
  process.env.MOBILE_APP_JWT_SECRET || process.env.EXTENSION_JWT_SECRET || "";
const secret = secretRaw ? new TextEncoder().encode(secretRaw) : null;

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    if (!secret) {
      return NextResponse.json(
        { error: "Missing MOBILE_APP_JWT_SECRET configuration" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const oneTimeToken = String(body?.one_time_token || "").trim();
    if (!oneTimeToken) {
      return NextResponse.json(
        { error: "one_time_token is required" },
        { status: 400 }
      );
    }

    const tokenRecord = await prisma.extensionToken.findUnique({
      where: { token: oneTimeToken },
    });

    if (!tokenRecord) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }
    if (tokenRecord.usedAt) {
      return NextResponse.json(
        { error: "Token already used" },
        { status: 400 }
      );
    }
    if (new Date(tokenRecord.expiresAt) < new Date()) {
      return NextResponse.json({ error: "Token expired" }, { status: 400 });
    }

    await prisma.extensionToken.update({
      where: { token: oneTimeToken },
      data: { usedAt: new Date() },
    });

    const accessToken = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(tokenRecord.email)
      .setAudience("rasphia_mobile_app")
      .setIssuer("rasphia")
      .setExpirationTime("7d")
      .sign(secret);

    return NextResponse.json(
      {
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: 7 * 24 * 3600,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to exchange auth token";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
