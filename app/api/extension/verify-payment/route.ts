import crypto from "crypto";
import clientPromise from "@/app/lib/mongodb";
import { NextResponse } from "next/server";

// 💳 Credits conversion: how many credits per 1 INR of successful payment
// Adjust this mapping as needed for your business model.
const CREDITS_PER_INR = 1;

export async function POST(req: Request) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      customer,
      product,
      totalAmount,
    } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { status: "error", message: "Missing payment verification fields" },
        { status: 400 }
      );
    }

    // 🔐 CORRECT Razorpay Checkout signature verification
    const secret = process.env.RAZORPAY_KEY_SECRET!;
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      console.warn(
        "⚠️ Invalid Razorpay checkout signature for order:",
        razorpay_order_id
      );
      return NextResponse.json(
        { status: "verification_failed" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("rasphia");

    // ✅ Update the order as paid
    const orderUpdate = await db.collection("orders").findOneAndUpdate(
      { order_id: razorpay_order_id },
      {
        $set: {
          status: "paid",
          payment_id: razorpay_payment_id,
          verifiedAt: new Date(),
        },
      }
    );
    console.log("order doc is:", orderUpdate);

    const orderDoc: any = orderUpdate;
    if (!orderDoc) {
      console.warn("⚠️ No order found for verification:", razorpay_order_id);
    }

    const email =
      orderDoc?.customer?.email || customer?.email || product?.customerEmail;

    // ✅ Upsert user profile if included
    if (customer?.email) {
      await db.collection("users").updateOne(
        { email: customer.email },
        {
          $setOnInsert: { createdAt: new Date() },
          $set: {
            name: customer.name,
            phone: customer.phone,
            address: customer.address,
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );
    }

    // ✅ Ensure product record exists
    if (product?.name) {
      await db.collection("products").updateOne(
        { name: product.name },
        {
          $setOnInsert: { createdAt: new Date() },
          $set: {
            brand: product.brand || "Unknown",
            price: product.price,
            imageUrl: product.imageUrl || "",
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );
    }

    // ------------------------------------------------------------
    // 💰 CREDIT TOP-UP
    // ------------------------------------------------------------
    // If this payment is for credits, credit the user's account and log ledger.
    // We use the final order amount (in INR) from either:
    // - order document in DB, or
    // - totalAmount passed from the client as a fallback.
    if (email) {
      console.log("updating the ledger....", email);
      const rupees =
        typeof orderDoc?.amount === "number"
          ? orderDoc.amount
          : typeof totalAmount === "number"
          ? totalAmount
          : null;

      if (rupees && rupees > 0) {
        const creditsToAdd = Math.floor(rupees * CREDITS_PER_INR);

        if (creditsToAdd > 0) {
          // Increment credits on the user profile
          await db.collection("user_profiles").updateOne(
            { email },
            {
              $setOnInsert: { createdAt: new Date() },
              $inc: { credits: creditsToAdd },
            },
            { upsert: true }
          );

          // Log credit ledger entry
          await db.collection("credit_ledger").insertOne({
            email,
            type: "credit",
            amount: creditsToAdd,
            rupees,
            reason: "topup_razorpay",
            razorpay_order_id,
            razorpay_payment_id,
            createdAt: new Date(),
          });

          console.log(
            `✅ Credited ${creditsToAdd} credits to ${email} for payment ${razorpay_payment_id}`
          );
        }
      }
    }

    console.log(`✅ Payment verified successfully: ${razorpay_payment_id}`);
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("❌ Error verifying payment:", error);
    return NextResponse.json(
      { status: "error", message: "Payment verification failed" },
      { status: 500 }
    );
  }
}
