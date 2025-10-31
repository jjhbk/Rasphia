import OpenAI from "openai";
import clientPromise from "@/app/lib/mongodb";
import { ObjectId } from "mongodb";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

/**
 * Lazy embedding generator for a single product
 * - Only runs if `embedding` is null or marked for re-embedding
 */
export async function generateProductEmbedding(productId: string) {
  const client = await clientPromise;
  const db = client.db("rasphia");
  const products = db.collection("products");

  const product = await products.findOne({ _id: new ObjectId(productId) });
  if (!product) throw new Error("Product not found");

  // 💤 Skip if embedding already exists and not forced
  if (product.embedding && !product.forceReembed) {
    console.log(`⚙️ Skipping embedding for ${product.name} (already exists)`);
    return;
  }

  const text = `
    ${product.name}.
    Brand: ${product.brand || ""}.
    Category: ${product.category || ""}.
    Description: ${product.description}.
  `;

  const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-3-small", // 1536 dims
    input: text,
  });

  const embedding = embeddingResponse.data[0].embedding;

  await products.updateOne(
    { _id: product._id },
    {
      $set: {
        embedding,
        forceReembed: false,
        embeddingUpdatedAt: new Date(),
      },
    }
  );

  console.log(`✅ Stored embedding for ${product.name}`);
}
