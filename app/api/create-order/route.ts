import Razorpay from "razorpay";
import { NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import { authGuard } from "@/app/lib/auth-guard";

export async function POST(req: Request) {
  try {
    // 1️⃣ Authenticate user + parse JSON safely
    const { sessionEmail, body, errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;

    const { products, customer, totalAmount } = body;

    if (!products || products.length === 0 || !customer) {
      return NextResponse.json(
        { error: "Missing products or customer information" },
        { status: 400 }
      );
    }

    if (!customer.email) {
      return NextResponse.json(
        { error: "Missing customer email" },
        { status: 400 }
      );
    }

    // 2️⃣ Email gating: prevent ordering for someone else
    if (customer.email !== sessionEmail) {
      return NextResponse.json(
        { error: "Forbidden: You can only create orders for your own account" },
        { status: 403 }
      );
    }

    // 3️⃣ Razorpay initialization
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const amount = totalAmount * 100; // convert to paisa
    const currency = "INR";
    const receipt = `receipt_${Date.now()}`;

    // 4️⃣ Create Razorpay order
    const order = await razorpay.orders.create({
      amount,
      currency,
      receipt,
      notes: {
        customerEmail: sessionEmail, // Trust session only
        items: products.map((p: any) => p.name).join(", "),
      },
    });

    // 5️⃣ DB connection
    const client = await clientPromise;
    const db = client.db("rasphia");

    // 6️⃣ Upsert products (safe)
    for (const p of products) {
      await db.collection("products").updateOne(
        { name: p.name },
        {
          $setOnInsert: { createdAt: new Date() },
          $set: {
            name: p.name,
            brand: p.brand || "Unknown",
            price: p.price,
            imageUrl: p.imageUrl || "",
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );
    }

    // 7️⃣ Upsert user profile (safe)
    await db.collection("users").updateOne(
      { email: sessionEmail },
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

    // 8️⃣ Create order record in DB
    const orderDoc = {
      order_id: order.id,
      payment_id: null,
      amount: totalAmount,
      currency,
      receipt,
      status: "created",
      products: products.map((p: any) => ({
        name: p.name,
        brand: p.brand,
        price: p.price,
        imageUrl: p.imageUrl,
      })),
      customer: {
        name: customer.name,
        email: sessionEmail, // Trust session only
        phone: customer.phone,
        address: customer.address,
      },
      trackingNumber: null,
      isReviewed: false,
      createdAt: new Date(),
    };

    await db.collection("orders").insertOne(orderDoc);

    return NextResponse.json(order, { status: 200 });
  } catch (error: any) {
    console.error("❌ Error creating Razorpay order:", error);
    return NextResponse.json(
      { error: error.message || "Error creating Razorpay order" },
      { status: 500 }
    );
  }
}
