import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import { authGuard } from "@/app/lib/auth-guard";

export async function POST(req: NextRequest) {
  try {
    // 1️⃣ Authenticate user
    const { sessionEmail, body, errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;

    // Extract allowed fields
    const { name, phone, address, wishlist } = body;

    const client = await clientPromise;
    const db = client.db("rasphia");

    // 2️⃣ Update only the logged-in user's profile
    await db.collection("user_profiles").updateOne(
      { email: sessionEmail },
      {
        $set: {
          ...(name !== undefined && { name }),
          ...(phone !== undefined && { phone }),
          ...(address !== undefined && { address }),
          ...(wishlist !== undefined && { wishlist }),
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ update-profile error:", err);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
