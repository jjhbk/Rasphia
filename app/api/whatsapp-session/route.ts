// app/api/whatsapp-session/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";

export async function POST(req: NextRequest) {
  const { phone, data } = await req.json();
  if (!phone || !data)
    return NextResponse.json({ error: "phone/data required" }, { status: 400 });

  const client = await clientPromise;
  const db = client.db("rasphia");
  await db
    .collection("whatsapp_sessions")
    .updateOne(
      { phone },
      { $set: { data, updatedAt: new Date() } },
      { upsert: true }
    );
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const phone = String(req.nextUrl.searchParams.get("phone") || "");
  if (!phone)
    return NextResponse.json({ error: "phone required" }, { status: 400 });

  const client = await clientPromise;
  const db = client.db("rasphia");
  const doc = await db.collection("whatsapp_sessions").findOne({ phone });
  return NextResponse.json({ data: doc?.data || null });
}
