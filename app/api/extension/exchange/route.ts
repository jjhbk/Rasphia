import { SignJWT } from "jose";
import { NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import { withExtensionCors } from "@/app/lib/extensionCors";

export const runtime = "nodejs";

const secret = new TextEncoder().encode(process.env.EXTENSION_JWT_SECRET!);

/**
 * ✅ REQUIRED for Chrome extension preflight
 * Next.js App Router will NOT call POST for OPTIONS
 */
export const OPTIONS = withExtensionCors(async () => {
  return new NextResponse(null);
});

export const POST = withExtensionCors(async (req: Request) => {
  const { one_time_token } = await req.json();

  if (!one_time_token) {
    return NextResponse.json(
      { error: "Missing one_time_token" },
      { status: 400 }
    );
  }

  const client = await clientPromise;
  const db = client.db("rasphia");

  const tokenRecord = await db
    .collection("extension_tokens")
    .findOne({ token: one_time_token });

  if (!tokenRecord) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  if (tokenRecord.consumed) {
    return NextResponse.json({ error: "Token already used" }, { status: 400 });
  }

  if (new Date(tokenRecord.expiresAt) < new Date()) {
    return NextResponse.json({ error: "Token expired" }, { status: 400 });
  }

  await db
    .collection("extension_tokens")
    .updateOne({ token: one_time_token }, { $set: { consumed: true } });

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
      expires_in: 7 * 24 * 60 * 60,
    },
    { status: 200 }
  );
});
