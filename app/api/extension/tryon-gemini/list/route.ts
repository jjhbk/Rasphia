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

    // 🖼️ Fetch try-ons (newest first)
    const tryons = await db
      .collection("tryons")
      .find({ email })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json(
      tryons.map((t) => ({
        tryonId: t.tryonId,
        imageUrl: t.imageUrl,
        shareUrl: t.shareUrl,
        productImageUrl: t.productImageUrl ?? null,
        createdAt: t.createdAt,
      })),
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ LIST TRYONS ERROR:", err);
    return NextResponse.json(
      { error: "Failed to load try-ons" },
      { status: 500 }
    );
  }
});
