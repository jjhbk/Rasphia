// app/api/chats/search/route.ts
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

    // 2️⃣ Extract search query
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();

    const client = await clientPromise;
    const db = client.db("rasphia");

    // 3️⃣ If no query → return all chats for user
    if (!q) {
      const chats = await db
        .collection("chats")
        .find({ email })
        .sort({ updatedAt: -1 })
        .toArray();

      return NextResponse.json(chats, {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    // 4️⃣ Escape regex input (safer search)
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");

    // 5️⃣ Search user's chats (title + messages.text)
    const chats = await db
      .collection("chats")
      .find({
        email,
        $or: [
          { title: { $regex: regex } },
          { "messages.text": { $regex: regex } },
        ],
      })
      .sort({ updatedAt: -1 })
      .toArray();

    return NextResponse.json(chats, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  } catch (err: any) {
    console.error("❌ Chat search error:", err);
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
