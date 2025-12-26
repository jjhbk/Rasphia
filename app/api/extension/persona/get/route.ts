import { NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import { defaultPersona } from "@/app/utils/defaultPersona";
import { verifyExtensionToken } from "@/app/lib/verifyExtToken";
import { handleOptions, withExtensionCors } from "@/app/lib/extensionCors";

export const runtime = "nodejs";
export const OPTIONS = handleOptions;

export const GET = withExtensionCors(async (req: Request) => {
  try {
    // 1️⃣ Extension token auth (NOT session-based)
    const email = await verifyExtensionToken(req);
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db("rasphia");

    // 2️⃣ Fetch user persona
    const user = await db
      .collection("users")
      .findOne({ email }, { projection: { persona: 1 } });

    // 3️⃣ Merge persona with defaults
    const persona = {
      ...(defaultPersona || {}),
      ...(user?.persona || {}),
    };

    // 4️⃣ Extension-friendly preview
    const preview = {
      name: persona.name || "Your Persona",
      summary: persona.summary || "",
      skin: { skinType: persona.skin?.skinType || "Unknown" },
      hair: { hairType: persona.hair?.hairType || "Unknown" },
      style: { archetypes: persona.style?.archetypes || [] },
    };

    return NextResponse.json(
      {
        email,
        persona,
        preview,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("EXT-PERSONA-GET ERROR:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
});
