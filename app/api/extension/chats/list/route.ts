// app/api/chats/list/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import { verifyExtensionToken } from "@/app/lib/verifyExtToken";

export async function GET(req: Request) {
  try {
    // 1️⃣ EXTENSION-ONLY AUTH
    const email = await verifyExtensionToken(req.headers.get("authorization"));
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2️⃣ Connect to DB
    const client = await clientPromise;
    const db = client.db("rasphia");

    // 3️⃣ Fetch user chats sorted by updated time
    const chats = await db
      .collection("chats")
      .find({ email })
      .sort({ updatedAt: -1 })
      .project({
        messages: { $slice: 1 }, // return only last message for sidebar speed
      })
      .toArray();

    return NextResponse.json(chats, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  } catch (err: any) {
    console.error("❌ Chat list error:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      }
    );
  }
}
