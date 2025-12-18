import { NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import { verifyExtensionToken } from "@/app/lib/verifyExtToken";

export async function POST(req: Request) {
  const email = await verifyExtensionToken(req.headers.get("authorization"));
  if (!email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { amount, reason } = await req.json();

  const client = await clientPromise;
  const db = client.db("rasphia");

  const user = await db.collection("user_profiles").findOne({ email });

  if (!user || (user.credits ?? 0) < amount) {
    return NextResponse.json(
      { error: "Insufficient credits" },
      { status: 400 }
    );
  }

  // deduct credits
  await db
    .collection("user_profiles")
    .updateOne({ email }, { $inc: { credits: -amount } });

  // log ledger entry
  await db.collection("credit_ledger").insertOne({
    email,
    type: "debit",
    amount,
    reason,
    createdAt: new Date(),
  });

  return NextResponse.json({ ok: true });
}
