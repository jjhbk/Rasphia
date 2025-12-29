import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { verifyExtensionTokenFromString } from "@/app/lib/verifyExtTokenString";
import { handleOptions, withExtensionCors } from "@/app/lib/extensionCors";
import { put } from "@vercel/blob";
import crypto from "crypto";

export const runtime = "nodejs";
export const OPTIONS = handleOptions;

export const POST = withExtensionCors(async (req: Request) => {
  try {
    const form = await req.formData();
    const userFile = form.get("userImage") as File | null;
    const productUrl = form.get("productImageUrl") as string | null;
    const extToken = form.get("ext_token") as string | null;

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

    console.log("👗 GEMINI TRY-ON for:", email);

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

    // User image
    const userBuf = Buffer.from(await userFile.arrayBuffer());
    const userBase64 = userBuf.toString("base64");

    // Gemini
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY!,
    });

    // Prompt
    const prompt = {
      text: `
Identify the images provided:
1. The FIRST image is the "Target Product".
2. The SECOND image is the "User Model".

TASK:
Create a photorealistic digital try-on by generating a NEW image of the User Model wearing or using the Target Product.

CORE REQUIREMENTS:
- STRUCTURE: Preserve the exact pose, body shape, facial structure, and environment of the User Model.
- IDENTITY: Keep the User Model’s face, hair, skin tone, and expression exactly as shown.
- REALISM: Match lighting, shadows, reflections, and perspective to the original environment.
- QUALITY: Output a high-resolution, photorealistic image with natural textures and materials.

PRODUCT APPLICATION RULES:
- If the Target Product is CLOTHING or FOOTWEAR:
  - Replace ONLY the relevant clothing or footwear region.
  - Preserve all other clothing and accessories.
  - Ensure realistic fabric drape, folds, and grounding with accurate shadows.

- If the Target Product is JEWELLERY, EYEWEAR, or ACCESSORIES:
  - Preserve the User Model’s original clothing.
  - Place the product on anatomically correct positions:
    - Eyewear → nose bridge and ears
    - Jewellery → neck, ears, wrists, fingers
    - Accessories → hands, shoulders, waist, or wrist as appropriate
  - Ensure correct scale, weight, and natural alignment.
  - Avoid floating, clipping, or distortion.

- If the Target Product is a HIGH-END or LUXURY item:
  - Preserve fine details such as stitching, texture grain, metal reflections, and brand elements.
  - Avoid over-smoothing or artificial beautification.
  - Maintain a premium, realistic look rather than a stylized or exaggerated output.

FINAL OUTPUT:
- The result must look like a real photograph taken in the same environment as the original User Model image.

`,
    };

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

    // Convert Gemini base64 → buffer
    const imageBase64 = (parts[0] as any).inlineData.data;
    const imageBuffer = Buffer.from(imageBase64, "base64");

    // Upload to Vercel Blob
    const id = crypto.randomUUID();

    const blob = await put(`tryons/${id}.png`, imageBuffer, {
      access: "public",
      contentType: "image/png",
    });

    const shareUrl = `https://rasphia.com/tryon/${id}`;
    console.log("the links are", blob.url, blob.downloadUrl, shareUrl);
    return NextResponse.json(
      {
        ok: true,
        imageUrl: blob.url,
        shareUrl: shareUrl,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("🔥 TRY-ON ERROR:", err);
    return NextResponse.json(
      { error: "server_error", detail: String(err) },
      { status: 500 }
    );
  }
});
