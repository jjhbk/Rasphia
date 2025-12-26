import { NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import { verifyExtensionToken } from "@/app/lib/verifyExtToken";
import { handleOptions, withExtensionCors } from "@/app/lib/extensionCors";

export const runtime = "nodejs";
export const OPTIONS = handleOptions;

export const GET = withExtensionCors(async (req: Request) => {
  try {
    // 1️⃣ EXTENSION-ONLY AUTH
    const email = await verifyExtensionToken(req);
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2️⃣ Extract search query
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();

    const client = await clientPromise;
    const db = client.db("rasphia");

    // 3️⃣ No query → return all user chats
    if (!q) {
      const chats = await db
        .collection("chats")
        .find({ userEmail: email })
        .sort({ updatedAt: -1 })
        .toArray();

      return NextResponse.json(chats, { status: 200 });
    }

    // 4️⃣ Escape regex input (safe search)
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");

    // 5️⃣ Search user's chats (title + messages.text)
    const chats = await db
      .collection("chats")
      .find({
        userEmail: email,
        $or: [
          { title: { $regex: regex } },
          { "messages.text": { $regex: regex } },
        ],
      })
      .sort({ updatedAt: -1 })
      .toArray();

    return NextResponse.json(chats, { status: 200 });
  } catch (err: any) {
    console.error("❌ Chat search error:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
});
