import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { verifyWhatsAppCheckoutToken } from "@/app/lib/whatsapp-checkout";
import { getMerchantRazorpayConfig } from "@/app/lib/merchant-razorpay";

export async function GET(req: NextRequest) {
  try {
    const token = String(req.nextUrl.searchParams.get("token") || "").trim();
    if (!token) {
      return NextResponse.json({ error: "Missing checkout token." }, { status: 400 });
    }

    const payload = verifyWhatsAppCheckoutToken(token);
    const order = await prisma.order.findFirst({
      where: {
        id: payload.internalOrderId,
        orderId: payload.orderId,
      },
      select: {
        id: true,
        orderId: true,
        receipt: true,
        amount: true,
        currency: true,
        status: true,
        mode: true,
        merchantId: true,
        customer: true,
        products: true,
        verifiedAt: true,
        invoiceNumber: true,
        invoicePdfUrl: true,
        invoiceSyncStatus: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Checkout session not found." }, { status: 404 });
    }

    const customer =
      order.customer && typeof order.customer === "object" && !Array.isArray(order.customer)
        ? (order.customer as Record<string, unknown>)
        : {};
    if (String(customer.email || "").trim().toLowerCase() !== payload.email.toLowerCase()) {
      return NextResponse.json({ error: "Checkout session does not match customer." }, { status: 403 });
    }

    const items = Array.isArray(order.products)
      ? (order.products as Array<Record<string, unknown>>)
      : [];
    const productSummary = items
      .map((item) => `${String(item.name || "Item")} x${Math.max(1, Number(item.quantity || 1))}`)
      .join(", ");

    const baseResponse = {
      internalOrderId: order.id,
      orderId: order.orderId,
      appOrderId: order.receipt || null,
      amount: Math.max(100, Math.round(Number(order.amount || 0) * 100)),
      currency: order.currency || "INR",
      status: order.status,
      mode: order.mode || "",
      merchantId: order.merchantId || "",
      productName: productSummary || "Checkout payment",
      customer: {
        name: String(customer.name || "").trim(),
        email: String(customer.email || "").trim(),
        phone: String(customer.phone || "").trim(),
        address: String(customer.address || "").trim(),
        addressLine1: String(customer.addressLine1 || "").trim(),
        addressLine2: String(customer.addressLine2 || "").trim(),
        city: String(customer.city || "").trim(),
        state: String(customer.state || "").trim(),
        zipCode: String(customer.zipCode || "").trim(),
      },
      invoice: {
        invoiceNumber: order.invoiceNumber || null,
        invoicePdfUrl: order.invoicePdfUrl || null,
        invoiceSyncStatus: order.invoiceSyncStatus || null,
        verifiedAt: order.verifiedAt?.toISOString() || null,
      },
    };

    if (String(order.status || "").toLowerCase() === "paid") {
      return NextResponse.json(
        {
          ok: true,
          paid: true,
          provider: String(order.mode || "").toLowerCase().includes("razorpay")
            ? "razorpay"
            : "seedhape",
          ...baseResponse,
        },
        { status: 200 }
      );
    }

    if (String(order.mode || "").toLowerCase().includes("razorpay")) {
      const merchantId = String(order.merchantId || "").trim();
      if (!merchantId) {
        return NextResponse.json({ error: "Merchant missing for Razorpay checkout." }, { status: 409 });
      }
      const merchantConfig = await getMerchantRazorpayConfig(merchantId);
      return NextResponse.json(
        {
          ok: true,
          paid: false,
          provider: "razorpay",
          razorpayOrderId: order.orderId,
          razorpayKeyId: merchantConfig.keyId,
          ...baseResponse,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        paid: false,
        provider: "seedhape",
        ...baseResponse,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to load checkout session.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
