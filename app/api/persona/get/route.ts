import { NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import { defaultPersona } from "@/app/utils/defaultPersona";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const email = url.searchParams.get("email");

    if (!email)
      return NextResponse.json({ error: "email required" }, { status: 400 });

    const client = await clientPromise;
    const db = client.db("rasphia");

    const user = await db.collection("users").findOne({ email });

    const persona = {
      ...(user?.persona || {}),
    };

    return NextResponse.json({ persona });
  } catch (err) {
    console.error("get-persona error:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
