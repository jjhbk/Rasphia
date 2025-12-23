import Razorpay from "razorpay";
import { NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import { authGuard } from "@/app/lib/auth-guard";

// Credit pricing: 1 INR = 10 credits (keep aligned with verify-payment)
const CREDITS_PER_INR = 1;

export async function POST(req: Request) {
  try {
    // 1️⃣ Authenticate user + parse JSON safely
    const { sessionEmail, body, errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;

    const { products, customer, totalAmount, credits } = body;

    if (!customer?.email) {
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

    // 3️⃣ Determine mode: either products purchase OR credit top-up
    const isCreditTopup = !products?.length && typeof credits === "number";

    if (!isCreditTopup && (!products || products.length === 0)) {
      return NextResponse.json(
        { error: "Missing products or credits" },
        { status: 400 }
      );
    }

    // Compute amount (INR) for credit top-up if applicable
    let finalAmountInInr = totalAmount;
    let creditNotes: any = undefined;

    if (isCreditTopup) {
      if (credits <= 0) {
        return NextResponse.json(
          { error: "Invalid credits amount" },
          { status: 400 }
        );
      }
      // price per credit in INR
      const amountInInr = credits / CREDITS_PER_INR;
      finalAmountInInr = Math.max(1, Math.ceil(amountInInr)); // ensure at least ₹1
      creditNotes = {
        creditsRequested: credits,
        creditsPerInr: CREDITS_PER_INR,
      };
    } else {
      if (!finalAmountInInr || finalAmountInInr <= 0) {
        return NextResponse.json(
          { error: "Missing or invalid totalAmount" },
          { status: 400 }
        );
      }
    }

    // 4️⃣ Razorpay initialization
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const amount = finalAmountInInr * 100; // convert to paisa
    const currency = "INR";
    const receipt = `receipt_${Date.now()}`;

    // 5️⃣ Create Razorpay order
    const order = await razorpay.orders.create({
      amount,
      currency,
      receipt,
      notes: {
        customerEmail: sessionEmail, // Trust session only
        items: isCreditTopup
          ? `Credits: ${credits}`
          : products.map((p: any) => p.name).join(", "),
        mode: isCreditTopup ? "credit_topup" : "products",
        ...(creditNotes || {}),
      },
    });

    // 6️⃣ DB connection
    const client = await clientPromise;
    const db = client.db("rasphia");

    // 7️⃣ Upsert products (safe) only if not a credit top-up
    if (!isCreditTopup) {
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
    }

    // 8️⃣ Upsert user profile (safe)
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

    // 9️⃣ Create order record in DB
    const orderDoc = {
      order_id: order.id,
      payment_id: null,
      amount: finalAmountInInr,
      currency,
      receipt,
      status: "created",
      mode: isCreditTopup ? "credit_topup" : "products",
      credits: isCreditTopup ? credits : null,
      products: isCreditTopup
        ? []
        : products.map((p: any) => ({
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
