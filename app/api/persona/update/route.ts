import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import { defaultPersona } from "@/app/utils/defaultPersona";
import { authGuard } from "@/app/lib/auth-guard";

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

export async function POST(req: NextRequest) {
  try {
    // 1️⃣ Authenticate user
    const { sessionEmail, body, errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;

    // Extract persona patch safely from body
    const { persona: patch } = body;

    if (!patch || typeof patch !== "object") {
      return NextResponse.json(
        { error: "Invalid or missing persona patch" },
        { status: 400 }
      );
    }

    const email = sessionEmail; // 🔐 NEVER trust email from client

    const client = await clientPromise;
    const db = client.db("rasphia");

    // 2️⃣ Load existing persona
    const user = await db.collection("users").findOne({ email });
    const original = user?.persona || defaultPersona;

    // 3️⃣ Deep merge patch → persona
    const merged = deepMerge({ ...original }, patch);

    // 4️⃣ Update persona safely (ONLY for logged-in user)
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
