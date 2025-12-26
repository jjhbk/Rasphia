import { NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import { verifyExtensionToken } from "@/app/lib/verifyExtToken";
import { withExtensionCors, handleOptions } from "@/app/lib/extensionCors";

export const runtime = "nodejs";

/**
 * 🔑 REQUIRED for CORS preflight in App Router
 */
export const OPTIONS = handleOptions;

export const GET = withExtensionCors(async (req: Request) => {
  try {
    // 1️⃣ EXTENSION-ONLY AUTH
    const email = await verifyExtensionToken(req);
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2️⃣ Connect to DB
    const client = await clientPromise;
    const db = client.db("rasphia");

    // 3️⃣ Fetch user chats (extension schema)
    const chats = await db
      .collection("chats")
      .find({ userEmail: email })
      .sort({ updatedAt: -1 })
      .project({
        messages: { $slice: 1 }, // sidebar payload
      })
      .toArray();

    return NextResponse.json(chats, { status: 200 });
  } catch (err: any) {
    console.error("❌ Chat list error:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
});
