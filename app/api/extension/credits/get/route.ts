import { NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import { verifyExtensionToken } from "@/app/lib/verifyExtToken";
import { handleOptions, withExtensionCors } from "@/app/lib/extensionCors";

export const runtime = "nodejs";
export const OPTIONS = handleOptions;

export const GET = withExtensionCors(async (req: Request) => {
  // 1️⃣ Extension auth
  const email = await verifyExtensionToken(req);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2️⃣ DB lookup
  const client = await clientPromise;
  const db = client.db("rasphia");

  const user = await db
    .collection("user_profiles")
    .findOne({ email }, { projection: { credits: 1 } });

  // 3️⃣ Return credits (default 0)
  return NextResponse.json({ credits: user?.credits ?? 0 }, { status: 200 });
});
