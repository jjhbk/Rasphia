import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { verifyExtensionTokenFromString } from "@/app/lib/verifyExtTokenString";
import { handleOptions, withExtensionCors } from "@/app/lib/extensionCors";

export const runtime = "nodejs";
export const OPTIONS = handleOptions;

export const POST = withExtensionCors(async (req: Request) => {
  try {
    // Parse form data
    const form = await req.formData();
    const userFile = form.get("userImage") as File | null;
    const productUrl = form.get("productImageUrl") as string | null;
    const extToken = form.get("ext_token") as string | null;

    // Auth
    if (!extToken) {
      return NextResponse.json({ error: "Missing token" }, { status: 401 });
    }

    const email = verifyExtensionTokenFromString(extToken);
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!userFile || !productUrl) {
      return NextResponse.json(
        { error: "Missing userImage or productImageUrl" },
        { status: 400 }
      );
    }

    console.log("GEMINI TRYON REQUEST for:", email);

    // Fetch product image
    const productRes = await fetch(productUrl);
    if (!productRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch product image" },
        { status: 400 }
      );
    }

    const productBuf = Buffer.from(await productRes.arrayBuffer());
    const productBase64 = productBuf.toString("base64");
    const productMime = productRes.headers.get("content-type") || "image/jpeg";

    // Convert user image
    const userBuf = Buffer.from(await userFile.arrayBuffer());
    const userBase64 = userBuf.toString("base64");

    // Init Gemini client
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY!,
    });

    // Prompt
    const prompt = {
      text: `
Identify the images provided:
1. The FIRST image is the "Target Outfit" (clothing product).
2. The SECOND image is the "User Model" (person).

TASK: Create a photorealistic virtual try-on.
Generate a NEW image of the person from the SECOND image wearing the outfit from the FIRST image.

CRITICAL REQUIREMENTS:
- STRUCTURE: Preserve the exact pose, body shape, and environment of the User Model (Image 2).
- IDENTITY: Keep the User Model's face, hair, and skin tone exactly as they appear.
- CLOTHING: Replace the User Model's original clothes entirely with the Target Outfit (Image 1).
- REALISM: Ensure natural fabric draping, lighting matching the room, and realistic shadows.
- OUTPUT: A high-quality photorealistic image.`,
    };

    // Gemini contents
    const contents = [
      prompt,
      {
        inlineData: {
          mimeType: productMime,
          data: productBase64,
        },
      },
      {
        inlineData: {
          mimeType: userFile.type || "image/jpeg",
          data: userBase64,
        },
      },
    ];

    // Gemini call
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents,
    });

    const parts =
      response?.candidates?.[0]?.content?.parts?.filter(
        (p: any) => p.inlineData
      ) ?? [];

    if (!parts.length) {
      return NextResponse.json(
        { error: "no_image_generated", detail: response },
        { status: 500 }
      );
    }

    const resultBase64 = (parts[0] as any).inlineData.data;

    return NextResponse.json(
      {
        ok: true,
        tryonImage: resultBase64,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("🔥 GEMINI TRYON ERROR:", err);
    return NextResponse.json(
      { error: "server_error", detail: String(err) },
      { status: 500 }
    );
  }
});
