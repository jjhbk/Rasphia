import { GoogleGenAI, Type } from "@google/genai";
import { GEMINI_MODEL } from "@/app/lib/gemini";

type HsnCodeRecord = {
  hsnCode: string;
  description: string;
  gstRate: number;
};

const HSN_CODES: HsnCodeRecord[] = [
  { hsnCode: "0902", description: "Tea", gstRate: 5 },
  { hsnCode: "1905", description: "Bread, pastry, cakes, biscuits", gstRate: 18 },
  { hsnCode: "2008", description: "Fruit, nuts, preserved", gstRate: 12 },
  { hsnCode: "2106", description: "Food preparations (ready to eat)", gstRate: 18 },
  { hsnCode: "3304", description: "Beauty or make-up preparations", gstRate: 18 },
  { hsnCode: "4202", description: "Bags, wallets, backpacks", gstRate: 18 },
  { hsnCode: "4901", description: "Printed books and brochures", gstRate: 5 },
  { hsnCode: "6109", description: "T-shirts, singlets, knitted", gstRate: 12 },
  { hsnCode: "7113", description: "Articles of jewellery of precious metal", gstRate: 3 },
  { hsnCode: "8517", description: "Telephone sets, smartphones", gstRate: 18 },
  { hsnCode: "9999", description: "Goods not elsewhere specified", gstRate: 18 },
];

const keywordMap: Array<{ terms: string[]; code: string }> = [
  { terms: ["tea", "chai"], code: "0902" },
  { terms: ["samosa", "snack", "biscuit", "bread", "pastry", "cake"], code: "1905" },
  { terms: ["peanut", "nuts", "pickle", "fruit"], code: "2008" },
  { terms: ["ready", "meal", "masala", "food"], code: "2106" },
  {
    terms: [
      "cream",
      "makeup",
      "cosmetic",
      "beauty",
      "skincare",
      "serum",
      "moisturizer",
      "lipstick",
      "sunscreen",
    ],
    code: "3304",
  },
  { terms: ["bag", "wallet", "backpack", "purse"], code: "4202" },
  { terms: ["book", "notebook", "journal", "brochure", "stationery"], code: "4901" },
  { terms: ["shirt", "t-shirt", "kurta", "top", "apparel", "clothing"], code: "6109" },
  { terms: ["jewellery", "jewelry", "ring", "necklace", "earring", "bracelet"], code: "7113" },
  { terms: ["phone", "mobile", "smartphone", "device", "charger"], code: "8517" },
];

const geminiApiKey =
  process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";
const gemini = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

const classificationCache = new Map<string, HsnCodeRecord>();

function getCodeRecord(code: string) {
  return HSN_CODES.find((item) => item.hsnCode === code) || HSN_CODES[HSN_CODES.length - 1];
}

function classifyByKeywords(haystack: string) {
  const matched = keywordMap.find((entry) => entry.terms.some((term) => haystack.includes(term)));
  return matched ? getCodeRecord(matched.code) : null;
}

async function classifyWithAi(input: {
  name: string;
  description?: string;
  category?: string;
  brand?: string;
}) {
  if (!gemini) return null;

  const catalog = HSN_CODES.map(
    (item) => `${item.hsnCode}: ${item.description} (${item.gstRate}% GST)`
  ).join("\n");

  try {
    const response = await gemini.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        "Classify a commerce line item into the closest GST HSN code from the provided catalog.",
        "Return JSON only.",
        `Catalog:\n${catalog}`,
        `Name: ${input.name}`,
        `Description: ${input.description || ""}`,
        `Category: ${input.category || ""}`,
        `Brand: ${input.brand || ""}`,
      ].join("\n\n"),
      config: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["hsnCode"],
          properties: {
            hsnCode: {
              type: Type.STRING,
              enum: HSN_CODES.map((item) => item.hsnCode),
            },
            reason: {
              type: Type.STRING,
            },
          },
        },
      },
    });

    const raw = response.text || "";
    const parsed = JSON.parse(raw) as { hsnCode?: string };
    if (!parsed?.hsnCode) return null;
    return getCodeRecord(String(parsed.hsnCode).trim());
  } catch (error) {
    console.error("[gst-classification] AI classification failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function classifyInvoiceLineItem(input: {
  name: string;
  description?: string;
  category?: string;
  brand?: string;
}) {
  const cacheKey = JSON.stringify({
    name: input.name,
    description: input.description || "",
    category: input.category || "",
    brand: input.brand || "",
  });
  const cached = classificationCache.get(cacheKey);
  if (cached) return cached;

  const haystack = [input.name, input.description || "", input.category || "", input.brand || ""]
    .join(" ")
    .toLowerCase();

  const keywordMatch = classifyByKeywords(haystack);
  if (keywordMatch) {
    classificationCache.set(cacheKey, keywordMatch);
    return keywordMatch;
  }

  const aiMatch = await classifyWithAi(input);
  const resolved = aiMatch || getCodeRecord("9999");
  classificationCache.set(cacheKey, resolved);
  return resolved;
}
