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

    // 🎨 Fetch reimagined products (newest first)
    const reimagined = await db
      .collection("reimagined_products")
      .find({ email })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json(
      reimagined.map((r) => ({
        reimagineId: r.reimagineId,
        imageUrl: r.imageUrl,
        prompt: r.prompt,
        productImageUrl: r.productImageUrl ?? null,
        createdAt: r.createdAt,
      })),
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ LIST REIMAGINED PRODUCTS ERROR:", err);
    return NextResponse.json(
      { error: "Failed to load reimagined products" },
      { status: 500 }
    );
  }
});
