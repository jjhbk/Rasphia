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

      skin: {
        skinType: persona.skin?.skinType || "Unknown",
        concerns: persona.skin?.concerns || [],
        sensitivity: persona.skin?.sensitivity || "",
        fitzpatrickType: persona.skin?.fitzpatrickType || "",
        climateContext: persona.skin?.climateContext || "",
        updatedAt: persona.skin?.updatedAt || null,
      },

      hair: {
        hairType: persona.hair?.hairType || "Unknown",
        density: persona.hair?.density || "",
        scalpType: persona.hair?.scalpType || "",
        goals: persona.hair?.goals || [],
        lifestyle: persona.hair?.lifestyle || [],
        updatedAt: persona.hair?.updatedAt || null,
      },

      body: {
        bodyType: persona.body?.bodyType || "",
        estimatedBodyFatPercent: persona.body?.estimatedBodyFatPercent || "",
        proportions: persona.body?.proportions || [],
        fitPreferences: persona.body?.fitPreferences || [],
        activities: persona.body?.activities || [],
        updatedAt: persona.body?.updatedAt || null,
      },

      lifestyle: {
        work: persona.lifestyle?.work || "",
        diet: persona.lifestyle?.diet || "",
        fitness: persona.lifestyle?.fitness || [],
        travelFrequency: persona.lifestyle?.travelFrequency || "",
        climateContext: persona.lifestyle?.climateContext || "",
        sleepQuality: persona.lifestyle?.sleepQuality || "",
        stressLevel: persona.lifestyle?.stressLevel || "",
        updatedAt: persona.lifestyle?.updatedAt || null,
      },

      taste: {
        giftingStyle: persona.taste?.giftingStyle || [],
        homeAesthetic: persona.taste?.homeAesthetic || [],
        scentPreferences: persona.taste?.scentPreferences || [],
        materialPreferences: persona.taste?.materialPreferences || [],
        priceComfort: persona.taste?.priceComfort || "",
        updatedAt: persona.taste?.updatedAt || null,
      },

      style: {
        archetypes: persona.style?.archetypes || [],
        colorsLike: persona.style?.colorsLike || [],
        colorsAvoid: persona.style?.colorsAvoid || [],
        boldness: persona.style?.boldness || "",
        occasions: persona.style?.occasions || [],
        footwear: persona.style?.footwear || [],
        accessories: persona.style?.accessories || [],
        updatedAt: persona.style?.updatedAt || null,
      },

      home: {
        aesthetic: persona.home?.aesthetic || [],
        materials: persona.home?.materials || [],
        colors: persona.home?.colors || [],
        decorElements: persona.home?.decorElements || [],
        lightingStyle: persona.home?.lightingStyle || "",
        budget: persona.home?.budget || "",
        updatedAt: persona.home?.updatedAt || null,
      },
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
