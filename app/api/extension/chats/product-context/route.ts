import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/app/lib/mongodb";
import { verifyExtensionToken } from "@/app/lib/verifyExtToken";
import { handleOptions, withExtensionCors } from "@/app/lib/extensionCors";

export const runtime = "nodejs";
export const OPTIONS = handleOptions;

export const POST = withExtensionCors(async (req: Request) => {
  try {
    const email = await verifyExtensionToken(req);
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { chatId, products } = await req.json();

    if (!chatId || !ObjectId.isValid(chatId)) {
      return NextResponse.json(
        { error: "Invalid or missing chatId" },
        { status: 400 }
      );
    }

    if (!products || !Array.isArray(products)) {
      return NextResponse.json(
        { error: "Products array required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("rasphia");

    const result = await db.collection("chats").updateOne(
      {
        _id: new ObjectId(chatId),
        userEmail: email,
      },
      {
        $set: {
          "context.products": products, // ✅ stored ON CHAT
          updatedAt: new Date().toISOString(),
        },
      }
    );

    if (!result.matchedCount) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ Attach product context error:", err);
    return NextResponse.json(
      { error: "Failed to attach product context" },
      { status: 500 }
    );
  }
});
