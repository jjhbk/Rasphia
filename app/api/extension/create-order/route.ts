import Razorpay from "razorpay";
import { NextResponse } from "next/server";
import { authGuard } from "@/app/lib/auth-guard";
import { prisma } from "@/app/lib/prisma";
import { handleOptions, withExtensionCors } from "@/app/lib/extensionCors";

const CREDITS_PER_INR = 1;

export const OPTIONS = handleOptions;

async function upsertProductByName(product: any) {
  const existing = await prisma.product.findFirst({
    where: { name: product.name },
    select: { id: true },
  });

  if (existing) {
    await prisma.product.update({
      where: { id: existing.id },
      data: {
        brand: product.brand || "Unknown",
        price: typeof product.price === "number" ? product.price : null,
        imageUrl: product.imageUrl || "",
      },
    });
    return;
  }

  await prisma.product.create({
    data: {
      name: product.name,
      brand: product.brand || "Unknown",
      price: typeof product.price === "number" ? product.price : null,
      imageUrl: product.imageUrl || "",
      stockQuantity: 0,
      isAvailable: false,
    },
  });
}

export const POST = withExtensionCors(async (req: Request) => {
  try {
    const { sessionEmail, body, errorResponse } = await authGuard(req as any);
    if (errorResponse) return errorResponse;

    const { products, customer, totalAmount, credits } = body || {};

    if (!customer?.email) {
      return NextResponse.json({ error: "Missing customer email" }, { status: 400 });
    }

    if (customer.email !== sessionEmail) {
      return NextResponse.json(
        { error: "Forbidden: You can only create orders for your own account" },
        { status: 403 }
      );
    }

    const isCreditTopup = !products?.length && typeof credits === "number";

    if (!isCreditTopup && (!products || products.length === 0)) {
      return NextResponse.json({ error: "Missing products or credits" }, { status: 400 });
    }

    let finalAmountInInr = Number(totalAmount || 0);
    let creditNotes: Record<string, unknown> | undefined;

    if (isCreditTopup) {
      if (credits <= 0) {
        return NextResponse.json({ error: "Invalid credits amount" }, { status: 400 });
      }
      const amountInInr = credits / CREDITS_PER_INR;
      finalAmountInInr = Math.max(1, Math.ceil(amountInInr));
      creditNotes = {
        creditsRequested: credits,
        creditsPerInr: CREDITS_PER_INR,
      };
    } else if (!finalAmountInInr || finalAmountInInr <= 0) {
      return NextResponse.json(
        { error: "Missing or invalid totalAmount" },
        { status: 400 }
      );
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const amount = finalAmountInInr * 100;
    const currency = "INR";
    const receipt = `receipt_${Date.now()}`;

    const order = await razorpay.orders.create({
      amount,
      currency,
      receipt,
      notes: {
        customerEmail: sessionEmail,
        items: isCreditTopup
          ? `Credits: ${credits}`
          : products.map((p: any) => p.name).join(", "),
        mode: isCreditTopup ? "credit_topup" : "products",
        ...(creditNotes || {}),
      },
    });

    if (!isCreditTopup) {
      for (const p of products) {
        if (p?.name) {
          await upsertProductByName(p);
        }
      }
    }

    await prisma.user.upsert({
      where: { email: sessionEmail },
      create: {
        email: sessionEmail,
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
      },
      update: {
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
      },
    });

    await prisma.order.create({
      data: {
        orderId: order.id,
        paymentId: null,
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
          email: sessionEmail,
          phone: customer.phone,
          address: customer.address,
        },
        trackingNumber: null,
        isReviewed: false,
      },
    });

    return NextResponse.json(order, { status: 200 });
  } catch (error: any) {
    console.error("Error creating Razorpay order:", error);
    return NextResponse.json(
      { error: error.message || "Error creating Razorpay order" },
      { status: 500 }
    );
  }
});
