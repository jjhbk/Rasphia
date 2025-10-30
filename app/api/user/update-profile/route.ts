import { NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";

export async function POST(req: Request) {
  const data = await req.json();
  const { email, name, phone, address, wishlist } = data;
  if (!email)
    return NextResponse.json({ error: "Email required" }, { status: 400 });

  const client = await clientPromise;
  const db = client.db("rasphia");
  await db.collection("user_profiles").updateOne(
    { email },
    {
      $set: { name, phone, address, wishlist, updatedAt: new Date() },
    },
    { upsert: true }
  );

  return NextResponse.json({ success: true });
}
