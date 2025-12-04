// app/api/chats/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import { authGuard } from "@/app/lib/auth-guard";

export async function GET(req: NextRequest) {
  try {
    // 1️⃣ Authenticate and authorize
    const { sessionEmail, errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;

    // 2️⃣ Extract query
    const q = String(req.nextUrl.searchParams.get("q") ?? "").trim();

    const client = await clientPromise;
    const db = client.db("rasphia");

    // 3️⃣ If query is empty → return all user's chats
    if (!q) {
      const chats = await db
        .collection("chats")
        .find({ userEmail: sessionEmail })
        .sort({ updatedAt: -1 })
        .toArray();

      return NextResponse.json(chats, { status: 200 });
    }

    // 4️⃣ Escape regex characters to avoid injection
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");

    // 5️⃣ Search across user's own chats only
    const chats = await db
      .collection("chats")
      .find({
        userEmail: sessionEmail,
        $or: [
          { title: { $regex: regex } },
          { "messages.text": { $regex: regex } },
        ],
      })
      .sort({ updatedAt: -1 })
      .toArray();

    return NextResponse.json(chats, { status: 200 });
  } catch (err: any) {
    console.error("Chat search error:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
