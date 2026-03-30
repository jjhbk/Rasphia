import { validateWebhookSignature } from "razorpay/dist/utils/razorpay-utils";
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      customer,
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

    const order = await prisma.order.findUnique({
      where: { orderId: razorpay_order_id },
    });
    if (!order) {
      return NextResponse.json(
        { status: "error", message: "Order not found" },
        { status: 404 }
      );
    }
    if (order.status === "paid") {
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    const orderedItems = Array.isArray(order.products)
      ? (order.products as Array<{ productId?: string; quantity?: number; name?: string }>)
      : [];

    const stockOps: Array<{ productId: string; quantity: number }> = orderedItems
      .map((item) => ({
        productId: String(item.productId || "").trim(),
        quantity: Math.max(1, Number(item.quantity || 1)),
      }))
      .filter((item) => item.productId);

    await prisma.$transaction(async (tx) => {
      for (const op of stockOps) {
        const decreased = await tx.product.updateMany({
          where: {
            id: op.productId,
            isAvailable: true,
            stockQuantity: { gte: op.quantity },
          },
          data: {
            stockQuantity: { decrement: op.quantity },
            updatedAt: new Date(),
          },
        });
        if (decreased.count === 0) {
          const p = await tx.product.findUnique({ where: { id: op.productId } });
          throw new Error(
            `Insufficient stock for ${p?.name || op.productId} during verification`
          );
        }
      }

      const touchedIds = stockOps.map((s) => s.productId);
      for (const pid of touchedIds) {
        const p = await tx.product.findUnique({ where: { id: pid } });
        if (p && p.stockQuantity <= 0 && p.isAvailable) {
          await tx.product.update({
            where: { id: pid },
            data: { isAvailable: false, stockQuantity: 0, updatedAt: new Date() },
          });
        }
      }

      const nextOrderStatusHistory = [
        ...((Array.isArray(order.statusHistory)
          ? order.statusHistory
          : []) as Array<Record<string, unknown>>),
        {
          status: "paid",
          note: "Payment verified",
          by: customer?.email || "system",
          at: new Date().toISOString(),
        },
      ];

      await tx.order.update({
        where: { orderId: razorpay_order_id },
        data: {
          status: "paid",
          paymentId: razorpay_payment_id,
          verifiedAt: new Date(),
          statusHistory: nextOrderStatusHistory as unknown as Prisma.InputJsonValue,
        },
      });
    });

    // ✅ Upsert user profile if included
    if (customer?.email) {
      const addressEntry = {
        name: String(customer.name || "").trim(),
        phone: String(customer.phone || "").trim(),
        addressLine1: String(customer.addressLine1 || "").trim(),
        addressLine2: String(customer.addressLine2 || "").trim(),
        city: String(customer.city || "").trim(),
        state: String(customer.state || "").trim(),
        zipCode: String(customer.zipCode || "").trim(),
        address: String(customer.address || "").trim(),
      };

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
          updatedAt: new Date(),
        },
      });

      const existingProfile = await prisma.userProfile.findUnique({
        where: { email: customer.email },
        select: { addressBook: true },
      });
      const existingAddressBook = Array.isArray(existingProfile?.addressBook)
        ? existingProfile?.addressBook
        : [];
      const mergedAddressBook = existingAddressBook.some(
        (entry: any) => entry.address === addressEntry.address
      )
        ? existingAddressBook.map((entry: any) =>
            entry.address === addressEntry.address ? addressEntry : entry
          )
        : [addressEntry, ...existingAddressBook];

      await prisma.userProfile.upsert({
        where: { email: customer.email },
        create: {
          email: customer.email,
          name: customer.name,
          phone: customer.phone,
          address: customer.address,
          addressBook: mergedAddressBook,
          credits: 0,
        },
        update: {
          name: customer.name,
          phone: customer.phone,
          address: customer.address,
          addressBook: mergedAddressBook,
          updatedAt: new Date(),
        },
      });
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
