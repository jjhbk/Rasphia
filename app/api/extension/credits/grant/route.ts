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

  if (typeof amount !== "number" || !Number.isFinite(amount) || amount === 0) {
    return NextResponse.json(
      { error: "Invalid credit amount" },
      { status: 400 }
    );
  }

  if (reason && typeof reason !== "string") {
    return NextResponse.json({ error: "Invalid reason" }, { status: 400 });
  }

  // 3️⃣ DB ops
  const client = await clientPromise;
  const db = client.db("rasphia");

  await db.collection("user_profiles").updateOne(
    { email },
    { $inc: { credits: amount } },
    { upsert: true } // ensure profile exists
  );

  await db.collection("credit_ledger").insertOne({
    email,
    type: "credit",
    amount,
    reason: reason ?? "manual_adjustment",
    createdAt: new Date(),
  });

  // 4️⃣ Response
  return NextResponse.json({ ok: true }, { status: 200 });
});
