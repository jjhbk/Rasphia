import OpenAI from "openai";
import { upsertProductEmbedding } from "@/app/lib/product-vector-store";
import { prisma } from "@/app/lib/prisma";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function generateProductEmbedding(productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } });

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

  await prisma.product.update({
    where: { id: productId },
    data: { embedding, updatedAt: new Date() },
  });

  // Primary vector index in Postgres (pgvector via Prisma).
  await upsertProductEmbedding({
    productId,
    merchantId: product.merchantId || null,
    name: product.name,
    brand: product.brand || null,
    category: product.category || null,
    price:
      typeof product.price === "number"
        ? product.price
        : Number(product.price) || null,
    description: product.description || null,
    imageUrl: product.imageUrl || null,
    embedding,
  });

  console.log(`🧠 Embedding stored for ${product.name}`);
}
