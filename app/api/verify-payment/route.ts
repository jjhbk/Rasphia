import { validateWebhookSignature } from "razorpay/dist/utils/razorpay-utils";
import clientPromise from "@/app/lib/mongodb";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      customer,
      product,
    } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { status: "error", message: "Missing payment verification fields" },
        { status: 400 }
      );
    }

    const secret = process.env.RAZORPAY_KEY_SECRET!;
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;

    const isValidSignature = validateWebhookSignature(
      body,
      razorpay_signature,
      secret
    );

    const client = await clientPromise;
    const db = client.db("rasphia");

    if (!isValidSignature) {
      console.warn(
        "⚠️ Invalid Razorpay signature for order:",
        razorpay_order_id
      );
      return NextResponse.json(
        { status: "verification_failed" },
        { status: 400 }
      );
    }

    // ✅ Update the order as paid
    const result = await db.collection("orders").updateOne(
      { order_id: razorpay_order_id },
      {
        $set: {
          status: "paid",
          payment_id: razorpay_payment_id,
          verifiedAt: new Date(),
        },
      }
    );

    if (result.modifiedCount === 0) {
      console.warn("⚠️ No order found for verification:", razorpay_order_id);
    }

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
