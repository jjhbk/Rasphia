import Razorpay from "razorpay";
import { NextResponse } from "next/server";
import { authGuard } from "@/app/lib/auth-guard";
import { prisma } from "@/app/lib/prisma";

type IncomingProduct = {
  id?: string;
  _id?: string;
  name: string;
  brand?: string;
  price?: number;
  imageUrl?: string;
  quantity?: number;
};

type AddressBookEntry = {
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  address: string;
};

export async function POST(req: Request) {
  try {
    // 1️⃣ Authenticate user + parse JSON safely
    const { sessionEmail, body, errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;

    const { products, customer } = body;

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
    if (!/^\+?[0-9\s\-()]{8,20}$/.test(String(customer.phone || "").trim())) {
      return NextResponse.json(
        { error: "Invalid phone number format" },
        { status: 400 }
      );
    }
    if (
      !String(customer.addressLine1 || "").trim() ||
      !String(customer.addressLine2 || "").trim() ||
      !String(customer.city || "").trim() ||
      !String(customer.state || "").trim() ||
      !/^[A-Za-z0-9\- ]{4,12}$/.test(String(customer.zipCode || "").trim())
    ) {
      return NextResponse.json(
        { error: "Invalid shipping address fields" },
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

    const rawItems = (products as IncomingProduct[]).map((p) => ({
      productId: String(p.id || p._id || "").trim(),
      name: String(p.name || "").trim(),
      quantity: Math.max(1, Number(p.quantity || 1)),
    }));

    const ids = rawItems.map((i) => i.productId).filter(Boolean);
    const names = rawItems.map((i) => i.name).filter(Boolean);
    const byId = ids.length
      ? await prisma.product.findMany({ where: { id: { in: ids } } })
      : [];
    const byName = names.length
      ? await prisma.product.findMany({ where: { name: { in: names } } })
      : [];
    const dbProducts = [...byId, ...byName].filter(
      (p, index, arr) => arr.findIndex((x) => x.id === p.id) === index
    );
    const productMap = new Map(dbProducts.map((p) => [p.id, p]));
    const nameMap = new Map(dbProducts.map((p) => [p.name, p]));

    const requestedItems = rawItems.map((item) => {
      const resolved = item.productId
        ? productMap.get(item.productId)
        : nameMap.get(item.name);
      return {
        productId: resolved?.id || "",
        quantity: item.quantity,
      };
    });

    if (requestedItems.some((item) => !item.productId)) {
      return NextResponse.json(
        { error: "Some products could not be resolved for checkout" },
        { status: 404 }
      );
    }

    for (const item of requestedItems) {
      const dbProduct = productMap.get(item.productId);
      if (!dbProduct) {
        return NextResponse.json(
          { error: `Product not found: ${item.productId}` },
          { status: 404 }
        );
      }
      if (!dbProduct.isAvailable || dbProduct.stockQuantity < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${dbProduct.name}` },
          { status: 409 }
        );
      }
    }

    const calculatedTotal = requestedItems.reduce((sum, item) => {
      const dbProduct = productMap.get(item.productId)!;
      return sum + (dbProduct.price || 0) * item.quantity;
    }, 0);

    // 3️⃣ Razorpay initialization
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const amount = Math.round(calculatedTotal * 100); // convert to paisa
    const currency = "INR";
    const receipt = `receipt_${Date.now()}`;

    // 4️⃣ Create Razorpay order
    const order = await razorpay.orders.create({
      amount,
      currency,
      receipt,
      notes: {
        customerEmail: sessionEmail, // Trust session only
        items: requestedItems
          .map((p) => `${productMap.get(p.productId)?.name || p.productId} x${p.quantity}`)
          .join(", "),
      },
    });

    const addressEntry: AddressBookEntry = {
      name: String(customer.name || "").trim(),
      phone: String(customer.phone || "").trim(),
      addressLine1: String(customer.addressLine1 || "").trim(),
      addressLine2: String(customer.addressLine2 || "").trim(),
      city: String(customer.city || "").trim(),
      state: String(customer.state || "").trim(),
      zipCode: String(customer.zipCode || "").trim(),
      address: String(customer.address || "").trim(),
    };

    // 7️⃣ Upsert user profile (safe)
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
        updatedAt: new Date(),
      },
    });
    const existingProfile = await prisma.userProfile.findUnique({
      where: { email: sessionEmail },
      select: { addressBook: true },
    });
    const existingAddressBook: AddressBookEntry[] = Array.isArray(
      existingProfile?.addressBook
    )
      ? (existingProfile?.addressBook as AddressBookEntry[])
      : [];
    const mergedAddressBook = existingAddressBook.some(
      (entry) => entry.address === addressEntry.address
    )
      ? existingAddressBook.map((entry) =>
          entry.address === addressEntry.address ? addressEntry : entry
        )
      : [addressEntry, ...existingAddressBook];

    await prisma.userProfile.upsert({
      where: { email: sessionEmail },
      create: {
        email: sessionEmail,
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

    // 8️⃣ Create order record in DB
    await prisma.order.create({
      data: {
      orderId: order.id,
      paymentId: null,
      amount: calculatedTotal,
      currency,
      receipt,
      status: "created",
      products: requestedItems.map((item) => {
        const p = productMap.get(item.productId)!;
        return {
          productId: p.id,
          name: p.name,
          brand: p.brand,
          price: p.price,
          imageUrl: p.imageUrl,
          quantity: item.quantity,
        };
      }),
      customer: {
        name: customer.name,
        email: sessionEmail, // Trust session only
        phone: customer.phone,
        address: customer.address,
        addressLine1: customer.addressLine1,
        addressLine2: customer.addressLine2,
        city: customer.city,
        state: customer.state,
        zipCode: customer.zipCode,
      },
      trackingNumber: null,
      shippingProvider: null,
      trackingUrl: null,
      estimatedDelivery: null,
      shippedAt: null,
      deliveredAt: null,
      statusHistory: [
        {
          status: "created",
          note: "Order created",
          by: sessionEmail,
          at: new Date().toISOString(),
        },
      ],
      isReviewed: false,
      createdAt: new Date(),
      },
    });

    return NextResponse.json(order, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error creating Razorpay order";
    console.error("❌ Error creating Razorpay order:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
