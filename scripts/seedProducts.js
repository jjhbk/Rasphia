import { MongoClient } from "mongodb";
import OpenAI from "openai";
import { SkinCare } from "../app/data/skincare.js";
import { HairFall } from "../app/data/harifall.js";
import { Body } from "../app/data/body.js";
import { Gifts } from "../app/data/gifts.js";
import dotenv from "dotenv";
dotenv.config();

const client = new MongoClient(process.env.MONGODB_URI);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function embedText(text) {
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return res.data[0].embedding;
}

async function run() {
  try {
    await client.connect();
    const db = client.db("rasphia");
    const coll = db.collection("products");

    console.log("🧩 Generating OpenAI embeddings for products...");

    const enriched = [];

    for (const p of Gifts) {
      const text = `${p.name}. ${p.story}. ${p.category}. ${(p.tags || []).join(
        " "
      )}`;
      const embedding = await embedText(text);

      enriched.push({
        ...p,
        embedding,
      });
    }

    console.log("💾 Inserting", enriched.length, "records...");
    await coll.insertMany(enriched);

    console.log("✅ Products seeded successfully with embeddings!");
  } catch (err) {
    console.error("❌ Error seeding products:", err);
  } finally {
    await client.close();
  }
}

run();
