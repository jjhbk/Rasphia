import { NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import { processImageAnalysis } from "@/app/lib/analysis/processImageAnalysis";

export async function POST(req: Request) {
  try {
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

    const results = [];
    for (const file of files) {
      const doc = await processImageAnalysis(file, type, email);
      results.push(doc);
    }

    // merge persona
    const merged = {
      photoUrls: results.map((r) => r.fileUrl),
      ...results[0].aiResult,
      updatedAt: new Date().toISOString(),
    };

    // save persona patch
    const client = await clientPromise;
    const db = client.db("rasphia");

    await db
      .collection("users")
      .updateOne(
        { email },
        { $set: { [`persona.${type}`]: merged } },
        { upsert: true }
      );

    return NextResponse.json({ ok: true, persona: merged, analyses: results });
  } catch (err) {
    console.error("PERSONA ANALYSIS ERR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
