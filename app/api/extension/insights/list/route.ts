import { NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import { verifyExtensionToken } from "@/app/lib/verifyExtToken";
import { handleOptions, withExtensionCors } from "@/app/lib/extensionCors";

export const runtime = "nodejs";
export const OPTIONS = handleOptions;

export const GET = withExtensionCors(async (req: Request) => {
  try {
    // 🔐 Auth
    const email = await verifyExtensionToken(req);
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db("rasphia");

    // 🔍 Fetch latest insights (newest first)
    const insights = await db
      .collection("product_insights")
      .find({ email })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json(
      insights.map((i) => ({
        id: i.insightId,
        chatId: i.chatId ?? null,
        product: i.product ?? null,
        analysis: i.analysis,
        createdAt: i.createdAt,
      })),
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ LIST INSIGHTS ERROR:", err);
    return NextResponse.json(
      { error: "Failed to load insights" },
      { status: 500 }
    );
  }
});
