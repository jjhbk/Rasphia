import { NextRequest, NextResponse } from "next/server";
import { verifyExtensionTokenFromString } from "@/app/lib/verifyExtTokenString";
import OpenAI from "openai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const userFile = form.get("userImage") as File;
    const productUrl = form.get("productImageUrl") as string;
    const extToken = form.get("ext_token") as string;

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

    // Fetch product image
    const prodRes = await fetch(productUrl);
    const prodBuf = await prodRes.arrayBuffer();

    // Convert to base64
    const userBase64 = Buffer.from(await userFile.arrayBuffer()).toString(
      "base64"
    );
    const productBase64 = Buffer.from(prodBuf).toString("base64");

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

    const prompt = `
Create a photorealistic virtual try-on.
Image 1 = person.
Image 2 = clothing/product.
Overlay clothing naturally while preserving identity, skin tone, lighting, and proportions.
`;

    const response = await client.responses.create({
      model: "gpt-4.1",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },

            {
              type: "input_image",
              image_url: `data:image/jpeg;base64,${userBase64}`,
            },
            {
              type: "input_image",
              image_url: `data:image/jpeg;base64,${productBase64}`,
            },
          ],
        },
      ] as any,
      tools: [{ type: "image_generation" }],
    });

    const imageData = response.output
      .filter((o) => o.type === "image_generation_call")
      .map((o) => o.result);

    return NextResponse.json(
      {
        ok: true,
        tryonImage: imageData[0] || null,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("TRYON ERROR:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
