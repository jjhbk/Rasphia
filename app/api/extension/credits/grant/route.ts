import { NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import { verifyExtensionToken } from "@/app/lib/verifyExtToken";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const email = await verifyExtensionToken(req);
  if (!email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { amount, reason } = await req.json();

  const client = await clientPromise;
  const db = client.db("rasphia");

  await db
    .collection("user_profiles")
    .updateOne({ email }, { $inc: { credits: amount } });

  await db.collection("credit_ledger").insertOne({
    email,
    type: "credit",
    amount,
    reason,
    createdAt: new Date(),
  });

  return NextResponse.json({ ok: true });
}
