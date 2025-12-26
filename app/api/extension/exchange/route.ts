import { SignJWT } from "jose";
import { NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
export const runtime = "nodejs";

const secret = new TextEncoder().encode(process.env.EXTENSION_JWT_SECRET!);

export async function POST(req: Request) {
  const { one_time_token } = await req.json();
  const client = await clientPromise;
  const db = client.db("rasphia");

  const tokenRecord = await db.collection("extension_tokens").findOne({
    token: one_time_token,
  });

  if (!tokenRecord)
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });

  if (tokenRecord.consumed)
    return NextResponse.json({ error: "Token already used" }, { status: 400 });

  if (new Date(tokenRecord.expiresAt) < new Date())
    return NextResponse.json({ error: "Token expired" }, { status: 400 });

  await db
    .collection("extension_tokens")
    .updateOne({ token: one_time_token }, { $set: { consumed: true } });

  // ✅ FINAL, CORRECT JWT
  const jwtToken = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" }) // 🔥 REQUIRED
    .setSubject(tokenRecord.email) // sub
    .setAudience("rasphia_extension") // aud
    .setIssuer("rasphia") // iss
    .setExpirationTime("7d") // exp
    .sign(secret);

  return NextResponse.json(
    {
      access_token: jwtToken,
      expires_in: 7 * 24 * 3600,
    },
    {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "chrome-extension://*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, X-Rasphia-Extension-Token",
      },
    }
  );
}
