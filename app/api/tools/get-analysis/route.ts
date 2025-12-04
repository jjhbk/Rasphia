// app/api/tools/get-analysis/route.ts

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import { authGuard } from "@/app/lib/auth-guard";

export async function GET(req: NextRequest) {
  try {
    // 1️⃣ Authenticate user
    const { sessionEmail, errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;

    const id = req.nextUrl.searchParams.get("analysisId");
    if (!id) {
      return NextResponse.json(
        { error: "Missing analysisId" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("rasphia");

    // 2️⃣ Load analysis
    const doc = await db.collection("analyses").findOne({ analysisId: id });

    if (!doc) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 }
      );
    }

    // 3️⃣ Verify the analysis belongs to the logged-in user
    if (doc.userEmail !== sessionEmail) {
      return NextResponse.json(
        { error: "Forbidden: You do not own this analysis" },
        { status: 403 }
      );
    }

    // 4️⃣ Return the analysis safely
    return NextResponse.json(doc, { status: 200 });
  } catch (err) {
    console.error("❌ get-analysis error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
