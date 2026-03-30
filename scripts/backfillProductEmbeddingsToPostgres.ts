import { generateProductEmbedding } from "@/app/lib/generateEmbeddings";
import { prisma } from "@/app/lib/prisma";

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true },
  });

  console.log(`Found ${products.length} products to backfill.`);

  let success = 0;
  let failed = 0;

  for (const product of products) {
    const productId = product.id;

    try {
      await generateProductEmbedding(productId);
      success += 1;
      console.log(`✅ Backfilled ${success}/${products.length}: ${productId}`);
    } catch (error) {
      failed += 1;
      console.error(`❌ Failed for ${productId}:`, error);
    }
  }

  console.log(
    `Backfill completed. Success: ${success}, Failed: ${failed}, Total: ${products.length}`
  );
}

main().catch((error) => {
  console.error("Backfill script failed:", error);
  process.exit(1);
});
