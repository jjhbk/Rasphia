import { NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import { verifyExtensionToken } from "@/app/lib/verifyExtToken";

export async function GET(req: Request) {
  const email = await verifyExtensionToken(req.headers.get("authorization"));
  if (!email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await clientPromise;
  const db = client.db("rasphia");

  const user = await db
    .collection("user_profiles")
    .findOne({ email }, { projection: { credits: 1 } });

  return NextResponse.json({ credits: user?.credits ?? 0 });
}
