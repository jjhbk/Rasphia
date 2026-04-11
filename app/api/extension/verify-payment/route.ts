import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { handleOptions, withExtensionCors } from "@/app/lib/extensionCors";

const CREDITS_PER_INR = 1;

export const OPTIONS = handleOptions;

async function upsertProductByName(product: any) {
  if (!product?.name) return;

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

    const secret = process.env.RAZORPAY_KEY_SECRET!;
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ status: "verification_failed" }, { status: 400 });
    }

    const existingOrder = await prisma.order.findUnique({
      where: { orderId: razorpay_order_id },
      select: { amount: true, customer: true },
    });

    await prisma.order.updateMany({
      where: { orderId: razorpay_order_id },
      data: {
        status: "paid",
        paymentId: razorpay_payment_id,
        verifiedAt: new Date(),
      },
    });

    const customerFromOrder = (existingOrder?.customer || {}) as Record<string, any>;
    const email =
      customerFromOrder?.email || customer?.email || product?.customerEmail || null;

    if (customer?.email) {
      await prisma.user.upsert({
        where: { email: customer.email },
        create: {
          email: customer.email,
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
    }

    await upsertProductByName(product);

    if (email) {
      const rupees =
        typeof existingOrder?.amount === "number"
          ? existingOrder.amount
          : typeof totalAmount === "number"
          ? totalAmount
          : null;

      if (rupees && rupees > 0) {
        const creditsToAdd = Math.floor(rupees * CREDITS_PER_INR);

        if (creditsToAdd > 0) {
          const profile = await prisma.userProfile.findUnique({ where: { email } });

          if (!profile) {
            await prisma.userProfile.create({
              data: {
                email,
                credits: creditsToAdd,
              },
            });
          } else {
            await prisma.userProfile.update({
              where: { email },
              data: { credits: { increment: creditsToAdd } },
            });
          }

          await prisma.creditLedger.create({
            data: {
              email,
              type: "credit",
              amount: creditsToAdd,
              rupees,
              reason: "topup_razorpay",
              razorpayOrderId: razorpay_order_id,
              razorpayPaymentId: razorpay_payment_id,
            },
          });
        }
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Error verifying payment:", error);
    return NextResponse.json(
      { status: "error", message: "Payment verification failed" },
      { status: 500 }
    );
  }
});
