import { NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  if (!email)
    return NextResponse.json({ error: "Missing email" }, { status: 400 });

  const client = await clientPromise;
  const db = client.db("rasphia");
  const user = await db.collection("user_profiles").findOne({ email });
  return NextResponse.json(user || {});
}
