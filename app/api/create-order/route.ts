import { NextResponse } from "next/server";
import { authGuard } from "@/app/lib/auth-guard";
import { prisma } from "@/app/lib/prisma";
import {
  buildSeedhapePaymentLinks,
  createSeedhapeOrderWithConfig,
} from "@/app/lib/seedhape";
import { getMerchantSeedhapeConfig } from "@/app/lib/merchant-seedhape";
import {
  getMerchantPreferredPaymentProvider,
  getMerchantRazorpayConfig,
} from "@/app/lib/merchant-razorpay";
import { createRazorpayOrderWithConfig } from "@/app/lib/razorpay";

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

type ResolvedRequestedItem = {
  productId: string;
  quantity: number;
  product: {
    id: string;
    merchantId: string | null;
    name: string;
    brand: string | null;
    price: number | null;
    imageUrl: string | null;
  };
};

type PaymentOrderResponse = {
  id: string;
  provider: "seedhape" | "razorpay";
  internalOrderId: string;
  appOrderId: string | null;
  merchantId: string;
  merchantName: string;
  productName: string;
  productIds: string[];
  amount: number;
  currency: string;
  status: string;
  seedhapeOrderId?: string;
  seedhapeBaseUrl?: string;
  upiUri?: string;
  qrCode?: string;
  expiresAt?: string;
  paymentLinks?: ReturnType<typeof buildSeedhapePaymentLinks>;
  razorpayOrderId?: string;
  razorpayKeyId?: string;
  checkoutPrefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
};

type SeedhapeMerchantConfig = Awaited<ReturnType<typeof getMerchantSeedhapeConfig>>;
type RazorpayMerchantConfig = Awaited<ReturnType<typeof getMerchantRazorpayConfig>>;
type SelectedPaymentConfig =
  | {
      provider: "seedhape";
      seedhapeConfig: SeedhapeMerchantConfig;
      razorpayConfig: null;
    }
  | {
      provider: "razorpay";
      seedhapeConfig: null;
      razorpayConfig: RazorpayMerchantConfig;
    };

export async function POST(req: Request) {
  try {
    // 1️⃣ Authenticate user + parse JSON safely
    const { sessionEmail, body, errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;

    const { products, customer, paymentProvider } = body;

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

    const currency = "INR";
    const merchantIds = Array.from(
      new Set(
        requestedItems
          .map((item) => String(productMap.get(item.productId)?.merchantId || "").trim())
          .filter(Boolean)
      )
    );
    const merchants = merchantIds.length
      ? await prisma.merchant.findMany({
          where: { id: { in: merchantIds } },
          select: { id: true, name: true },
        })
      : [];
    const merchantNameMap = new Map(merchants.map((m) => [m.id, m.name]));
    const merchantConfigCache = new Map<string, SeedhapeMerchantConfig>();
    const merchantRazorpayConfigCache = new Map<string, RazorpayMerchantConfig>();
    const merchantPreferenceCache = new Map<string, "seedhape" | "razorpay" | null>();

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

    const resolvedItems: ResolvedRequestedItem[] = requestedItems.map((item) => {
      const product = productMap.get(item.productId)!;
      return {
        productId: item.productId,
        quantity: item.quantity,
        product: {
          id: String(product.id || "").trim(),
          merchantId: product.merchantId,
          name: String(product.name || "").trim(),
          brand: product.brand || null,
          price: product.price ?? null,
          imageUrl: product.imageUrl || null,
        },
      };
    });

    const groupedByMerchant = new Map<string, ResolvedRequestedItem[]>();
    for (const item of resolvedItems) {
      const merchantId = String(item.product.merchantId || "").trim();
      if (!merchantId) {
        return NextResponse.json(
          { error: `Product ${item.product.name} is not linked to an approved merchant.` },
          { status: 409 }
        );
      }
      const existing = groupedByMerchant.get(merchantId) || [];
      existing.push(item);
      groupedByMerchant.set(merchantId, existing);
    }

    const paymentOrders: PaymentOrderResponse[] = [];
    for (const [merchantId, merchantItems] of groupedByMerchant.entries()) {
      const itemTotal = merchantItems.reduce(
        (sum, item) => sum + Number(item.product.price || 0) * item.quantity,
        0
      );
      const amountInPaise = Math.max(100, Math.round(itemTotal * 100));
      const receipt = `pay_${merchantId}_${Date.now()}_${Math.floor(
        Math.random() * 10000
      )}`;
      const orderSummary =
        merchantItems.length === 1
          ? `${merchantItems[0].product.name} x${merchantItems[0].quantity}`
          : `${merchantItems[0].product.name} + ${merchantItems.length - 1} more item${
              merchantItems.length > 2 ? "s" : ""
            }`;
      const primaryProduct = merchantItems[0].product;

      const requestedProvider = String(paymentProvider || "").trim().toLowerCase();
      if (requestedProvider && requestedProvider !== "seedhape" && requestedProvider !== "razorpay") {
        return NextResponse.json(
          { error: "paymentProvider must be either seedhape or razorpay." },
          { status: 400 }
        );
      }

      let preferredProvider = merchantPreferenceCache.get(merchantId);
      if (preferredProvider === undefined) {
        preferredProvider = await getMerchantPreferredPaymentProvider(merchantId);
        merchantPreferenceCache.set(merchantId, preferredProvider);
      }

      const provider = (requestedProvider ||
        preferredProvider ||
        "razorpay") as "seedhape" | "razorpay";

      const trySeedhape = async () => {
        let cfg = merchantConfigCache.get(merchantId);
        if (!cfg) {
          cfg = await getMerchantSeedhapeConfig(merchantId);
          merchantConfigCache.set(merchantId, cfg);
        }
        return {
          provider: "seedhape",
          seedhapeConfig: cfg,
          razorpayConfig: null,
        } satisfies SelectedPaymentConfig;
      };

      const tryRazorpay = async () => {
        let cfg = merchantRazorpayConfigCache.get(merchantId);
        if (!cfg) {
          cfg = await getMerchantRazorpayConfig(merchantId);
          merchantRazorpayConfigCache.set(merchantId, cfg);
        }
        return {
          provider: "razorpay",
          seedhapeConfig: null,
          razorpayConfig: cfg,
        } satisfies SelectedPaymentConfig;
      };

      let selectedConfig: SelectedPaymentConfig;

      try {
        if (provider === "seedhape") {
          selectedConfig = await trySeedhape();
        } else {
          selectedConfig = await tryRazorpay();
        }
      } catch (primaryError) {
        if (requestedProvider) {
          const message =
            primaryError instanceof Error
              ? primaryError.message
              : "Merchant payment setup missing.";
          return NextResponse.json(
            {
              error: `Merchant payment setup is incomplete for ${orderSummary}. (${message})`,
            },
            { status: 409 }
          );
        }

        try {
          if (provider === "seedhape") {
            selectedConfig = await tryRazorpay();
          } else {
            selectedConfig = await trySeedhape();
          }
        } catch (secondaryError) {
          const primaryMessage =
            primaryError instanceof Error ? primaryError.message : "Primary provider unavailable.";
          const secondaryMessage =
            secondaryError instanceof Error
              ? secondaryError.message
              : "Fallback provider unavailable.";
          return NextResponse.json(
            {
              error: `Merchant payment setup is incomplete for ${orderSummary}. (${primaryMessage}; fallback: ${secondaryMessage})`,
            },
            { status: 409 }
          );
        }
      }

      let providerOrderId = "";
      let providerStatus = "created";
      let orderMode = "products";
      let customerPayload: Record<string, unknown> = {
        name: customer.name,
        email: sessionEmail,
        phone: customer.phone,
        address: customer.address,
        addressLine1: customer.addressLine1,
        addressLine2: customer.addressLine2,
        city: customer.city,
        state: customer.state,
        zipCode: customer.zipCode,
      };

      let responseOrder: PaymentOrderResponse | null = null;
      if (selectedConfig.provider === "seedhape") {
        const { seedhapeConfig } = selectedConfig;
        const seedhapeOrder = await createSeedhapeOrderWithConfig(
          {
            amount: amountInPaise,
            description: orderSummary,
            externalOrderId: receipt,
            expectedSenderName: String(customer.name || "").trim() || undefined,
            customerEmail: sessionEmail,
            customerPhone: String(customer.phone || "").trim() || undefined,
            expiresInMinutes: 30,
            metadata: {
              source: "web_checkout",
              merchantId,
              customerEmail: sessionEmail,
              productIds: merchantItems.map((item) => item.product.id).join(","),
              quantities: merchantItems.map((item) => String(item.quantity)).join(","),
            },
          },
          {
            apiKey: seedhapeConfig.apiKey,
            baseUrl: seedhapeConfig.baseUrl,
          }
        );
        providerOrderId = seedhapeOrder.id;
        providerStatus = seedhapeOrder.status;
        orderMode = "seedhape";
        customerPayload = {
          ...customerPayload,
          paymentQrCode: seedhapeOrder.qrCode,
        };
        responseOrder = {
          id: seedhapeOrder.id,
          provider: "seedhape",
          seedhapeOrderId: seedhapeOrder.id,
          seedhapeBaseUrl: seedhapeConfig.baseUrl,
          internalOrderId: "",
          appOrderId: null,
          merchantId,
          merchantName: merchantNameMap.get(merchantId) || merchantId,
          productName: orderSummary,
          productIds: merchantItems.map((item) => item.product.id),
          amount: seedhapeOrder.amount,
          currency: seedhapeOrder.currency,
          status: seedhapeOrder.status,
          upiUri: seedhapeOrder.upiUri,
          qrCode: seedhapeOrder.qrCode,
          expiresAt: seedhapeOrder.expiresAt,
          paymentLinks: buildSeedhapePaymentLinks(
            seedhapeOrder.id,
            seedhapeOrder.upiUri,
            seedhapeConfig.baseUrl
          ),
        };
      } else {
        const { razorpayConfig } = selectedConfig;
        const razorpayOrder = await createRazorpayOrderWithConfig(
          {
            amount: amountInPaise,
            currency,
            receipt,
            notes: {
              source: "web_checkout",
              merchantId,
              customerEmail: sessionEmail,
              productIds: merchantItems.map((item) => item.product.id).join(","),
              quantities: merchantItems.map((item) => String(item.quantity)).join(","),
              productName: orderSummary,
            },
          },
          {
            keyId: razorpayConfig.keyId,
            keySecret: razorpayConfig.keySecret,
          }
        );
        providerOrderId = razorpayOrder.id;
        providerStatus = razorpayOrder.status;
        orderMode = "razorpay";
        responseOrder = {
          id: razorpayOrder.id,
          provider: "razorpay",
          razorpayOrderId: razorpayOrder.id,
          razorpayKeyId: razorpayConfig.keyId,
          internalOrderId: "",
          appOrderId: null,
          merchantId,
          merchantName: merchantNameMap.get(merchantId) || merchantId,
          productName: orderSummary,
          productIds: merchantItems.map((item) => item.product.id),
          amount: Number(razorpayOrder.amount || amountInPaise),
          currency: String(razorpayOrder.currency || currency),
          status: String(razorpayOrder.status || "created"),
          checkoutPrefill: {
            name: String(customer.name || "").trim() || undefined,
            email: sessionEmail,
            contact: String(customer.phone || "").trim() || undefined,
          },
        };
      }

      const createdOrder = await prisma.order.create({
        data: {
          orderId: providerOrderId,
          merchantId,
          paymentId: null,
          amount: itemTotal,
          currency,
          receipt,
          status: "created",
          mode: orderMode,
          products: merchantItems.map((item) => ({
            productId: item.product.id,
            name: item.product.name,
            brand: item.product.brand,
            price: item.product.price,
            imageUrl: item.product.imageUrl,
            quantity: item.quantity,
          })),
          customer: {
            name: customer.name,
            email: sessionEmail,
            phone: customer.phone,
            address: customer.address,
            addressLine1: customer.addressLine1,
            addressLine2: customer.addressLine2,
            city: customer.city,
            state: customer.state,
            zipCode: customer.zipCode,
            paymentProvider: selectedConfig.provider,
            ...customerPayload,
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
              note: `Order created via ${selectedConfig.provider === "razorpay" ? "Razorpay" : "SeedhaPe"}`,
              by: sessionEmail,
              at: new Date().toISOString(),
            },
          ],
          isReviewed: false,
          createdAt: new Date(),
        },
      });

        paymentOrders.push({
          ...(responseOrder as PaymentOrderResponse),
          internalOrderId: createdOrder.id,
          appOrderId: createdOrder.receipt || null,
          status: providerStatus,
        });
    }

    return NextResponse.json({ orders: paymentOrders }, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error creating SeedhaPe order";
    console.error("❌ Error creating SeedhaPe order:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
