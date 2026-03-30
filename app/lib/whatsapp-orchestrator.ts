import OpenAI from "openai";
import { z } from "zod";
import { prisma } from "@/app/lib/prisma";
import { ensureUniqueMerchantSlug } from "@/app/lib/merchantSlug";
import { generateProductEmbedding } from "@/app/lib/generateEmbeddings";
import { Prisma } from "@prisma/client";
import { uploadWhatsAppMediaToBlob } from "@/app/lib/whatsapp";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export const WA_INTENTS = [
  "merchant_register",
  "product_upload",
  "product_update",
  "product_query",
  "stock_update",
  "stock_query",
  "order_query_active",
  "order_update_status",
  "help",
  "unknown",
] as const;

export type WaIntent = (typeof WA_INTENTS)[number];

const MerchantRegistrationSchema = z.object({
  businessName: z.string().min(2),
  email: z.string().email(),
  addressLine1: z.string().min(3),
  addressLine2: z.string().min(2),
  city: z.string().min(2),
  state: z.string().min(2),
  zipCode: z.string().regex(/^[A-Za-z0-9\- ]{4,12}$/),
  locationLink: z.string().url(),
});

const ProductUploadSchema = z.object({
  name: z.string().min(2),
  category: z.string().min(2),
  price: z.coerce.number().positive(),
  stockQuantity: z.coerce.number().int().min(0),
  brand: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
});

const StockUpdateSchema = z.object({
  productName: z.string().min(2),
  stockQuantity: z.coerce.number().int().min(0),
});

const OrderUpdateSchema = z.object({
  orderId: z.string().min(4),
  status: z.enum([
    "created",
    "paid",
    "Processing",
    "Shipped",
    "Delivered",
    "Cancelled",
    "Refunded",
    "Replacement",
  ]),
});

type SessionData = {
  activeIntent?: WaIntent;
  draft?: Record<string, unknown>;
  lastPrompt?: string;
  processedMessageIds?: string[];
  pendingConfirmation?: {
    type: "stock_update_zero" | "order_status_update";
    intent: WaIntent;
    draft: Record<string, unknown>;
  } | null;
};

type IntentParse = {
  intent: WaIntent;
  fields: Record<string, unknown>;
};

const REQUIRED_BY_INTENT: Record<WaIntent, string[]> = {
  merchant_register: [
    "businessName",
    "email",
    "addressLine1",
    "addressLine2",
    "city",
    "state",
    "zipCode",
    "locationLink",
  ],
  product_upload: ["name", "category", "price", "stockQuantity"],
  product_update: ["productName"],
  product_query: [],
  stock_update: ["productName", "stockQuantity"],
  stock_query: [],
  order_query_active: [],
  order_update_status: ["orderId", "status"],
  help: [],
  unknown: [],
};

const FIELD_PROMPTS: Record<string, string> = {
  businessName: "Please share your business name.",
  email: "Please share your business email address.",
  addressLine1: "Please share address line 1.",
  addressLine2: "Please share address line 2.",
  city: "Please share your city.",
  state: "Please share your state.",
  zipCode: "Please share your ZIP/postal code.",
  locationLink: "Please share your location link (Google Maps URL).",
  name: "Please share the product name.",
  category: "Please share the product category.",
  price: "Please share the product price.",
  stockQuantity: "Please share stock quantity (number).",
  productName: "Please share the product name.",
  orderId: "Please share the order ID.",
  status:
    "Please share the target status (created, paid, Processing, Shipped, Delivered, Cancelled, Refunded, Replacement).",
};

function normalizePhone(input: string) {
  const digits = String(input || "").replace(/[^\d]/g, "");
  if (!digits) return "";
  return `+${digits}`;
}

function safeNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function isAffirmative(text: string) {
  const t = text.trim().toLowerCase();
  return ["yes", "y", "confirm", "ok", "okay", "proceed"].includes(t);
}

function isNegative(text: string) {
  const t = text.trim().toLowerCase();
  return ["no", "n", "cancel", "stop"].includes(t);
}

function missingRequired(intent: WaIntent, draft: Record<string, unknown>) {
  const required = REQUIRED_BY_INTENT[intent] || [];
  return required.filter((field) => {
    const value = draft[field];
    if (value === null || value === undefined) return true;
    if (typeof value === "string") return value.trim().length === 0;
    return false;
  });
}

async function getMerchantByPhone(phone: string) {
  const normalized = normalizePhone(phone);
  const variants = Array.from(
    new Set([phone, normalized, normalized.replace(/^\+/, "")].filter(Boolean))
  );
  return prisma.merchant.findFirst({
    where: {
      OR: variants.map((p) => ({ phone: p })),
    },
  });
}

async function getSession(phone: string) {
  const normalized = normalizePhone(phone) || phone;
  const existing = await prisma.whatsappSession.findUnique({
    where: { phone: normalized },
  });
  const data: SessionData =
    existing && typeof existing.data === "object" && existing.data
      ? (existing.data as SessionData)
      : { activeIntent: undefined, draft: {} };
  return {
    phone: normalized,
    record: existing,
    data,
  };
}

async function saveSession(phone: string, data: SessionData) {
  await prisma.whatsappSession.upsert({
    where: { phone },
    create: {
      phone,
      data: data as Prisma.InputJsonValue,
    },
    update: {
      data: data as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
  });
}

function fallbackIntent(message: string): IntentParse {
  const text = message.toLowerCase();
  if (text.includes("register") || text.includes("onboard")) {
    return { intent: "merchant_register", fields: {} };
  }
  if (text.includes("stock") && (text.includes("how much") || text.includes("check") || text.includes("query") || text.includes("available"))) {
    return { intent: "stock_query", fields: {} };
  }
  if (text.includes("stock")) {
    const qty = text.match(/(\d+)/)?.[1];
    return {
      intent: "stock_update",
      fields: qty ? { stockQuantity: Number(qty) } : {},
    };
  }
  if (text.includes("upload") || text.includes("add product")) {
    return { intent: "product_upload", fields: {} };
  }
  if (text.includes("update product")) {
    return { intent: "product_update", fields: {} };
  }
  if (text.includes("order") && text.includes("active")) {
    return { intent: "order_query_active", fields: {} };
  }
  if (text.includes("order") && text.includes("status")) {
    return { intent: "order_update_status", fields: {} };
  }
  if (text.includes("product")) {
    return { intent: "product_query", fields: {} };
  }
  return { intent: "unknown", fields: {} };
}

async function inferIntent(message: string, activeIntent?: WaIntent): Promise<IntentParse> {
  if (!openai) return fallbackIntent(message);

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      intent: {
        type: "string",
        enum: WA_INTENTS,
      },
      fields: {
        type: "object",
        additionalProperties: false,
        properties: {
          businessName: { type: "string" },
          email: { type: "string" },
          addressLine1: { type: "string" },
          addressLine2: { type: "string" },
          city: { type: "string" },
          state: { type: "string" },
          zipCode: { type: "string" },
          locationLink: { type: "string" },
          name: { type: "string" },
          productName: { type: "string" },
          category: { type: "string" },
          brand: { type: "string" },
          description: { type: "string" },
          price: { type: "number" },
          stockQuantity: { type: "number" },
          orderId: { type: "string" },
          status: { type: "string" },
        },
        required: [],
      },
    },
    required: ["intent", "fields"],
  } as const;

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    temperature: 0,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "whatsapp_merchant_intent",
        strict: true,
        schema,
      },
    },
    messages: [
      {
        role: "system",
        content: `You are an intent parser for Rasphia merchant WhatsApp automation.
Pick one intent from the enum.
Extract only explicit fields from user message.
If continuation message likely belongs to prior intent (${activeIntent || "none"}), keep same intent unless user clearly switched.`,
      },
      {
        role: "user",
        content: message,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(raw) as IntentParse;
  if (!WA_INTENTS.includes(parsed.intent)) {
    return fallbackIntent(message);
  }
  return {
    intent: parsed.intent,
    fields: parsed.fields || {},
  };
}

async function handleRegister(phone: string, draft: Record<string, unknown>) {
  const missing = missingRequired("merchant_register", draft);
  if (missing.length) {
    return {
      done: false,
      reply: FIELD_PROMPTS[missing[0]] || "Please share the missing details.",
      nextIntent: "merchant_register" as WaIntent,
      nextDraft: draft,
    };
  }

  const parsed = MerchantRegistrationSchema.safeParse(draft);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message || "Invalid registration details.";
    return {
      done: false,
      reply: `I found an issue: ${issue}. Please share valid details.`,
      nextIntent: "merchant_register" as WaIntent,
      nextDraft: draft,
    };
  }

  const payload = parsed.data;
  const slug = await ensureUniqueMerchantSlug(payload.businessName);
  const composedAddress = [
    payload.addressLine1,
    payload.addressLine2,
    `${payload.city}, ${payload.state} ${payload.zipCode}`,
  ]
    .filter(Boolean)
    .join(", ");

  await prisma.merchant.upsert({
    where: { email: payload.email.toLowerCase() },
    create: {
      slug,
      name: payload.businessName,
      phone,
      email: payload.email.toLowerCase(),
      address: composedAddress,
      addressLine1: payload.addressLine1,
      addressLine2: payload.addressLine2,
      city: payload.city,
      state: payload.state,
      zipCode: payload.zipCode,
      locationLink: payload.locationLink,
      status: "pending",
      chatbotWelcomeMessage:
        "Hi, welcome to our store. Tell me what you are looking for and I will help you quickly.",
    },
    update: {
      slug,
      name: payload.businessName,
      phone,
      address: composedAddress,
      addressLine1: payload.addressLine1,
      addressLine2: payload.addressLine2,
      city: payload.city,
      state: payload.state,
      zipCode: payload.zipCode,
      locationLink: payload.locationLink,
      status: "pending",
      approvedAt: null,
      approvedBy: null,
      updatedAt: new Date(),
    },
  });

  await prisma.userProfile.upsert({
    where: { email: payload.email.toLowerCase() },
    create: {
      email: payload.email.toLowerCase(),
      name: payload.businessName,
      phone,
      address: composedAddress,
      role: "merchant",
      credits: 0,
    },
    update: {
      name: payload.businessName,
      phone,
      address: composedAddress,
      role: "merchant",
      updatedAt: new Date(),
    },
  });

  return {
    done: true,
    reply:
      "Registration submitted successfully. Your merchant profile is now pending admin approval.",
    nextIntent: undefined,
    nextDraft: {},
  };
}

async function handleProductUpload(
  merchant: { id: string; email: string; status: string },
  draft: Record<string, unknown>
) {
  if (merchant.status !== "approved") {
    return {
      done: true,
      reply:
        "Your merchant account is pending approval. Product upload will be enabled once approved.",
      nextIntent: undefined,
      nextDraft: {},
    };
  }

  const missing = missingRequired("product_upload", draft);
  if (missing.length) {
    return {
      done: false,
      reply: FIELD_PROMPTS[missing[0]] || "Please share missing product details.",
      nextIntent: "product_upload" as WaIntent,
      nextDraft: draft,
    };
  }

  const parsed = ProductUploadSchema.safeParse(draft);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message || "Invalid product details.";
    return {
      done: false,
      reply: `I found an issue: ${issue}. Please share valid details.`,
      nextIntent: "product_upload" as WaIntent,
      nextDraft: draft,
    };
  }

  const payload = parsed.data;
  const product = await prisma.product.create({
    data: {
      merchantId: merchant.id,
      merchantEmail: merchant.email,
      name: payload.name,
      category: payload.category,
      price: payload.price,
      stockQuantity: payload.stockQuantity,
      isAvailable: payload.stockQuantity > 0,
      brand: payload.brand || "Unknown",
      description: payload.description || "",
      imageUrl: payload.imageUrl || "",
      tags: [],
      occasion: [],
      recipient: "Anyone",
      story: "",
      affiliateLink: "",
      embedding: Prisma.JsonNull,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  generateProductEmbedding(product.id).catch(() => {});

  return {
    done: true,
    reply: `Product created successfully: ${product.name} (₹${product.price || 0}, stock ${product.stockQuantity}).`,
    nextIntent: undefined,
    nextDraft: {},
  };
}

async function handleStockQuery(
  merchant: { id: string; status: string },
  draft: Record<string, unknown>
) {
  if (merchant.status !== "approved") {
    return {
      done: true,
      reply:
        "Your merchant account is pending approval. Stock query will be enabled once approved.",
      nextIntent: undefined,
      nextDraft: {},
    };
  }

  const productName = String(draft.productName || draft.name || "").trim();

  if (productName) {
    const products = await prisma.product.findMany({
      where: {
        merchantId: merchant.id,
        name: { contains: productName, mode: "insensitive" },
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    });
    if (!products.length) {
      return {
        done: true,
        reply: `No products found for "${productName}".`,
        nextIntent: undefined,
        nextDraft: {},
      };
    }
    const lines = products.map(
      (p) =>
        `• ${p.name}: stock ${p.stockQuantity}, ${p.isAvailable ? "available" : "unavailable"}`
    );
    return {
      done: true,
      reply: `Stock results:\n${lines.join("\n")}`,
      nextIntent: undefined,
      nextDraft: {},
    };
  }

  const products = await prisma.product.findMany({
    where: { merchantId: merchant.id },
    orderBy: [{ stockQuantity: "asc" }, { updatedAt: "desc" }],
    take: 10,
  });

  if (!products.length) {
    return {
      done: true,
      reply: "No products found in your catalog yet.",
      nextIntent: undefined,
      nextDraft: {},
    };
  }

  const lines = products.map(
    (p) =>
      `• ${p.name}: stock ${p.stockQuantity}, ${p.isAvailable ? "available" : "unavailable"}`
  );
  return {
    done: true,
    reply: `Top stock snapshot:\n${lines.join("\n")}\n\nYou can ask: "stock for <product name>"`,
    nextIntent: undefined,
    nextDraft: {},
  };
}

async function handleStockUpdate(
  merchant: { id: string; status: string },
  draft: Record<string, unknown>,
  options?: { skipConfirmation?: boolean }
) {
  if (merchant.status !== "approved") {
    return {
      done: true,
      reply:
        "Your merchant account is pending approval. Stock updates will be enabled once approved.",
      nextIntent: undefined,
      nextDraft: {},
    };
  }

  const missing = missingRequired("stock_update", draft);
  if (missing.length) {
    return {
      done: false,
      reply: FIELD_PROMPTS[missing[0]] || "Please share missing stock details.",
      nextIntent: "stock_update" as WaIntent,
      nextDraft: draft,
    };
  }

  const parsed = StockUpdateSchema.safeParse(draft);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message || "Invalid stock details.";
    return {
      done: false,
      reply: `I found an issue: ${issue}. Please share valid details.`,
      nextIntent: "stock_update" as WaIntent,
      nextDraft: draft,
    };
  }

  const payload = parsed.data;
  const product = await prisma.product.findFirst({
    where: {
      merchantId: merchant.id,
      name: { contains: payload.productName, mode: "insensitive" },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (!product) {
    return {
      done: true,
      reply: `No product found matching "${payload.productName}".`,
      nextIntent: undefined,
      nextDraft: {},
    };
  }

  if (payload.stockQuantity === 0 && !options?.skipConfirmation) {
    return {
      done: false,
      reply: `You are about to set stock of ${product.name} to 0 (unavailable). Reply YES to confirm or NO to cancel.`,
      nextIntent: "stock_update" as WaIntent,
      nextDraft: draft,
      pendingConfirmation: {
        type: "stock_update_zero" as const,
        intent: "stock_update" as WaIntent,
        draft,
      },
    };
  }

  const updated = await prisma.product.update({
    where: { id: product.id },
    data: {
      stockQuantity: payload.stockQuantity,
      isAvailable: payload.stockQuantity > 0,
      updatedAt: new Date(),
    },
  });

  return {
    done: true,
    reply: `Stock updated: ${updated.name} now has ${updated.stockQuantity} units and is ${updated.isAvailable ? "available" : "unavailable"}.`,
    nextIntent: undefined,
    nextDraft: {},
  };
}

async function handleProductQuery(
  merchant: { id: string; status: string },
  draft: Record<string, unknown>
) {
  if (merchant.status !== "approved") {
    return {
      done: true,
      reply:
        "Your merchant account is pending approval. Product query will be enabled once approved.",
      nextIntent: undefined,
      nextDraft: {},
    };
  }

  const q = String(draft.productName || draft.name || "").trim();
  const products = await prisma.product.findMany({
    where: {
      merchantId: merchant.id,
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });

  if (!products.length) {
    return {
      done: true,
      reply: q ? `No products found for "${q}".` : "No products found.",
      nextIntent: undefined,
      nextDraft: {},
    };
  }

  const lines = products.map(
    (p) => `• ${p.name} | ₹${p.price || 0} | stock ${p.stockQuantity}`
  );
  return {
    done: true,
    reply: `Product results:\n${lines.join("\n")}`,
    nextIntent: undefined,
    nextDraft: {},
  };
}

async function handleProductUpdate(
  merchant: { id: string; status: string },
  draft: Record<string, unknown>,
  options?: { skipConfirmation?: boolean }
) {
  if (merchant.status !== "approved") {
    return {
      done: true,
      reply:
        "Your merchant account is pending approval. Product update will be enabled once approved.",
      nextIntent: undefined,
      nextDraft: {},
    };
  }

  const productName = String(draft.productName || draft.name || "").trim();
  if (!productName) {
    return {
      done: false,
      reply: FIELD_PROMPTS.productName,
      nextIntent: "product_update" as WaIntent,
      nextDraft: draft,
    };
  }

  const product = await prisma.product.findFirst({
    where: {
      merchantId: merchant.id,
      name: { contains: productName, mode: "insensitive" },
    },
    orderBy: { updatedAt: "desc" },
  });
  if (!product) {
    return {
      done: true,
      reply: `No product found matching "${productName}".`,
      nextIntent: undefined,
      nextDraft: {},
    };
  }

  const nextPrice = safeNumber(draft.price);
  const nextStock = safeNumber(draft.stockQuantity);
  const nextCategory =
    typeof draft.category === "string" ? String(draft.category).trim() : "";
  const nextDescription =
    typeof draft.description === "string"
      ? String(draft.description).trim()
      : "";
  const nextBrand =
    typeof draft.brand === "string" ? String(draft.brand).trim() : "";
  const nextImageUrl =
    typeof draft.imageUrl === "string" ? String(draft.imageUrl).trim() : "";

  const hasAnyChange =
    nextPrice !== null ||
    nextStock !== null ||
    nextCategory.length > 0 ||
    nextDescription.length > 0 ||
    nextBrand.length > 0 ||
    nextImageUrl.length > 0;

  if (!hasAnyChange) {
    return {
      done: false,
      reply:
        "Please share what to update, for example: price 499, stock 12, category decor, or description.",
      nextIntent: "product_update" as WaIntent,
      nextDraft: draft,
    };
  }

  if (nextStock === 0 && !options?.skipConfirmation) {
    return {
      done: false,
      reply: `You are about to set stock of ${product.name} to 0 (unavailable). Reply YES to confirm or NO to cancel.`,
      nextIntent: "product_update" as WaIntent,
      nextDraft: draft,
      pendingConfirmation: {
        type: "stock_update_zero" as const,
        intent: "product_update" as WaIntent,
        draft,
      },
    };
  }

  const updated = await prisma.product.update({
    where: { id: product.id },
    data: {
      ...(nextPrice !== null && { price: nextPrice }),
      ...(nextStock !== null && {
        stockQuantity: Math.max(0, Math.floor(nextStock)),
        isAvailable: nextStock > 0,
      }),
      ...(nextCategory && { category: nextCategory }),
      ...(nextDescription && { description: nextDescription }),
      ...(nextBrand && { brand: nextBrand }),
      ...(nextImageUrl && { imageUrl: nextImageUrl }),
      updatedAt: new Date(),
    },
  });

  if (
    nextPrice !== null ||
    nextCategory.length > 0 ||
    nextDescription.length > 0 ||
    nextBrand.length > 0 ||
    nextImageUrl.length > 0
  ) {
    generateProductEmbedding(updated.id).catch(() => {});
  }

  return {
    done: true,
    reply: `Updated ${updated.name}. Current price: ₹${updated.price || 0}, stock: ${updated.stockQuantity}.`,
    nextIntent: undefined,
    nextDraft: {},
  };
}

function canMerchantManageOrder(
  merchantProductIds: Set<string>,
  merchantProductNames: Set<string>,
  orderProducts: unknown
) {
  const items = Array.isArray(orderProducts)
    ? (orderProducts as Array<{ productId?: string; name?: string }>)
    : [];
  return items.some((p) => {
    if (typeof p?.productId === "string" && merchantProductIds.has(p.productId)) {
      return true;
    }
    return typeof p?.name === "string" && merchantProductNames.has(p.name);
  });
}

async function handleOrderQueryActive(merchant: { id: string; status: string }) {
  if (merchant.status !== "approved") {
    return {
      done: true,
      reply:
        "Your merchant account is pending approval. Order query will be enabled once approved.",
      nextIntent: undefined,
      nextDraft: {},
    };
  }

  const merchantProducts = await prisma.product.findMany({
    where: { merchantId: merchant.id },
    select: { id: true, name: true },
  });
  const ids = new Set(merchantProducts.map((p) => p.id));
  const names = new Set(
    merchantProducts
      .map((p) => p.name)
      .filter((n): n is string => typeof n === "string" && n.length > 0)
  );

  const orders = await prisma.order.findMany({
    where: {
      status: { in: ["created", "paid", "Processing", "Shipped"] },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const filtered = orders.filter((o) =>
    canMerchantManageOrder(ids, names, o.products)
  );

  if (!filtered.length) {
    return {
      done: true,
      reply: "No active orders found for your catalog right now.",
      nextIntent: undefined,
      nextDraft: {},
    };
  }

  const lines = filtered
    .slice(0, 10)
    .map((o) => `• ${o.orderId} | ${o.status} | ₹${o.amount}`);
  return {
    done: true,
    reply: `Active orders:\n${lines.join("\n")}`,
    nextIntent: undefined,
    nextDraft: {},
  };
}

async function handleOrderUpdateStatus(
  merchant: { id: string; status: string },
  draft: Record<string, unknown>,
  options?: { skipConfirmation?: boolean }
) {
  if (merchant.status !== "approved") {
    return {
      done: true,
      reply:
        "Your merchant account is pending approval. Order updates will be enabled once approved.",
      nextIntent: undefined,
      nextDraft: {},
    };
  }

  const missing = missingRequired("order_update_status", draft);
  if (missing.length) {
    return {
      done: false,
      reply: FIELD_PROMPTS[missing[0]] || "Please share missing order details.",
      nextIntent: "order_update_status" as WaIntent,
      nextDraft: draft,
    };
  }

  const parsed = OrderUpdateSchema.safeParse(draft);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message || "Invalid order details.";
    return {
      done: false,
      reply: `I found an issue: ${issue}. Please share valid details.`,
      nextIntent: "order_update_status" as WaIntent,
      nextDraft: draft,
    };
  }

  const payload = parsed.data;
  const order = await prisma.order.findUnique({
    where: { orderId: payload.orderId },
  });
  if (!order) {
    return {
      done: true,
      reply: `Order not found: ${payload.orderId}`,
      nextIntent: undefined,
      nextDraft: {},
    };
  }

  const merchantProducts = await prisma.product.findMany({
    where: { merchantId: merchant.id },
    select: { id: true, name: true },
  });
  const ids = new Set(merchantProducts.map((p) => p.id));
  const names = new Set(
    merchantProducts
      .map((p) => p.name)
      .filter((n): n is string => typeof n === "string" && n.length > 0)
  );
  if (!canMerchantManageOrder(ids, names, order.products)) {
    return {
      done: true,
      reply: "You are not allowed to update this order.",
      nextIntent: undefined,
      nextDraft: {},
    };
  }

  if (!options?.skipConfirmation) {
    return {
      done: false,
      reply: `You are about to update order ${payload.orderId} to ${payload.status}. Reply YES to confirm or NO to cancel.`,
      nextIntent: "order_update_status" as WaIntent,
      nextDraft: draft,
      pendingConfirmation: {
        type: "order_status_update" as const,
        intent: "order_update_status" as WaIntent,
        draft,
      },
    };
  }

  const history = Array.isArray(order.statusHistory)
    ? (order.statusHistory as Array<Record<string, unknown>>)
    : [];
  const nextHistory = [
    ...history,
    {
      status: payload.status,
      by: "whatsapp_merchant",
      note: "Updated via WhatsApp",
      at: new Date().toISOString(),
    },
  ];

  await prisma.order.update({
    where: { orderId: payload.orderId },
    data: {
      status: payload.status,
      ...(payload.status === "Shipped" && { shippedAt: new Date() }),
      ...(payload.status === "Delivered" && { deliveredAt: new Date() }),
      statusHistory: nextHistory as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
  });

  return {
    done: true,
    reply: `Order ${payload.orderId} updated to ${payload.status}.`,
    nextIntent: undefined,
    nextDraft: {},
  };
}

export async function processMerchantWhatsAppMessage(input: {
  fromPhone: string;
  text: string;
  messageId?: string;
  mediaId?: string;
  mediaCaption?: string;
}) {
  const phone = normalizePhone(input.fromPhone) || input.fromPhone;
  const { data: session } = await getSession(phone);
  const processedMessageIds = Array.isArray(session.processedMessageIds)
    ? session.processedMessageIds
    : [];

  if (input.messageId && processedMessageIds.includes(input.messageId)) {
    return session.lastPrompt || "Already processed.";
  }

  const merchant = await getMerchantByPhone(phone);
  const inboundText = String(input.text || input.mediaCaption || "").trim();

  if (session.pendingConfirmation && inboundText) {
    if (isAffirmative(inboundText)) {
      let confirmationResult:
        | {
            done: boolean;
            reply: string;
            nextIntent: WaIntent | undefined;
            nextDraft: Record<string, unknown>;
          }
        | undefined;

      if (!merchant) {
        confirmationResult = {
          done: true,
          reply: "Merchant account not found. Please register first.",
          nextIntent: undefined,
          nextDraft: {},
        };
      } else if (session.pendingConfirmation.intent === "stock_update") {
        confirmationResult = await handleStockUpdate(
          merchant,
          session.pendingConfirmation.draft,
          { skipConfirmation: true }
        );
      } else if (session.pendingConfirmation.intent === "order_update_status") {
        confirmationResult = await handleOrderUpdateStatus(
          merchant,
          session.pendingConfirmation.draft,
          { skipConfirmation: true }
        );
      } else if (session.pendingConfirmation.intent === "product_update") {
        confirmationResult = await handleProductUpdate(
          merchant,
          session.pendingConfirmation.draft,
          { skipConfirmation: true }
        );
      }

      const finalResult = confirmationResult || {
        done: true,
        reply: "Nothing to confirm.",
        nextIntent: undefined,
        nextDraft: {},
      };

      await saveSession(phone, {
        activeIntent: finalResult.nextIntent,
        draft: finalResult.nextDraft,
        lastPrompt: finalResult.reply,
        processedMessageIds: input.messageId
          ? [...processedMessageIds, input.messageId].slice(-50)
          : processedMessageIds,
        pendingConfirmation: null,
      });
      return finalResult.reply;
    }

    if (isNegative(inboundText)) {
      const reply = "Update cancelled. No changes were made.";
      await saveSession(phone, {
        activeIntent: undefined,
        draft: {},
        lastPrompt: reply,
        processedMessageIds: input.messageId
          ? [...processedMessageIds, input.messageId].slice(-50)
          : processedMessageIds,
        pendingConfirmation: null,
      });
      return reply;
    }

    const reply =
      "Please reply YES to confirm or NO to cancel the pending update.";
    await saveSession(phone, {
      ...session,
      lastPrompt: reply,
      processedMessageIds: input.messageId
        ? [...processedMessageIds, input.messageId].slice(-50)
        : processedMessageIds,
    });
    return reply;
  }

  if (session.pendingConfirmation && !inboundText) {
    const reply =
      "Please reply YES to confirm or NO to cancel the pending update.";
    await saveSession(phone, {
      ...session,
      lastPrompt: reply,
      processedMessageIds: input.messageId
        ? [...processedMessageIds, input.messageId].slice(-50)
        : processedMessageIds,
    });
    return reply;
  }

  let mediaUrl = "";
  if (input.mediaId) {
    try {
      mediaUrl = await uploadWhatsAppMediaToBlob(input.mediaId);
    } catch {
      mediaUrl = "";
    }
  }

  const parsed = await inferIntent(inboundText, session.activeIntent);
  const intent: WaIntent =
    !merchant && parsed.intent !== "merchant_register"
      ? "merchant_register"
      : session.activeIntent && parsed.intent === "unknown"
      ? session.activeIntent
      : parsed.intent;

  const draft = {
    ...(session.draft || {}),
    ...(parsed.fields || {}),
    ...(mediaUrl ? { imageUrl: mediaUrl } : {}),
  };

  let result:
    | {
        done: boolean;
        reply: string;
        nextIntent: WaIntent | undefined;
        nextDraft: Record<string, unknown>;
        pendingConfirmation?: SessionData["pendingConfirmation"];
      }
    | undefined;

  if (intent === "help" || intent === "unknown") {
    result = {
      done: !mediaUrl,
      reply: mediaUrl
        ? `Image received and attached. ${merchant?.status === "approved" ? "Tell me product details like name/category/price/stock." : "Please continue with registration details."}`
        :
      "I can help with: merchant registration, product upload/update/query, stock update/query, active order query, and order status update.",
      nextIntent: mediaUrl
        ? merchant?.status === "approved"
          ? "product_upload"
          : "merchant_register"
        : undefined,
      nextDraft: mediaUrl ? draft : {},
    };
  } else if (intent === "merchant_register") {
    result = await handleRegister(phone, draft);
  } else if (!merchant) {
    result = {
      done: false,
      reply:
        "Please complete registration first. Share your business name to begin.",
      nextIntent: "merchant_register",
      nextDraft: draft,
    };
  } else if (intent === "product_upload") {
    result = await handleProductUpload(merchant, draft);
  } else if (intent === "product_update") {
    result = await handleProductUpdate(merchant, draft);
  } else if (intent === "product_query") {
    result = await handleProductQuery(merchant, draft);
  } else if (intent === "stock_update") {
    result = await handleStockUpdate(merchant, draft);
  } else if (intent === "stock_query") {
    result = await handleStockQuery(merchant, draft);
  } else if (intent === "order_query_active") {
    result = await handleOrderQueryActive(merchant);
  } else if (intent === "order_update_status") {
    result = await handleOrderUpdateStatus(merchant, draft);
  } else {
    result = {
      done: true,
      reply:
        "I could not map that request yet. Please try one of: register, upload product, query stock, update stock, query active orders.",
      nextIntent: undefined,
      nextDraft: {},
    };
  }

  await saveSession(phone, {
    activeIntent: result.nextIntent,
    draft: result.nextDraft,
    lastPrompt: result.reply,
    processedMessageIds: input.messageId
      ? [...processedMessageIds, input.messageId].slice(-50)
      : processedMessageIds,
    pendingConfirmation: result.pendingConfirmation || null,
  });

  return result.reply;
}
