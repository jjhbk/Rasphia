import Razorpay from "razorpay";
import { NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { products, customer, totalAmount } = body;

    if (!products || products.length === 0 || !customer) {
      return NextResponse.json(
        { error: "Missing products or customer information" },
        { status: 400 }
      );
    }

    // Razorpay initialization
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    // Amount = total of cart (converted to paisa)
    const amount = totalAmount * 100;
    const currency = "INR";
    const receipt = `receipt_${Date.now()}`;

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount,
      currency,
      receipt,
      notes: {
        customerEmail: customer.email,
        items: products.map((p: any) => p.name).join(", "),
      },
    });

    // Connect to DB
    const client = await clientPromise;
    const db = client.db("rasphia");

    // 1️⃣ Upsert ALL products
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

    // 2️⃣ Upsert user
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

    // 3️⃣ Create order entry
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
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
      },
      trackingNumber: null,
      isReviewed: false,
      createdAt: new Date(),
    };

    await db.collection("orders").insertOne(orderDoc);

    // Return Razorpay order
    return NextResponse.json(order);
  } catch (error) {
    console.error("❌ Error creating Razorpay order:", error);
    return NextResponse.json(
      { error: "Error creating Razorpay order" },
      { status: 500 }
    );
  }
}
