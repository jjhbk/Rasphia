import clientPromise from "@/app/lib/mongodb";
import { ObjectId } from "mongodb";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function generateProductEmbedding(productId: string) {
  const client = await clientPromise;
  const db = client.db("rasphia");

  const product = await db
    .collection("products")
    .findOne({ _id: new ObjectId(productId) });

  if (!product) throw new Error("Product not found for embedding generation");

  // 🧠 Combine product details for a rich embedding
  const textToEmbed = `
  Name: ${product.name}
  Description: ${product.description}
  Brand: ${product.brand || ""}
  Category: ${product.category || ""}
  Story: ${product.story || ""}
  Tags: ${(product.tags || []).join(", ")}
  Occasion: ${(product.occasion || []).join(", ")}
  Recipient: ${product.recipient || ""}
  `;

  const response = await openai.embeddings.create({
    model: "text-embedding-3-small", // ✅ best for semantic vector search
    input: textToEmbed,
  });

  const embedding = response.data[0].embedding;

  // 🗂️ Save embedding to MongoDB
  await db
    .collection("products")
    .updateOne(
      { _id: new ObjectId(productId) },
      { $set: { embedding, updatedAt: new Date() } }
    );

  console.log(`🧠 Embedding stored for ${product.name}`);
}
