import { SignJWT } from "jose";
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";

const secret = new TextEncoder().encode(process.env.EXTENSION_JWT_SECRET!);

const corsHeaders = {
  "Access-Control-Allow-Origin": "chrome-extension://*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Rasphia-Extension-Token",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: Request) {
  const { one_time_token } = await req.json();

  const tokenRecord = await prisma.extensionToken.findUnique({
    where: { token: one_time_token },
  });

  if (!tokenRecord) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  if (tokenRecord.usedAt) {
    return NextResponse.json({ error: "Token already used" }, { status: 400 });
  }

  if (new Date(tokenRecord.expiresAt) < new Date()) {
    return NextResponse.json({ error: "Token expired" }, { status: 400 });
  }

  await prisma.extensionToken.update({
    where: { token: one_time_token },
    data: { usedAt: new Date() },
  });

  const jwtToken = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(tokenRecord.email)
    .setAudience("rasphia_extension")
    .setIssuer("rasphia")
    .setExpirationTime("7d")
    .sign(secret);

  return NextResponse.json(
    {
      access_token: jwtToken,
      expires_in: 7 * 24 * 3600,
    },
    {
      status: 200,
      headers: corsHeaders,
    }
  );
}
