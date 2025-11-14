// app/api/create-payment-link/route.ts
import Razorpay from "razorpay";
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";

export async function POST(req: NextRequest) {
  try {
    const { product, customer } = await req.json();

    if (!product || !customer) {
      return NextResponse.json(
        { error: "Missing product or customer" },
        { status: 400 }
      );
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const amount = product.price * 100;

    // Create Razorpay Payment Link
    const paymentLink = await razorpay.paymentLink.create({
      amount,
      currency: "INR",
      description: `Payment for ${product.name}`,
      customer: {
        contact: customer.phone,
        email: customer.email ?? undefined,
        name: customer.name ?? "WhatsApp User",
      },
      notify: {
        sms: true,
        email: !!customer.email,
      },
      notes: {
        productName: product.name,
        price: product.price,
      },
      reminder_enable: true,
      callback_url: `${req.nextUrl.origin}/api/razorpay-webhook`,
      callback_method: "get",
    });

    // Store order in DB
    const client = await clientPromise;
    const db = client.db("rasphia");

    await db.collection("orders").insertOne({
      payment_link_id: paymentLink.id,
      short_url: paymentLink.short_url,
      status: "created",
      product,
      customer,
      createdAt: new Date(),
    });

    return NextResponse.json({
      paymentLinkId: paymentLink.id,
      shortUrl: paymentLink.short_url,
      product,
    });
  } catch (err) {
    console.error("❌ Payment Link Error:", err);
    return NextResponse.json(
      { error: "Failed to create payment link" },
      { status: 500 }
    );
  }
}
