import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { verifyWhatsAppCheckoutToken } from "@/app/lib/whatsapp-checkout";
import { getMerchantRazorpayConfig } from "@/app/lib/merchant-razorpay";
import { createRazorpayOrderWithConfig } from "@/app/lib/razorpay";
import { Prisma } from "@prisma/client";

type CustomerPayload = {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
};

function buildAddress(customer: CustomerPayload) {
  return [
    String(customer.addressLine1 || "").trim(),
    String(customer.addressLine2 || "").trim(),
    `${String(customer.city || "").trim()}, ${String(customer.state || "").trim()} ${String(
      customer.zipCode || ""
    ).trim()}`.trim(),
  ]
    .filter(Boolean)
    .join(", ");
}

function validateCustomer(customer: CustomerPayload) {
  if (!String(customer.name || "").trim() || !String(customer.email || "").trim()) {
    return "Please fill in all required fields.";
  }
  if (!/^\+?[0-9\s\-()]{8,20}$/.test(String(customer.phone || "").trim())) {
    return "Phone number format is invalid.";
  }
  if (String(customer.addressLine1 || "").trim().length < 3) {
    return "Address line 1 must be at least 3 characters.";
  }
  if (String(customer.addressLine2 || "").trim().length < 2) {
    return "Address line 2 must be at least 2 characters.";
  }
  if (String(customer.city || "").trim().length < 2) {
    return "City must be at least 2 characters.";
  }
  if (String(customer.state || "").trim().length < 2) {
    return "State must be at least 2 characters.";
  }
  if (!/^[A-Za-z0-9\- ]{4,12}$/.test(String(customer.zipCode || "").trim())) {
    return "ZIP code format is invalid.";
  }
  return null;
}

function toProductItems(raw: unknown) {
  return Array.isArray(raw) ? (raw as Array<Record<string, unknown>>) : [];
}

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
        paymentId: true,
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

    const items = toProductItems(order.products);
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
      products: items.map((item) => ({
        productId: String(item.productId || item.id || "").trim(),
        name: String(item.name || "Item").trim() || "Item",
        brand: String(item.brand || "").trim(),
        imageUrl: String(item.imageUrl || "").trim(),
        price: Number(item.price || 0),
        quantity: Math.max(1, Number(item.quantity || 1)),
      })),
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
      paymentId: order.paymentId || null,
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

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      token?: string;
      quantity?: number;
      customer?: CustomerPayload;
    };
    const token = String(body.token || "").trim();
    if (!token) {
      return NextResponse.json({ error: "Missing checkout token." }, { status: 400 });
    }

    const payload = verifyWhatsAppCheckoutToken(token);
    const order = await prisma.order.findUnique({
      where: { id: payload.internalOrderId },
      select: {
        id: true,
        orderId: true,
        merchantId: true,
        customer: true,
        products: true,
        statusHistory: true,
        currency: true,
      },
    });
    if (!order) {
      return NextResponse.json({ error: "Checkout session not found." }, { status: 404 });
    }

    const existingCustomer =
      order.customer && typeof order.customer === "object" && !Array.isArray(order.customer)
        ? (order.customer as Record<string, unknown>)
        : {};
    if (String(existingCustomer.email || "").trim().toLowerCase() !== payload.email.toLowerCase()) {
      return NextResponse.json({ error: "Checkout session does not match customer." }, { status: 403 });
    }

    const productItems = toProductItems(order.products);
    const primaryItem = productItems[0];
    const productId = String(primaryItem?.productId || primaryItem?.id || "").trim();
    if (!productId) {
      return NextResponse.json({ error: "Checkout product is missing." }, { status: 409 });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        merchantId: true,
        name: true,
        brand: true,
        price: true,
        imageUrl: true,
        stockQuantity: true,
        isAvailable: true,
      },
    });
    if (!product || !product.isAvailable) {
      return NextResponse.json({ error: "This product is not available anymore." }, { status: 409 });
    }

    const quantity = Math.max(1, Math.floor(Number(body.quantity || primaryItem?.quantity || 1)));
    if ((product.stockQuantity || 0) < quantity) {
      return NextResponse.json(
        { error: `Only ${product.stockQuantity} units are currently available.` },
        { status: 409 }
      );
    }

    const customer: CustomerPayload = {
      name: String(body.customer?.name || existingCustomer.name || "").trim(),
      email: String(body.customer?.email || existingCustomer.email || "").trim().toLowerCase(),
      phone: String(body.customer?.phone || existingCustomer.phone || "").trim(),
      addressLine1: String(body.customer?.addressLine1 || existingCustomer.addressLine1 || "").trim(),
      addressLine2: String(body.customer?.addressLine2 || existingCustomer.addressLine2 || "").trim(),
      city: String(body.customer?.city || existingCustomer.city || "").trim(),
      state: String(body.customer?.state || existingCustomer.state || "").trim(),
      zipCode: String(body.customer?.zipCode || existingCustomer.zipCode || "").trim(),
    };
    customer.address =
      String(body.customer?.address || "").trim() || buildAddress(customer);

    const validationError = validateCustomer(customer);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }
    if (customer.email !== payload.email.toLowerCase()) {
      return NextResponse.json(
        { error: "You can only use the checkout for the original customer email." },
        { status: 403 }
      );
    }

    const merchantId = String(order.merchantId || product.merchantId || "").trim();
    if (!merchantId) {
      return NextResponse.json({ error: "Merchant is missing for this checkout." }, { status: 409 });
    }

    const merchantConfig = await getMerchantRazorpayConfig(merchantId);
    const amountRupees = Number(product.price || 0) * quantity;
    const amountPaise = Math.max(100, Math.round(amountRupees * 100));
    const receipt = `wa_${merchantId}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const razorpayOrder = await createRazorpayOrderWithConfig(
      {
        amount: amountPaise,
        currency: order.currency || "INR",
        receipt,
        notes: {
          source: "whatsapp_checkout",
          merchantId,
          customerEmail: customer.email,
          productIds: product.id,
          quantities: String(quantity),
          productName: `${product.name} x${quantity}`,
        },
      },
      {
        keyId: merchantConfig.keyId,
        keySecret: merchantConfig.keySecret,
      }
    );

    const statusHistory = Array.isArray(order.statusHistory)
      ? (order.statusHistory as Array<Record<string, unknown>>)
      : [];
    const nextStatusHistory = [
      ...statusHistory,
      {
        status: "created",
        note: "Checkout refreshed on Rasphia hosted checkout",
        by: customer.email,
        at: new Date().toISOString(),
      },
    ];

    await prisma.order.update({
      where: { id: order.id },
      data: {
        orderId: razorpayOrder.id,
        paymentId: null,
        amount: amountRupees,
        currency: order.currency || "INR",
        receipt,
        status: "created",
        mode: "razorpay",
        products: [
          {
            productId: product.id,
            name: product.name,
            brand: product.brand,
            price: product.price,
            imageUrl: product.imageUrl,
            quantity,
          },
        ],
        customer: {
          ...existingCustomer,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
          addressLine1: customer.addressLine1,
          addressLine2: customer.addressLine2,
          city: customer.city,
          state: customer.state,
          zipCode: customer.zipCode,
          paymentProvider: "razorpay",
          paymentRail: "razorpay",
          channel: "whatsapp",
        },
        verifiedAt: null,
        invoiceNumber: null,
        invoiceId: null,
        invoicePdfUrl: null,
        invoiceGeneratedAt: null,
        invoiceSyncStatus: null,
        invoiceSyncError: null,
        invoiceSyncedAt: null,
        statusHistory: nextStatusHistory as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
    });

    return GET(
      new NextRequest(`${req.nextUrl.origin}/api/whatsapp-checkout/session?token=${encodeURIComponent(token)}`)
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to refresh checkout session.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
