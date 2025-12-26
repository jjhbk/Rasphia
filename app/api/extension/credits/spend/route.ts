import { NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import { verifyExtensionToken } from "@/app/lib/verifyExtToken";
import { handleOptions, withExtensionCors } from "@/app/lib/extensionCors";

export const runtime = "nodejs";
export const OPTIONS = handleOptions;

export const POST = withExtensionCors(async (req: Request) => {
  // 1️⃣ Extension auth
  const email = await verifyExtensionToken(req);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2️⃣ Parse + validate input
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
    reason: reason ?? "usage",
    createdAt: new Date(),
  });

  // 5️⃣ Response
  return NextResponse.json({ ok: true }, { status: 200 });
});
