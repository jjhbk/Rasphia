import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = "rasphia";

if (!MONGODB_URI) {
  console.error("❌ Missing MONGODB_URI in .env");
  process.exit(1);
}

async function addCredits({ email, amount, reason }) {
  if (!email || typeof amount !== "number") {
    throw new Error("Email and numeric amount are required");
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();

  const db = client.db(DB_NAME);

  // 1️⃣ ENSURE USER EXISTS
  const user = await db.collection("user_profiles").findOne({ email });

  if (!user) {
    throw new Error(`❌ User profile not found for email: ${email}`);
  }

  // 2️⃣ UPDATE CREDITS (NO UPSERT)
  const result = await db
    .collection("user_profiles")
    .updateOne({ email }, { $inc: { credits: amount } });

  if (result.matchedCount !== 1) {
    throw new Error("❌ Failed to update credits");
  }

  // 3️⃣ LEDGER ENTRY
  await db.collection("credit_ledger").insertOne({
    email,
    type: "credit",
    amount,
    reason: reason || "Manual admin credit",
    source: "admin-script",
    createdAt: new Date(),
  });

  console.log(`✅ Added ${amount} credits to ${email}`);
  console.log(`💳 New balance: ${(user.credits || 0) + amount}`);

  await client.close();
}

// 🔧 FIX YOUR EMAIL TOO (this was invalid earlier)
addCredits({
  email: "jathinjagannath@gmail.com", // ⚠️ must be exact match
  amount: 100,
  reason: "Manual top-up",
})
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
