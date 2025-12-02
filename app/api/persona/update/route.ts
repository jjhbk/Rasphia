import { NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import { defaultPersona } from "@/app/utils/defaultPersona";

function deepMerge(target: any, patch: any) {
  for (const key in patch) {
    if (
      patch[key] &&
      typeof patch[key] === "object" &&
      !Array.isArray(patch[key])
    ) {
      target[key] = deepMerge(target[key] || {}, patch[key]);
    } else {
      target[key] = patch[key];
    }
  }
  return target;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, persona: patch } = body;

    if (!email) {
      return NextResponse.json({ error: "email required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("rasphia");

    const user = await db.collection("users").findOne({ email });

    const original = user?.persona || defaultPersona;
    const merged = deepMerge({ ...original }, patch);

    await db.collection("users").updateOne(
      { email },
      {
        $set: {
          persona: merged,
          updatedAt: new Date().toISOString(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ ok: true, persona: merged });
  } catch (err) {
    console.error("update-persona error:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
