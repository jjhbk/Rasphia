import Razorpay from "razorpay";
import { NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { product, customer } = body;

    if (!product || !customer) {
      return NextResponse.json(
        { error: "Missing product or customer information" },
        { status: 400 }
      );
    }

    // Initialize Razorpay
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    // Convert price to paisa (Razorpay expects integer)
    const amount = product.price * 100;
    const currency = "INR";
    const receipt = `receipt_${Date.now()}`;

    // Create order on Razorpay
    const order = await razorpay.orders.create({
      amount,
      currency,
      receipt,
      notes: {
        productName: product.name,
        customerEmail: customer.email,
      },
    });

    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db("rasphia"); // use your unified DB name

    // ✅ 1. Upsert the product in the "products" collection
    await db.collection("products").updateOne(
      { name: product.name },
      {
        $setOnInsert: { createdAt: new Date() },
        $set: {
          name: product.name,
          brand: product.brand || "Unknown",
          price: product.price,
          imageUrl: product.imageUrl || "",
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    // ✅ 2. Upsert the user profile in the "users" collection
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

    // ✅ 3. Create the order in the "orders" collection
    const orderDoc = {
      order_id: order.id,
      payment_id: null,
      amount: product.price,
      currency,
      receipt,
      status: "created",
      product: {
        name: product.name,
        brand: product.brand || "Unknown",
        price: product.price,
        imageUrl: product.imageUrl || "",
      },
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

    // ✅ 4. Return the Razorpay order object
    return NextResponse.json(order);
  } catch (error) {
    console.error("❌ Error creating Razorpay order:", error);
    return NextResponse.json(
      { error: "Error creating Razorpay order" },
      { status: 500 }
    );
  }
}
