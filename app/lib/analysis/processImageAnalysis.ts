import sharp from "sharp";
import { v4 as uuid } from "uuid";
import { put } from "@vercel/blob";
import clientPromise from "@/app/lib/mongodb";
import { GoogleGenAI } from "@google/genai";
import {
  BASE_RULES,
  SKIN_RULES,
  HAIR_RULES,
  BODY_RULES,
  PRODUCT_RULES,
  OUTPUT_FORMATS,
} from "@/utils/promptModules";

const TOOL_RULE_MAP: any = {
  skin: SKIN_RULES,
  hair: HAIR_RULES,
  body: BODY_RULES,
  similar: PRODUCT_RULES,
  default: "",
};

const TOOL_OUTPUT_MAP: any = {
  skin: OUTPUT_FORMATS.skin,
  hair: OUTPUT_FORMATS.hair,
  body: OUTPUT_FORMATS.body,
  similar: OUTPUT_FORMATS.similar,
  default: OUTPUT_FORMATS.default,
};

function buildPrompt(type: string) {
  return `
${BASE_RULES}
${TOOL_RULE_MAP[type] || TOOL_RULE_MAP.default}

Return ONLY JSON:
${TOOL_OUTPUT_MAP[type] || TOOL_OUTPUT_MAP.default}
`;
}

export async function processImageAnalysis(
  file: File,
  type: string,
  userEmail: string
) {
  // buffer
  const arrBuff = await file.arrayBuffer();
  let buffer = Buffer.from(arrBuff);

  // sharp compress
  buffer = (await sharp(buffer)
    .rotate()
    .jpeg({ quality: 85 })
    .toBuffer()) as any;

  // blob upload
  const blobName = `analysis-${uuid()}.jpg`;
  const uploaded = await put(blobName, buffer, {
    access: "public",
    contentType: "image/jpeg",
  });

  const fileUrl = uploaded.url;

  // base64 for Gemini
  const base64Image = buffer.toString("base64");

  const prompt = buildPrompt(type);
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  let output: any = {};

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image,
              },
            },
          ],
        },
      ],
    });

    const raw = result.text as string;
    const cleaned = raw.replace(/```json|```/g, "").trim();
    output = JSON.parse(cleaned);
  } catch (err) {
    console.error("Gemini error:", err);
    output = {
      summary: "Could not analyze image",
      optimizedPrompt: "Retry with clearer input",
    };
  }

  // save to DB
  const client = await clientPromise;
  const db = client.db("rasphia");

  const doc = {
    analysisId: uuid(),
    userEmail,
    type,
    fileUrl,
    aiResult: output,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await db.collection("analyses").insertOne(doc);

  return doc;
}
