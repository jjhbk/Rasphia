import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import { authGuard } from "@/app/lib/auth-guard";
import { processImageAnalysis } from "@/app/lib/analysis/processImageAnalysis";

export async function POST(req: NextRequest) {
  try {
    // 1️⃣ Authenticate user session
    const { sessionEmail, errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;

    // 2️⃣ Parse multipart form data safely
    const form = await req.formData();

    const email = form.get("email") as string;
    const type = form.get("type") as string;
    const files = form.getAll("files") as File[];

    if (!email || !files.length) {
      return NextResponse.json(
        { error: "Missing email or files" },
        { status: 400 }
      );
    }

    // 3️⃣ Enforce identity — user can ONLY upload for themselves
    if (email !== sessionEmail) {
      return NextResponse.json(
        { error: "Forbidden: Cannot upload images for another user." },
        { status: 403 }
      );
    }

    if (!type || typeof type !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid analysis type" },
        { status: 400 }
      );
    }

    // 4️⃣ Process images using your AI pipeline
    const results = [];
    for (const file of files) {
      const doc = await processImageAnalysis(file, type, sessionEmail);
      results.push(doc);
    }

    // 5️⃣ Merge persona data from first result
    const merged = {
      photoUrls: results.map((r) => r.fileUrl),
      ...results[0].aiResult,
      updatedAt: new Date().toISOString(),
    };

    // 6️⃣ Save persona update (per type)
    const client = await clientPromise;
    const db = client.db("rasphia");

    await db.collection("users").updateOne(
      { email: sessionEmail }, // secure — trust session only
      {
        $set: {
          [`persona.${type}`]: merged,
        },
      },
      { upsert: true }
    );

    // 7️⃣ Return results
    return NextResponse.json(
      {
        ok: true,
        persona: merged,
        analyses: results,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("PERSONA ANALYSIS ERR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
