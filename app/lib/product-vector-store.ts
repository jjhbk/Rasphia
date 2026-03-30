import { prisma } from "@/app/lib/prisma";

export type ProductVectorHit = {
  _id: string;
  name: string;
  brand: string | null;
  category: string | null;
  price: number | null;
  description: string | null;
  imageUrl: string | null;
  score: number;
};

type UpsertEmbeddingInput = {
  productId: string;
  merchantId?: string | null;
  name: string;
  brand?: string | null;
  category?: string | null;
  price?: number | null;
  description?: string | null;
  imageUrl?: string | null;
  embedding: number[];
};

function toVectorLiteral(values: number[]) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error("Embedding must be a non-empty array.");
  }

  return `[${values.join(",")}]`;
}

export async function upsertProductEmbedding(input: UpsertEmbeddingInput) {
  const vector = toVectorLiteral(input.embedding);

  await prisma.$executeRaw`
    INSERT INTO product_embeddings
      (id, product_id, merchant_id, name, brand, category, price, description, image_url, embedding, created_at, updated_at)
    VALUES
      (gen_random_uuid()::text, ${input.productId}, ${input.merchantId ?? null}, ${input.name}, ${input.brand ?? null}, ${input.category ?? null}, ${input.price ?? null}, ${input.description ?? null}, ${input.imageUrl ?? null}, ${vector}::vector, NOW(), NOW())
    ON CONFLICT (product_id)
    DO UPDATE SET
      merchant_id = EXCLUDED.merchant_id,
      name = EXCLUDED.name,
      brand = EXCLUDED.brand,
      category = EXCLUDED.category,
      price = EXCLUDED.price,
      description = EXCLUDED.description,
      image_url = EXCLUDED.image_url,
      embedding = EXCLUDED.embedding,
      updated_at = NOW();
  `;
}

export async function deleteProductEmbedding(productId: string) {
  await prisma.$executeRaw`
    DELETE FROM product_embeddings
    WHERE product_id = ${productId};
  `;
}

export async function searchProductEmbeddings(
  queryEmbedding: number[],
  limit = 8
): Promise<ProductVectorHit[]> {
  const vector = toVectorLiteral(queryEmbedding);
  const safeLimit = Math.max(1, Math.min(limit, 30));

  const rows = await prisma.$queryRaw<ProductVectorHit[]>`
    SELECT
      product_id AS "_id",
      name,
      brand,
      category,
      price,
      description,
      image_url AS "imageUrl",
      1 - (embedding <=> ${vector}::vector) AS score
    FROM product_embeddings
    ORDER BY embedding <=> ${vector}::vector
    LIMIT ${safeLimit};
  `;

  return rows;
}
