import { MongoClient } from "mongodb";
import OpenAI from "openai";
import { products } from "@/app/data/products"; // adjust this path if needed

const client = new MongoClient(process.env.MONGODB_URI!);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

async function embedText(text: string) {
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small", // or "text-embedding-3-large"
    input: text,
  });
  return res.data[0].embedding;
}

async function run() {
  try {
    await client.connect();
    const db = client.db("rasphia"); // your DB name
    const coll = db.collection("products");

    console.log("🧩 Generating OpenAI embeddings for products...");

    const enriched = [];
    for (const p of products) {
      const text = `${p.name}. ${p.story}. ${p.category}. ${p.tags.join(" ")}`;
      const embedding = await embedText(text);
      enriched.push({ ...p, embedding });
    }

    console.log("🧹 Clearing old records...");
    await coll.deleteMany({});

    console.log("💾 Inserting new records...");
    await coll.insertMany(enriched);

    console.log("✅ Products seeded successfully with embeddings!");
  } catch (err) {
    console.error("❌ Error seeding products:", err);
  } finally {
    await client.close();
  }
}

run();
