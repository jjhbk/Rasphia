import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { randomUUID } from "crypto";
import { prisma } from "@/app/lib/prisma";
import {
  buildSeedhapePaymentLinks,
  createSeedhapeOrderWithConfig,
} from "@/app/lib/seedhape";
import { getMerchantSeedhapeConfig } from "@/app/lib/merchant-seedhape";
import type { Prisma } from "@prisma/client";

const PUBLIC_STOREFRONT_STATUSES = [
  "approved",
  "APPROVED",
  "Approved",
  "active",
  "ACTIVE",
  "Active",
] as const;

const ACTIVE_ORDER_STATUSES = new Set(["created", "paid", "Processing", "Shipped"]);
const TERMINAL_REQUEST_STATUSES = new Set(["completed", "rejected"]);

const geminiApiKey =
  process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";
const gemini = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function phoneVariants(input: string) {
  const raw = String(input || "").trim();
  const digits = raw.replace(/[^\d]/g, "");
  const variants = new Set<string>();
  if (raw) variants.add(raw);
  if (digits) {
    variants.add(digits);
    variants.add(`+${digits}`);
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    const local = digits.slice(2);
    variants.add(local);
    variants.add(`+${local}`);
  }
  if (digits.length === 10) {
    variants.add(`91${digits}`);
    variants.add(`+91${digits}`);
  }
  return Array.from(variants).filter(Boolean);
}

function formatStorefrontMessage(lines: string[]) {
  return lines.filter(Boolean).join("\n");
}

function buildStorefrontFirstMessageGuide(args: {
  merchantName: string;
  merchantSlug: string;
  hasUserSession: boolean;
}) {
  return formatStorefrontMessage([
    `*Welcome to ${args.merchantName} storefront chat*`,
    "You can discover products, place orders, pay, and manage post-order requests here.",
    "",
    "*How to use this chat*",
    "1) *Discover products*",
    "Example: discover products query=table lamp maxPrice=2000",
    "2) *Place order*",
    "Example: buy product=Canvas Lamp qty=2 address=Flat 4B, MG Road, Hyderabad 500001",
    "3) *Track order / status*",
    "Example: my orders",
    "Example: track order orderId=sp_ord_ab12cd34ef56",
    "4) *Request refund*",
    "Example: refund orderId=sp_ord_ab12cd34ef56 reason=Received damaged item",
    "5) *Request replacement*",
    "Example: replacement orderId=sp_ord_ab12cd34ef56 reason=Wrong size received",
    "6) *Request cancellation*",
    "Example: cancel order orderId=sp_ord_ab12cd34ef56 reason=Ordered by mistake",
    "",
    "*Notes*",
    `- Merchant context is fixed to: ${args.merchantSlug}`,
    "- Payment links and Android intent links are sent after order creation.",
    args.hasUserSession
      ? "- Your login session is detected for order and service-request actions."
      : "- Please login first before placing orders or creating refund/replacement/cancellation requests.",
    "",
    "Reply with any command to continue.",
  ]);
}

function extractQuantity(message: string) {
  const qty = message.match(/(?:qty|quantity|x)\s*[:=]?\s*(\d{1,3})/i)?.[1];
  const n = Number(qty || 1);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.floor(n));
}

function extractOrderId(message: string) {
  return (
    message.match(/\border(?:\s*id)?\s*[:=]\s*([A-Za-z0-9_\-]+)/i)?.[1] ||
    message.match(/\b(sp_ord_[A-Za-z0-9_\-]+)/i)?.[1] ||
    ""
  ).trim();
}

function extractReason(message: string) {
  return (
    message.match(/\breason\s*[:=]\s*(.+)$/i)?.[1] ||
    message.match(/\b(?:refund|replace(?:ment)?|cancel(?:lation)?)\b\s+(.+)$/i)?.[1] ||
    ""
  ).trim();
}

function resolvePublicBaseUrl(req: Request) {
  const configured =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.RASPHIA_BASE_URL ||
    "";
  const base = String(configured || "").trim().replace(/\/+$/, "");
  if (base) return base;
  try {
    return new URL(req.url).origin;
  } catch {
    return "";
  }
}

function extractShippingAddress(message: string) {
  return (
    message.match(/\b(?:shippingAddress|shipping_address|address)\s*[:=]\s*(.+)$/i)?.[1] ||
    ""
  ).trim();
}

function isCreateOrderIntent(message: string) {
  return /\b(buy|place\s+order|create\s+order|order\s+now)\b/i.test(message);
}

function isRefundIntent(message: string) {
  return /\b(refund|money\s*back|return\s+money)\b/i.test(message);
}

function isReplacementIntent(message: string) {
  return /\b(replace|replacement)\b/i.test(message);
}

function isCancellationIntent(message: string) {
  return /\b(cancel|cancellation)\b/i.test(message) && /\border\b/i.test(message);
}

function isActiveOrdersIntent(message: string) {
  return /\b(active\s+orders?|my\s+active\s+orders?)\b/i.test(message);
}

function isOrderDetailsIntent(message: string) {
  return /\b(order\s+details?|track\s+order|order\s+status)\b/i.test(message);
}

function isMyOrdersIntent(message: string) {
  return /\b(my\s+orders?)\b/i.test(message);
}

function isGuideIntent(message: string) {
  return /^(hi|hello|hey|start|help|\?)\b/i.test(String(message || "").trim());
}

function resolveProductNameFromMessage(message: string) {
  return (
    message.match(/\b(?:product|item|name)\s*[:=]\s*([^,]+)$/i)?.[1] ||
    message.match(/\b(?:buy|order|purchase)\s+(.+?)(?:\s+(?:qty|quantity|x)\s*[:=]?\s*\d+)?$/i)?.[1] ||
    ""
  )
    .replace(/\s+/g, " ")
    .trim();
}

async function findUserProfileByEmail(email: string) {
  if (!email) return null;
  return prisma.userProfile.findUnique({
    where: { email },
    select: { email: true, name: true, phone: true, address: true },
  });
}

async function findUserProfileByIdentity(email: string, phone: string) {
  const normalizedEmail = normalizeEmail(email);
  if (normalizedEmail) {
    const byEmail = await findUserProfileByEmail(normalizedEmail);
    if (byEmail) return byEmail;
  }

  const variants = phoneVariants(phone);
  if (!variants.length) return null;
  return prisma.userProfile.findFirst({
    where: {
      OR: variants.map((v) => ({ phone: v })),
    },
    select: { email: true, name: true, phone: true, address: true },
  });
}

async function createServiceRequestForStorefront(args: {
  orderId: string;
  type: "refund" | "replacement" | "cancellation";
  reason: string;
  details?: string;
  requestedByEmail: string;
  merchantId: string;
}) {
  const order = await prisma.order.findUnique({
    where: { orderId: args.orderId },
    select: {
      id: true,
      orderId: true,
      status: true,
      amount: true,
      currency: true,
      receipt: true,
      merchantId: true,
      customer: true,
      products: true,
      createdAt: true,
    },
  });

  if (!order) return { error: "Order not found", status: 404 as const };
  if (String(order.merchantId || "") !== args.merchantId) {
    return { error: "This order does not belong to this merchant.", status: 403 as const };
  }

  const orderEmail = String((order.customer as Record<string, unknown>)?.email || "")
    .trim()
    .toLowerCase();
  if (orderEmail !== args.requestedByEmail.toLowerCase()) {
    return { error: "You can request service only for your own order.", status: 403 as const };
  }

  const eligibleStatuses =
    args.type === "cancellation"
      ? new Set(["created", "paid", "Processing"])
      : new Set(["paid", "Processing", "Shipped", "Delivered"]);

  if (!eligibleStatuses.has(String(order.status || ""))) {
    return {
      error: `This order is not eligible for ${args.type} at its current status.`,
      status: 409 as const,
    };
  }

  const existingOpen = await prisma.orderServiceRequest.findFirst({
    where: {
      orderId: args.orderId,
      type: args.type,
      status: { notIn: Array.from(TERMINAL_REQUEST_STATUSES) },
    },
    select: { requestId: true },
  });
  if (existingOpen) {
    return {
      error: `A ${args.type} request is already open for this order.`,
      status: 409 as const,
    };
  }

  const merchantEmail = await prisma.merchant
    .findUnique({ where: { id: args.merchantId }, select: { email: true } })
    .then((m) => m?.email || null);

  const requestId = `SR-${randomUUID()}`;
  const d = new Date();
  const requestNumber = `RR-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate()
  ).padStart(2, "0")}-${Math.floor(Math.random() * 900000) + 100000}`;

  await prisma.orderServiceRequest.create({
    data: {
      requestId,
      requestNumber,
      orderId: args.orderId,
      merchantId: args.merchantId,
      type: args.type,
      reason: args.reason,
      details: args.details?.trim() || null,
      requestedAmount: Number(order.amount || 0),
      requestedByEmail: args.requestedByEmail,
      merchantEmail,
      timeline: [
        {
          action: "requested",
          by: args.requestedByEmail,
          note: args.reason,
          at: new Date().toISOString(),
          source: "storefront_chat",
        },
      ] as Prisma.InputJsonValue,
      orderSnapshot: {
        id: order.id,
        orderId: order.orderId,
        receipt: order.receipt,
        status: order.status,
        amount: order.amount,
        currency: order.currency,
        merchantId: order.merchantId,
        createdAt: order.createdAt,
      } as Prisma.InputJsonValue,
      customerSnapshot: (order.customer || {}) as Prisma.InputJsonValue,
      requestedItems: (Array.isArray(order.products) ? order.products : []) as Prisma.InputJsonValue,
    },
  });

  return {
    ok: true,
    requestNumber,
  } as const;
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const params = await context.params;
    const slug = String(params.slug || "").trim().toLowerCase();
    if (!slug) {
      return NextResponse.json({ error: "Invalid storefront slug" }, { status: 400 });
    }

    const body = await req.json();
    const message = String(body?.message || "").trim();
    const history: ChatMessage[] = Array.isArray(body?.history)
      ? body.history
          .map((m: any) => ({
            role: m?.role === "assistant" ? "assistant" : "user",
            text: String(m?.text || "").trim(),
          }))
          .filter((m: ChatMessage) => m.text.length > 0)
          .slice(-6)
      : [];

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const merchant = await prisma.merchant.findFirst({
      where: { slug, status: { in: [...PUBLIC_STOREFRONT_STATUSES] } },
      select: {
        id: true,
        name: true,
        storefrontDescription: true,
        chatbotWelcomeMessage: true,
      },
    });

    if (!merchant) {
      return NextResponse.json({ error: "Storefront not found" }, { status: 404 });
    }

    const products = await prisma.product.findMany({
      where: { merchantId: merchant.id },
      orderBy: { updatedAt: "desc" },
      take: 80,
      select: {
        id: true,
        name: true,
        brand: true,
        category: true,
        description: true,
        price: true,
        imageUrl: true,
        tags: true,
        stockQuantity: true,
        isAvailable: true,
      },
    });

    const normalizedMessage = message.toLowerCase();
    const userEmail = normalizeEmail(body?.userEmail);
    const userPhone = String(body?.userPhone || body?.phone || body?.fromPhone || "").trim();
    const userProfile = await findUserProfileByIdentity(userEmail, userPhone);

    const needsUserIdentity =
      isCreateOrderIntent(message) ||
      isRefundIntent(message) ||
      isReplacementIntent(message) ||
      isCancellationIntent(message) ||
      isActiveOrdersIntent(message) ||
      isOrderDetailsIntent(message) ||
      isMyOrdersIntent(message);

    if (needsUserIdentity && !userProfile) {
      return NextResponse.json(
        {
          text: formatStorefrontMessage([
            "*Account required before continuing*",
            "I could not find an account for this phone/email.",
            "Please create your account first by sharing:",
            "1) Name",
            "2) Email",
            "3) Phone number",
            "",
            "Example:",
            "register name=Rahul email=rahul@example.com phone=+919876543210",
          ]),
          suggestedProducts: [],
        },
        { status: 200 }
      );
    }
    const isFirstMessage = history.length === 0;

    if (isFirstMessage && isGuideIntent(message)) {
      const top = products.slice(0, 3).map((p) => ({ ...p, _id: p.id }));
      return NextResponse.json(
        {
          text: buildStorefrontFirstMessageGuide({
            merchantName: merchant.name,
            merchantSlug: slug,
            hasUserSession: Boolean(userProfile),
          }),
          suggestedProducts: top,
        },
        { status: 200 }
      );
    }

    if (isCreateOrderIntent(message)) {
      if (!userProfile) {
        return NextResponse.json(
          {
            text: "Please login to place an order from storefront chat.",
            suggestedProducts: [],
          },
          { status: 200 }
        );
      }

      const shippingAddress =
        extractShippingAddress(message) || String(userProfile.address || "").trim();
      if (!shippingAddress) {
        return NextResponse.json(
          {
            text: formatStorefrontMessage([
              "Please share your full delivery address before placing the order.",
              "Example:",
              "buy product=Canvas Lamp qty=2 address=Flat 4B, MG Road, Hyderabad 500001",
            ]),
            suggestedProducts: [],
          },
          { status: 200 }
        );
      }

      if (!String(userProfile.address || "").trim() && userProfile.email) {
        await prisma.userProfile.update({
          where: { email: userProfile.email },
          data: { address: shippingAddress, updatedAt: new Date() },
        });
      }

      const productName = resolveProductNameFromMessage(message);
      if (!productName) {
        return NextResponse.json(
          {
            text: "Please specify product name. Example: buy product=Canvas Lamp qty=2",
            suggestedProducts: [],
          },
          { status: 200 }
        );
      }

      const quantity = extractQuantity(message);
      const product = await prisma.product.findFirst({
        where: {
          merchantId: merchant.id,
          name: { contains: productName, mode: "insensitive" },
          isAvailable: true,
        },
        orderBy: { updatedAt: "desc" },
      });

      if (!product) {
        return NextResponse.json(
          {
            text: `No available product found matching "${productName}" in ${merchant.name}.`,
            suggestedProducts: [],
          },
          { status: 200 }
        );
      }

      if ((product.stockQuantity || 0) < quantity) {
        return NextResponse.json(
          {
            text: `Insufficient stock for ${product.name}. Available quantity is ${product.stockQuantity}.`,
            suggestedProducts: [{ ...product, _id: product.id }],
          },
          { status: 200 }
        );
      }

      const merchantConfig = await getMerchantSeedhapeConfig(merchant.id);
      const totalRupees = Number(product.price || 0) * quantity;
      const totalPaise = Math.max(100, Math.round(totalRupees * 100));
      const externalOrderId = `sf_${Date.now()}`;

      const seedhapeOrder = await createSeedhapeOrderWithConfig(
        {
          amount: totalPaise,
          description: `Storefront chat order: ${product.name} x${quantity}`,
          externalOrderId,
          expectedSenderName: String(userProfile.name || "").trim() || undefined,
          customerEmail: userProfile.email,
          customerPhone: String(userProfile.phone || "").trim() || undefined,
          expiresInMinutes: 30,
          metadata: {
            source: "storefront_chat",
            customerEmail: userProfile.email,
            merchantId: merchant.id,
            productId: product.id,
            quantity,
            storefrontSlug: slug,
          },
        },
        {
          apiKey: merchantConfig.apiKey,
          baseUrl: merchantConfig.baseUrl,
        }
      );

      const createdOrder = await prisma.order.create({
        data: {
          orderId: seedhapeOrder.id,
          merchantId: merchant.id,
          paymentId: null,
          amount: totalRupees,
          currency: "INR",
          receipt: externalOrderId,
          status: "created",
          mode: "seedhape_storefront_chat",
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
            name: String(userProfile.name || "").trim(),
            email: userProfile.email,
            phone: String(userProfile.phone || "").trim(),
            address: shippingAddress,
            paymentQrCode: seedhapeOrder.qrCode,
            channel: "storefront_chat",
            merchantSlug: slug,
          },
          statusHistory: [
            {
              status: "created",
              note: "Order created via Storefront chat with SeedhaPe",
              by: "storefront_user",
              at: new Date().toISOString(),
            },
          ],
          isReviewed: false,
          createdAt: new Date(),
        },
      });

      const links = buildSeedhapePaymentLinks(
        seedhapeOrder.id,
        seedhapeOrder.upiUri,
        merchantConfig.baseUrl
      );
      const publicBaseUrl = resolvePublicBaseUrl(req);
      const upiLauncher = publicBaseUrl
        ? `${publicBaseUrl}/api/upi-launch?${new URLSearchParams({
            upi: seedhapeOrder.upiUri,
            orderId: seedhapeOrder.id,
          }).toString()}`
        : links.hostedStatusUrl;
      const qrImageUrl = publicBaseUrl
        ? `${publicBaseUrl}/api/upi-qr?${new URLSearchParams({
            orderId: seedhapeOrder.id,
          }).toString()}`
        : "";

      return NextResponse.json(
        {
          text: formatStorefrontMessage([
            `*Merchant:* ${merchant.name}`,
            `*Order ID:* ${seedhapeOrder.id}`,
            `*App Order:* ${createdOrder.receipt || "n/a"}`,
            `*Item:* ${product.name} x${quantity}`,
            `*Amount:* ₹${totalRupees}`,
            "",
            "*Pay now:*",
            upiLauncher,
            ...(qrImageUrl ? ["", "*Scan or save QR image:*", qrImageUrl] : []),
            "",
            `After payment, reply with: \`track order orderId=${seedhapeOrder.id}\``,
          ]),
          suggestedProducts: [{ ...product, _id: product.id }],
        },
        { status: 200 }
      );
    }

    if (isRefundIntent(message) || isReplacementIntent(message) || isCancellationIntent(message)) {
      if (!userProfile) {
        return NextResponse.json(
          {
            text: "Please login to request refund/replacement/cancellation.",
            suggestedProducts: [],
          },
          { status: 200 }
        );
      }

      const orderId = extractOrderId(message);
      const reason = extractReason(message);
      if (!orderId || !reason) {
        return NextResponse.json(
          {
            text:
              "Please share order and reason. Example: refund orderId=sp_ord_xxx reason=Damaged item",
            suggestedProducts: [],
          },
          { status: 200 }
        );
      }

      const type = isRefundIntent(message)
        ? "refund"
        : isReplacementIntent(message)
        ? "replacement"
        : "cancellation";

      const result = await createServiceRequestForStorefront({
        orderId,
        type,
        reason,
        details: "",
        requestedByEmail: userProfile.email,
        merchantId: merchant.id,
      });

      if (!("ok" in result)) {
        return NextResponse.json(
          {
            text: result.error,
            suggestedProducts: [],
          },
          { status: 200 }
        );
      }

      return NextResponse.json(
        {
          text: formatStorefrontMessage([
            `${type === "refund" ? "Refund" : type === "replacement" ? "Replacement" : "Cancellation"} request submitted successfully.`,
            `*Request Number:* ${result.requestNumber}`,
            `*Order ID:* ${orderId}`,
            "*Status:* requested",
          ]),
          suggestedProducts: [],
        },
        { status: 200 }
      );
    }

    if (isActiveOrdersIntent(message) || isOrderDetailsIntent(message) || isMyOrdersIntent(message)) {
      if (!userProfile) {
        return NextResponse.json(
          {
            text: "Please login to fetch your orders.",
            suggestedProducts: [],
          },
          { status: 200 }
        );
      }

      const inputOrderId = extractOrderId(message).toLowerCase();
      const onlyActive = isActiveOrdersIntent(message);
      const orders = await prisma.order.findMany({
        where: { merchantId: merchant.id },
        orderBy: { createdAt: "desc" },
        take: 120,
      });

      const userOrders = orders.filter((order) => {
        const email = String((order.customer as Record<string, unknown>)?.email || "")
          .trim()
          .toLowerCase();
        if (email !== userProfile.email.toLowerCase()) return false;
        if (onlyActive && !ACTIVE_ORDER_STATUSES.has(String(order.status || ""))) return false;
        if (inputOrderId) return String(order.orderId || "").toLowerCase().includes(inputOrderId);
        return true;
      });

      if (!userOrders.length) {
        return NextResponse.json(
          {
            text: inputOrderId
              ? `No orders found for order ID "${inputOrderId}" in ${merchant.name}.`
              : onlyActive
              ? `No active orders found in ${merchant.name}.`
              : `No orders found in ${merchant.name} for your account.`,
            suggestedProducts: [],
          },
          { status: 200 }
        );
      }

      if (inputOrderId && userOrders.length) {
        const order = userOrders[0];
        const orderItems = Array.isArray(order.products)
          ? (order.products as Array<{ name?: string; quantity?: number }>)
          : [];
        const itemLine = orderItems
          .slice(0, 6)
          .map((p) => `${p.name || "Item"} x${Math.max(1, Number(p.quantity || 1))}`)
          .join(", ");

        return NextResponse.json(
          {
            text: formatStorefrontMessage([
              "*Order details*",
              `*Order ID:* ${order.orderId}`,
              `*Status:* ${order.status}`,
              `*Amount:* Rs ${order.amount}`,
              `*Items:* ${itemLine || "n/a"}`,
              order.trackingNumber ? `*Tracking:* ${order.trackingNumber}` : "",
            ]),
            suggestedProducts: [],
          },
          { status: 200 }
        );
      }

      const lines = userOrders.slice(0, 10).map((order) => {
        const tracking = order.trackingNumber ? ` | tracking ${order.trackingNumber}` : "";
        return `- ${order.orderId} | ${order.status} | Rs ${order.amount}${tracking}`;
      });

      return NextResponse.json(
        {
          text: formatStorefrontMessage([
            onlyActive ? "*Your active orders*" : "*Your orders*",
            ...lines,
          ]),
          suggestedProducts: [],
        },
        { status: 200 }
      );
    }

    if (!products.length) {
      return NextResponse.json(
        {
          text: `${merchant.chatbotWelcomeMessage || "Welcome."} This store has no listed products yet. Would you like to check back soon?`,
          suggestedProducts: [],
        },
        { status: 200 }
      );
    }

    const simpleMatches = products.filter((p) => {
      const tags = toStringArray(p.tags);
      const haystack = [
        p.name,
        p.brand || "",
        p.category || "",
        p.description || "",
        ...tags,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedMessage);
    });

    if (!gemini) {
      const top = (simpleMatches.length ? simpleMatches : products)
        .slice(0, 3)
        .map((p) => ({ ...p, _id: p.id }));
      return NextResponse.json(
        {
          text: "I can help with this store catalog. Here are a few relevant picks. Want me to narrow by budget or category?",
          suggestedProducts: top,
        },
        { status: 200 }
      );
    }

    const catalogContext = products
      .slice(0, 40)
      .map((p, i) => {
        const tags = toStringArray(p.tags).join(", ");
        return `${i + 1}. ${p.name} | Brand: ${p.brand || "-"} | Category: ${p.category || "General"} | Price: Rs ${p.price || "N/A"} | InStock: ${p.isAvailable && p.stockQuantity > 0 ? "yes" : "no"} | Tags: ${tags || "-"} | Description: ${p.description || "-"}`;
      })
      .join("\n");

    const schema = {
      type: Type.OBJECT,
      properties: {
        response: { type: Type.STRING },
        products: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
      required: ["response", "products"],
    } as const;

    const system = `
You are the concierge chatbot for merchant store "${merchant.name}" on Rasphia.
Store summary: ${merchant.storefrontDescription || "Not provided"}

Rules:
- Recommend only products from the provided catalog.
- Be concise, warm, practical.
- If asked for unavailable items, suggest available alternatives.
- Prefer 1-3 items max.
- End with one follow-up question.
- Return strict JSON.
`.trim();

    const conversationalHistory = history
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.text}`)
      .join("\n");

    try {
      const response = await gemini.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `${system}\n\nCatalog:\n${catalogContext}\n\nConversation:\n${conversationalHistory}\nUser: ${message}`,
        config: {
          temperature: 0.6,
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      });

      const raw = response.text || "{}";
      const parsed = JSON.parse(raw) as { response?: string; products?: string[] };

      const selectedNames = Array.isArray(parsed.products) ? parsed.products : [];
      const suggestedProducts = selectedNames
        .map((name) =>
          products.find((p) => p.name.toLowerCase() === String(name).toLowerCase())
        )
        .filter((p): p is (typeof products)[number] => Boolean(p))
        .slice(0, 3)
        .map((p) => ({ ...p, _id: p.id }));

      const fallbackSuggestions =
        suggestedProducts.length > 0
          ? suggestedProducts
          : (simpleMatches.length ? simpleMatches : products)
              .slice(0, 3)
              .map((p) => ({ ...p, _id: p.id }));

      return NextResponse.json(
        {
          text:
            parsed.response ||
            "I found a few options from this store. Want me to narrow by budget or use-case?",
          suggestedProducts: fallbackSuggestions,
        },
        { status: 200 }
      );
    } catch (llmError: unknown) {
      console.error("Storefront chat LLM fallback:", llmError);
      const top = (simpleMatches.length ? simpleMatches : products)
        .slice(0, 3)
        .map((p) => ({ ...p, _id: p.id }));
      return NextResponse.json(
        {
          text: "I can help with this store catalog. Here are a few relevant picks.",
          suggestedProducts: top,
        },
        { status: 200 }
      );
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Storefront chat failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
