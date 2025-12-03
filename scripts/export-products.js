import { MongoClient } from "mongodb";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();
async function exportProducts() {
  const uri = process.env.MONGODB_URI; // ensure this is set in your environment

  if (!uri) {
    console.error("❌ Missing MONGODB_URI environment variable");
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db("rasphia"); // your database name
    const productsCollection = db.collection("products");

    console.log("📦 Fetching all products…");

    // Fetch all products but remove the embedding field
    const products = await productsCollection
      .find(
        {},
        {
          projection: {
            embedding: 0, // remove embedding
            reviews: 0, // optional: remove large unused fields
          },
        }
      )
      .toArray();

    console.log(`📄 Found ${products.length} products.`);

    // Convert ObjectIds to strings
    const sanitizedProducts = products.map((p) => ({
      ...p,
      _id: p._id.toString(),
    }));

    // Save to JSON file
    const jsonOutput = JSON.stringify(sanitizedProducts, null, 2);
    fs.writeFileSync("products-export.json", jsonOutput);

    console.log("✅ Export complete! Saved to products-export.json");
  } catch (error) {
    console.error("❌ Error exporting products:", error);
  } finally {
    await client.close();
  }
}

exportProducts();
