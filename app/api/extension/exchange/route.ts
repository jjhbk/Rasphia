import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";

export async function POST(req: Request) {
  const { one_time_token } = await req.json();
  const client = await clientPromise;
  const db = client.db("rasphia");

  const tokenRecord = await db.collection("extension_tokens").findOne({
    token: one_time_token,
  });

  if (!tokenRecord) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  if (tokenRecord.consumed) {
    return NextResponse.json({ error: "Token already used" }, { status: 400 });
  }

  if (new Date(tokenRecord.expiresAt) < new Date()) {
    return NextResponse.json({ error: "Token expired" }, { status: 400 });
  }

  // mark used
  await db
    .collection("extension_tokens")
    .updateOne({ token: one_time_token }, { $set: { consumed: true } });

  // issue JWT bound to EMAIL
  const jwtToken = jwt.sign(
    {
      sub: tokenRecord.email, // <==== email
      aud: "rasphia_extension",
    },
    process.env.EXTENSION_JWT_SECRET!,
    { expiresIn: "7d" }
  );

  return NextResponse.json({
    access_token: jwtToken,
    expires_in: 7 * 24 * 3600,
  });
}
