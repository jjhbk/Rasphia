import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { verifyExtensionTokenFromString } from "@/app/lib/verifyExtTokenString";
import { handleOptions, withExtensionCors } from "@/app/lib/extensionCors";
import { put } from "@vercel/blob";
import crypto from "crypto";
import clientPromise from "@/app/lib/mongodb";

export const runtime = "nodejs";
export const OPTIONS = handleOptions;

export const POST = withExtensionCors(async (req: Request) => {
  try {
    const form = await req.formData();

    const productUrl = form.get("productImageUrl") as string | null;
    const promptText = form.get("prompt") as string | null;
    const extToken = form.get("ext_token") as string | null;

    // -----------------------------
    // Auth
    // -----------------------------
    if (!extToken) {
      return NextResponse.json({ error: "Missing token" }, { status: 401 });
    }

    const email = await verifyExtensionTokenFromString(extToken);
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!productUrl || !promptText) {
      return NextResponse.json(
        { error: "Missing productImageUrl or prompt" },
        { status: 400 }
      );
    }

    console.log("🎨 ONE-SHOT REIMAGINE for:", email);

    // -----------------------------
    // Fetch product image (URL-based)
    // -----------------------------
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

    // -----------------------------
    // Gemini
    // -----------------------------
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY!,
    });

    const prompt = {
      text: `
You are an expert product designer and photographer.

TASK:
Using the provided product image as the BASE,
generate a NEW photorealistic product image according to this instruction:

"${promptText}"

RULES:
- Preserve the original product category and proportions
- Do NOT add extra objects or backgrounds
- Maintain realistic materials, lighting, and shadows
- Keep camera angle unless explicitly requested
- Output ONLY the final product image
- Suitable for an e-commerce catalog
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
    ];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
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

    // -----------------------------
    // Convert → Upload
    // -----------------------------
    const imageBase64 = (parts[0] as any).inlineData.data;
    const imageBuffer = Buffer.from(imageBase64, "base64");

    const id = crypto.randomUUID();

    const blob = await put(`reimagined/${id}.png`, imageBuffer, {
      access: "public",
      contentType: "image/png",
    });

    // -----------------------------
    // Persist
    // -----------------------------
    const client = await clientPromise;
    const db = client.db("rasphia");

    await db.collection("reimagined_products").insertOne({
      reimagineId: id,
      email,
      productImageUrl: productUrl,
      prompt: promptText,
      imageUrl: blob.url,
      createdAt: new Date(),
    });

    return NextResponse.json(
      {
        ok: true,
        imageUrl: blob.url,
        reimagineId: id,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("🔥 ONE-SHOT REIMAGINE ERROR:", err);
    return NextResponse.json(
      { error: "server_error", detail: String(err) },
      { status: 500 }
    );
  }
});
