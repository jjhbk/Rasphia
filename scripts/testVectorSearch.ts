import { MongoClient } from "mongodb";
import OpenAI from "openai";

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
  const query =
    process.argv.slice(2).join(" ") || "relaxing candle for home decor";

  try {
    console.log(`🔎 Running vector search for: "${query}"`);
    await client.connect();
    const db = client.db("rasphia");
    const coll = db.collection("products");

    const queryEmbedding = await embedText(query);

    const results = await coll
      .aggregate([
        {
          $vectorSearch: {
            index: "products_index", // ✅ your actual Atlas index name
            path: "embedding",
            queryVector: queryEmbedding,
            numCandidates: 100,
            limit: 5,
            similarity: "cosine",
          },
        },
        {
          $project: {
            _id: 0,
            name: 1,
            category: 1,
            brand: 1,
            price: 1,
            story: 1,
            score: { $meta: "vectorSearchScore" },
          },
        },
      ])
      .toArray();

    if (!results.length) {
      console.log("⚠️ No vector search results found.");
      return;
    }

    console.log(`✅ Found ${results.length} matching products:\n`);
    results.forEach((r: any, i: number) => {
      console.log(
        `${i + 1}. ${r.name} (${r.category}) - ₹${
          r.price
        }\n   🧠 Score: ${r.score.toFixed(3)}\n   ${r.story}\n`
      );
    });
  } catch (err) {
    console.error("❌ Vector search test failed:", err);
  } finally {
    await client.close();
  }
}

run();
