import OpenAI from "openai";
import { z } from "zod";
import { prisma } from "@/app/lib/prisma";
import { ensureUniqueMerchantSlug } from "@/app/lib/merchantSlug";
import { generateProductEmbedding } from "@/app/lib/generateEmbeddings";
import { embedQuery } from "@/app/lib/queryEmbeddings";
import { searchProductEmbeddings } from "@/app/lib/product-vector-store";
import { Prisma } from "@prisma/client";
import { uploadWhatsAppMediaToBlob } from "@/app/lib/whatsapp";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export const WA_INTENTS = [
  "user_register",
  "user_persona_update",
  "user_discover_products",
  "user_discover_merchants",
  "user_order_query",
  "user_wishlist_add",
  "user_wishlist_remove",
  "user_wishlist_view",
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

const UserRegistrationSchema = z.object({
  userName: z.string().min(2),
  userEmail: z.string().email(),
});

const UserPersonaSchema = z.object({
  personaText: z.string().min(3),
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
  pendingRoleSelection?: boolean;
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

type ConversationTurn = {
  role: "user" | "assistant";
  content: string;
};

const WHATSAPP_CONTEXT_WINDOW = Number(process.env.WHATSAPP_CONTEXT_WINDOW || 20);
const WHATSAPP_CONTEXT_KEEP = Number(process.env.WHATSAPP_CONTEXT_KEEP || 40);

const REQUIRED_BY_INTENT: Record<WaIntent, string[]> = {
  user_register: ["userName", "userEmail"],
  user_persona_update: ["personaText"],
  user_discover_products: [],
  user_discover_merchants: [],
  user_order_query: [],
  user_wishlist_add: ["productName"],
  user_wishlist_remove: ["productName"],
  user_wishlist_view: [],
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

const OPTIONAL_BY_INTENT: Partial<Record<WaIntent, string[]>> = {
  user_discover_products: ["query", "category", "maxPrice", "tag"],
  user_discover_merchants: ["query", "city"],
  user_order_query: ["orderId"],
  user_persona_update: ["personaTags"],
  product_upload: ["brand", "description", "imageUrl"],
  product_update: ["price", "stockQuantity", "category", "brand", "description", "imageUrl"],
  stock_query: ["productName"],
};

const FIELD_PROMPTS: Record<string, string> = {
  userName: "Please share your name.",
  userEmail: "Please share your email address.",
  personaText: "Please share your persona/preferences in one line.",
  personaTags: "Optionally share persona tags separated by commas.",
  query: "Please share what you want to discover.",
  maxPrice: "Optionally share a max price.",
  tag: "Optionally share a tag (for example: gift, decor, skincare).",
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

function prettyFieldName(field: string) {
  const labels: Record<string, string> = {
    userName: "Name",
    userEmail: "Email",
    personaText: "Persona Summary",
    personaTags: "Persona Tags",
    query: "Search Query",
    maxPrice: "Max Price",
    tag: "Tag",
    city: "City",
    businessName: "Business Name",
    addressLine1: "Address Line 1",
    addressLine2: "Address Line 2",
    zipCode: "ZIP Code",
    locationLink: "Location Link",
    productName: "Product Name",
    stockQuantity: "Stock Quantity",
    imageUrl: "Image URL",
    orderId: "Order ID",
  };
  return labels[field] || `${field.charAt(0).toUpperCase()}${field.slice(1)}`;
}

function buildIntentChecklist(intent: WaIntent, draft: Record<string, unknown>) {
  const required = REQUIRED_BY_INTENT[intent] || [];
  const optional = OPTIONAL_BY_INTENT[intent] || [];
  if (!required.length && !optional.length) return "";

  const mark = (field: string) => {
    const value = draft[field];
    const filled =
      value !== undefined &&
      value !== null &&
      (typeof value !== "string" || value.trim().length > 0);
    return filled ? "[x]" : "[ ]";
  };

  return [
    "",
    "Checklist:",
    ...required.map((field) => `- ${mark(field)} ${prettyFieldName(field)} (required)`),
    ...optional.map((field) => `- ${mark(field)} ${prettyFieldName(field)} (optional)`),
  ].join("\n");
}

function buildUnclearIntentTemplate(merchantStatus?: string) {
  const isApproved = merchantStatus === "approved";
  const merchantLine = isApproved
    ? "Merchant account detected and approved for this number."
    : "If this number is for a merchant, start with merchant registration first.";

  return [
    "I could not clearly identify your request. Use one of these templates:",
    "",
    "USER FLOW",
    "1) User registration: userName, userEmail",
    "Example: register userName=Rahul userEmail=rahul@example.com",
    "2) Persona create/update",
    "Example: update persona personaText=I like minimal decor under 1500",
    "3) Discover products",
    "Example: discover products query=gift for mom category=home maxPrice=2000",
    "4) Discover merchants",
    "Example: discover merchants city=Hyderabad query=wallpapers",
    "5) Query my orders",
    "Example: my orders",
    "Example: track order orderId=ORD123",
    "6) Wishlist",
    "Example: add wishlist productName=Guts Wallpaper",
    "Example: remove wishlist productName=Guts Wallpaper",
    "Example: view wishlist",
    "",
    "MERCHANT FLOW",
    `1) Merchant registration${isApproved ? " (already completed for this number)" : ""}`,
    "businessName, email, addressLine1, addressLine2, city, state, zipCode, locationLink",
    "Example: Register businessName=Acme Decor, email=a@b.com, addressLine1=..., addressLine2=..., city=Hyderabad, state=Telangana, zipCode=500001, locationLink=https://maps.google.com/...",
    "",
    "2) Product upload/update/query",
    "name, category, price, stockQuantity (+ optional brand, description, image)",
    "Example: Add product name=Canvas Lamp, category=home, price=1499, stockQuantity=20",
    "Example: Update productName=Canvas Lamp price=1299 stockQuantity=15",
    "Example: Query product Canvas Lamp",
    "",
    "4) Stock update/query",
    "Example: Stock update productName=Canvas Lamp stockQuantity=0",
    "Example: Stock query Canvas Lamp",
    "",
    "5) Orders",
    "Example: Active orders",
    "Example: Update order status orderId=ORD123 status=Shipped",
    "",
    "Notes:",
    "- I auto-detect whether this number is acting as a user or merchant from your message + registration state.",
    "- For sensitive actions (stock=0, order status change), I will ask YES/NO confirmation.",
    "- You can also send a product image; I will attach it to product upload/update draft.",
    "",
    merchantLine,
  ].join("\n");
}

function normalizePhone(input: string) {
  const digits = String(input || "").replace(/[^\d]/g, "");
  if (!digits) return "";
  return `+${digits}`;
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

  // India normalization support:
  // - incoming WA often sends 91xxxxxxxxxx
  // - existing DB may store +91xxxxxxxxxx, 91xxxxxxxxxx, or xxxxxxxxxx
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

function detectRoleChoice(text: string): "merchant" | "user" | null {
  const t = text.trim().toLowerCase();
  if (/\bmerchant\b/.test(t) || /\bseller\b/.test(t) || /\bvendor\b/.test(t)) {
    return "merchant";
  }
  if (/\buser\b/.test(t) || /\bcustomer\b/.test(t) || /\bbuyer\b/.test(t)) {
    return "user";
  }
  return null;
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
  const variants = phoneVariants(phone);
  return prisma.merchant.findFirst({
    where: {
      OR: variants.map((p) => ({ phone: p })),
    },
  });
}

async function getUserByPhone(phone: string) {
  const variants = phoneVariants(phone);
  return prisma.userProfile.findFirst({
    where: {
      OR: variants.map((p) => ({ phone: p })),
    },
  });
}

async function getSession(phone: string) {
  const normalized = normalizePhone(phone) || phone;
  const existing = await prisma.whatsappSession.upsert({
    where: { phone: normalized },
    create: {
      phone: normalized,
      data: {
        activeIntent: undefined,
        draft: {},
      } as Prisma.InputJsonValue,
    },
    update: {},
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

async function appendConversationMessage(
  sessionId: string,
  role: "user" | "assistant",
  content: string,
  options?: { intent?: WaIntent; messageId?: string }
) {
  const text = String(content || "").trim();
  if (!text) return;

  await prisma.whatsappChatMessage.create({
    data: {
      sessionId,
      role,
      content: text,
      intent: options?.intent,
      messageId: options?.messageId,
    },
  });
}

async function getConversationContext(sessionId: string) {
  const take = Math.max(1, Math.min(WHATSAPP_CONTEXT_WINDOW, 100));
  const rows = await prisma.whatsappChatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      role: true,
      content: true,
    },
  });

  return rows
    .reverse()
    .map((row) => ({
      role: row.role === "assistant" ? "assistant" : "user",
      content: row.content,
    })) as ConversationTurn[];
}

async function pruneConversation(sessionId: string) {
  const keep = Math.max(10, Math.min(WHATSAPP_CONTEXT_KEEP, 200));
  const staleRows = await prisma.whatsappChatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
    skip: keep,
    select: { id: true },
  });
  if (!staleRows.length) return;
  await prisma.whatsappChatMessage.deleteMany({
    where: {
      id: { in: staleRows.map((row) => row.id) },
    },
  });
}

function fallbackIntent(message: string): IntentParse {
  const text = message.toLowerCase();
  if (
    text.includes("user register") ||
    text.includes("register me") ||
    text.includes("signup")
  ) {
    return { intent: "user_register", fields: {} };
  }
  if (text.includes("persona")) {
    return { intent: "user_persona_update", fields: {} };
  }
  if (
    (text.includes("my order") || text.includes("track order") || text.includes("order status")) &&
    !text.includes("update")
  ) {
    return { intent: "user_order_query", fields: {} };
  }
  if (text.includes("wishlist") && (text.includes("view") || text.includes("show"))) {
    return { intent: "user_wishlist_view", fields: {} };
  }
  if (text.includes("wishlist") && (text.includes("remove") || text.includes("delete"))) {
    return { intent: "user_wishlist_remove", fields: {} };
  }
  if (text.includes("wishlist")) {
    return { intent: "user_wishlist_add", fields: {} };
  }
  if (text.includes("discover merchant") || text.includes("find merchant")) {
    return { intent: "user_discover_merchants", fields: {} };
  }
  if (text.includes("discover") || text.includes("find product") || text.includes("recommend")) {
    return { intent: "user_discover_products", fields: {} };
  }
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

async function inferIntent(
  message: string,
  activeIntent?: WaIntent,
  history: ConversationTurn[] = []
): Promise<IntentParse> {
  if (!openai) return fallbackIntent(message);

  const fieldKeys = [
    "userName",
    "userEmail",
    "personaText",
    "personaTags",
    "query",
    "maxPrice",
    "tag",
    "businessName",
    "email",
    "addressLine1",
    "addressLine2",
    "city",
    "state",
    "zipCode",
    "locationLink",
    "name",
    "productName",
    "category",
    "brand",
    "description",
    "price",
    "stockQuantity",
    "orderId",
    "status",
  ] as const;

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
          userName: { type: ["string", "null"] },
          userEmail: { type: ["string", "null"] },
          personaText: { type: ["string", "null"] },
          personaTags: { type: ["string", "null"] },
          query: { type: ["string", "null"] },
          maxPrice: { type: ["number", "null"] },
          tag: { type: ["string", "null"] },
          businessName: { type: ["string", "null"] },
          email: { type: ["string", "null"] },
          addressLine1: { type: ["string", "null"] },
          addressLine2: { type: ["string", "null"] },
          city: { type: ["string", "null"] },
          state: { type: ["string", "null"] },
          zipCode: { type: ["string", "null"] },
          locationLink: { type: ["string", "null"] },
          name: { type: ["string", "null"] },
          productName: { type: ["string", "null"] },
          category: { type: ["string", "null"] },
          brand: { type: ["string", "null"] },
          description: { type: ["string", "null"] },
          price: { type: ["number", "null"] },
          stockQuantity: { type: ["number", "null"] },
          orderId: { type: ["string", "null"] },
          status: { type: ["string", "null"] },
        },
        required: fieldKeys,
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
        content: `You are an intent parser for Rasphia WhatsApp automation (user + merchant flows).
Pick one intent from the enum.
Extract only explicit fields from user message.
If continuation message likely belongs to prior intent (${activeIntent || "none"}), keep same intent unless user clearly switched.`,
      },
      ...history.map((turn) => ({
        role: turn.role,
        content: turn.content,
      })),
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
    fields: Object.fromEntries(
      Object.entries(parsed.fields || {}).filter(
        ([, value]) => value !== null && value !== undefined
      )
    ),
  };
}

function parseStringArray(input: unknown) {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

async function handleUserRegister(phone: string, draft: Record<string, unknown>) {
  const missing = missingRequired("user_register", draft);
  if (missing.length) {
    const checklist = buildIntentChecklist("user_register", draft);
    return {
      done: false,
      reply: `${FIELD_PROMPTS[missing[0]] || "Please share missing user details."}${checklist}`,
      nextIntent: "user_register" as WaIntent,
      nextDraft: draft,
    };
  }

  const parsed = UserRegistrationSchema.safeParse(draft);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message || "Invalid user registration details.";
    const checklist = buildIntentChecklist("user_register", draft);
    return {
      done: false,
      reply: `I found an issue: ${issue}. Please share valid details.${checklist}`,
      nextIntent: "user_register" as WaIntent,
      nextDraft: draft,
    };
  }

  const payload = parsed.data;
  const email = payload.userEmail.toLowerCase();

  await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: payload.userName,
      phone,
      address: "",
      metadata: Prisma.JsonNull,
    },
    update: {
      name: payload.userName,
      phone,
      updatedAt: new Date(),
    },
  });

  await prisma.userProfile.upsert({
    where: { email },
    create: {
      email,
      name: payload.userName,
      phone,
      address: "",
      role: "user",
      credits: 0,
      wishlist: [],
    },
    update: {
      name: payload.userName,
      phone,
      role: "user",
      updatedAt: new Date(),
    },
  });

  return {
    done: true,
    reply: `User registration complete for ${payload.userName}. You can now discover products, merchants, update persona, and manage wishlist.`,
    nextIntent: undefined,
    nextDraft: {},
  };
}

async function handleUserPersonaUpdate(
  user: { email: string },
  draft: Record<string, unknown>
) {
  const missing = missingRequired("user_persona_update", draft);
  if (missing.length) {
    const checklist = buildIntentChecklist("user_persona_update", draft);
    return {
      done: false,
      reply: `${FIELD_PROMPTS[missing[0]] || "Please share missing persona details."}${checklist}`,
      nextIntent: "user_persona_update" as WaIntent,
      nextDraft: draft,
    };
  }

  const parsed = UserPersonaSchema.safeParse(draft);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message || "Invalid persona details.";
    const checklist = buildIntentChecklist("user_persona_update", draft);
    return {
      done: false,
      reply: `I found an issue: ${issue}. Please share valid persona details.${checklist}`,
      nextIntent: "user_persona_update" as WaIntent,
      nextDraft: draft,
    };
  }

  const existing = await prisma.userPersona.findUnique({
    where: { email: user.email },
  });
  const current =
    existing && typeof existing.data === "object" && existing.data
      ? (existing.data as Record<string, unknown>)
      : {};

  const tags = parseStringArray(
    typeof draft.personaTags === "string"
      ? String(draft.personaTags).split(",")
      : draft.personaTags
  );

  const nextData = {
    ...current,
    whatsappPersona: {
      summary: parsed.data.personaText,
      tags,
      updatedAt: new Date().toISOString(),
    },
  };

  await prisma.userPersona.upsert({
    where: { email: user.email },
    create: {
      email: user.email,
      data: nextData as Prisma.InputJsonValue,
    },
    update: {
      data: nextData as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
  });

  return {
    done: true,
    reply: "Persona updated successfully. I will use this context in future product conversations.",
    nextIntent: undefined,
    nextDraft: {},
  };
}

async function handleUserDiscoverProducts(draft: Record<string, unknown>) {
  const query = String(draft.query || draft.productName || draft.name || "").trim();
  const category = String(draft.category || "").trim();
  const maxPrice = safeNumber(draft.maxPrice);
  const tag = String(draft.tag || "").trim().toLowerCase();

  if (!query) {
    const checklist = buildIntentChecklist("user_discover_products", draft);
    return {
      done: false,
      reply: `Please share what you want to discover (for example: \"gift for mom under 1500\").${checklist}`,
      nextIntent: "user_discover_products" as WaIntent,
      nextDraft: draft,
    };
  }

  // Reuse the same curation pipeline foundation as /api/curate:
  // query embedding -> vector retrieval -> filtered product projection.
  const queryEmbedding = await embedQuery(query);
  const vectorHits = await searchProductEmbeddings(queryEmbedding, 20);
  const rankedIds = vectorHits.map((hit) => hit._id);

  if (!rankedIds.length) {
    return {
      done: true,
      reply: "I could not find matching products from the curated catalog. Try rephrasing your need.",
      nextIntent: undefined,
      nextDraft: {},
    };
  }

  const products = await prisma.product.findMany({
    where: {
      id: { in: rankedIds },
      isAvailable: true,
      ...(category ? { category: { contains: category, mode: "insensitive" } } : {}),
      ...(maxPrice !== null ? { price: { lte: maxPrice } } : {}),
    },
  });

  const byId = new Map(products.map((product) => [product.id, product] as const));
  const rankedProducts = rankedIds
    .map((id) => byId.get(id))
    .filter((product): product is (typeof products)[number] => Boolean(product));

  const filtered = tag
    ? rankedProducts.filter((p) =>
        parseStringArray(p.tags).map((t) => t.toLowerCase()).includes(tag)
      )
    : rankedProducts;

  if (!filtered.length) {
    return {
      done: true,
      reply: "I found related products but none matched your filters. Try broader category/tag or a higher max price.",
      nextIntent: undefined,
      nextDraft: {},
    };
  }

  const lines = filtered
    .slice(0, 6)
    .map((p) => `• ${p.name} | ₹${p.price || 0} | ${p.category || "General"} | stock ${p.stockQuantity}`);
  return {
    done: true,
    reply: `Top product matches:\n${lines.join("\n")}`,
    nextIntent: undefined,
    nextDraft: {},
  };
}

async function handleUserDiscoverMerchants(draft: Record<string, unknown>) {
  const query = String(draft.query || "").trim();
  const city = String(draft.city || "").trim();

  const merchants = await prisma.merchant.findMany({
    where: {
      status: "approved",
      ...(city ? { city: { contains: city, mode: "insensitive" } } : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { storefrontDescription: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 8,
  });

  if (!merchants.length) {
    return {
      done: true,
      reply: "No approved merchants found for that query yet.",
      nextIntent: undefined,
      nextDraft: {},
    };
  }

  const lines = merchants
    .slice(0, 6)
    .map((m) => `• ${m.name} (${m.city}, ${m.state}) | /storefronts/${m.slug}`);
  return {
    done: true,
    reply: `Merchant results:\n${lines.join("\n")}`,
    nextIntent: undefined,
    nextDraft: {},
  };
}

async function handleUserWishlistAdd(
  user: { email: string; wishlist: Prisma.JsonValue | null },
  draft: Record<string, unknown>
) {
  const missing = missingRequired("user_wishlist_add", draft);
  if (missing.length) {
    const checklist = buildIntentChecklist("user_wishlist_add", draft);
    return {
      done: false,
      reply: `${FIELD_PROMPTS[missing[0]] || "Please share the product name to add."}${checklist}`,
      nextIntent: "user_wishlist_add" as WaIntent,
      nextDraft: draft,
    };
  }

  const productName = String(draft.productName || draft.name || "").trim();
  const product = await prisma.product.findFirst({
    where: {
      name: { contains: productName, mode: "insensitive" },
      isAvailable: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  if (!product) {
    return {
      done: true,
      reply: `No available product found matching "${productName}".`,
      nextIntent: undefined,
      nextDraft: {},
    };
  }

  const existing = Array.isArray(user.wishlist)
    ? (user.wishlist as Array<Record<string, unknown>>)
    : [];
  const hasAlready = existing.some((item) => item?.id === product.id);
  const nextWishlist = hasAlready
    ? existing
    : [
        ...existing,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          imageUrl: product.imageUrl || "",
          merchantId: product.merchantId || null,
        },
      ];

  await prisma.userProfile.update({
    where: { email: user.email },
    data: {
      wishlist: nextWishlist as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
  });

  return {
    done: true,
    reply: hasAlready
      ? `${product.name} is already in your wishlist.`
      : `${product.name} added to your wishlist.`,
    nextIntent: undefined,
    nextDraft: {},
  };
}

async function handleUserWishlistView(user: {
  wishlist: Prisma.JsonValue | null;
}) {
  const items = Array.isArray(user.wishlist)
    ? (user.wishlist as Array<Record<string, unknown>>)
    : [];
  if (!items.length) {
    return {
      done: true,
      reply: "Your wishlist is empty.",
      nextIntent: undefined,
      nextDraft: {},
    };
  }

  const lines = items.slice(0, 15).map((item) => {
    const name = String(item.name || "Unknown");
    const price = Number(item.price || 0);
    return `• ${name}${price > 0 ? ` | ₹${price}` : ""}`;
  });

  return {
    done: true,
    reply: `Your wishlist:\n${lines.join("\n")}`,
    nextIntent: undefined,
    nextDraft: {},
  };
}

async function handleUserWishlistRemove(
  user: { email: string; wishlist: Prisma.JsonValue | null },
  draft: Record<string, unknown>
) {
  const missing = missingRequired("user_wishlist_remove", draft);
  if (missing.length) {
    const checklist = buildIntentChecklist("user_wishlist_remove", draft);
    return {
      done: false,
      reply: `${FIELD_PROMPTS[missing[0]] || "Please share the product name to remove."}${checklist}`,
      nextIntent: "user_wishlist_remove" as WaIntent,
      nextDraft: draft,
    };
  }

  const productName = String(draft.productName || draft.name || "").trim().toLowerCase();
  const existing = Array.isArray(user.wishlist)
    ? (user.wishlist as Array<Record<string, unknown>>)
    : [];

  const nextWishlist = existing.filter((item) => {
    const itemName = String(item.name || "").trim().toLowerCase();
    return !itemName.includes(productName);
  });

  if (nextWishlist.length === existing.length) {
    return {
      done: true,
      reply: `I could not find "${String(draft.productName || draft.name || "").trim()}" in your wishlist.`,
      nextIntent: undefined,
      nextDraft: {},
    };
  }

  await prisma.userProfile.update({
    where: { email: user.email },
    data: {
      wishlist: nextWishlist as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
  });

  return {
    done: true,
    reply: "Wishlist updated. Item removed successfully.",
    nextIntent: undefined,
    nextDraft: {},
  };
}

function customerEmailFromOrderCustomer(customer: Prisma.JsonValue) {
  if (!customer || typeof customer !== "object" || Array.isArray(customer)) {
    return "";
  }
  const obj = customer as Record<string, unknown>;
  return String(obj.email || "").trim().toLowerCase();
}

async function handleUserOrderQuery(
  user: { email: string },
  draft: Record<string, unknown>
) {
  const inputOrderId = String(draft.orderId || "").trim().toLowerCase();
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 150,
  });

  const userOrders = orders.filter((order) => {
    const email = customerEmailFromOrderCustomer(order.customer);
    if (email !== user.email.toLowerCase()) return false;
    if (!inputOrderId) return true;
    return String(order.orderId || "").toLowerCase().includes(inputOrderId);
  });

  if (!userOrders.length) {
    return {
      done: true,
      reply: inputOrderId
        ? `No orders found for order ID "${draft.orderId}".`
        : "No orders found for your account yet.",
      nextIntent: undefined,
      nextDraft: {},
    };
  }

  const lines = userOrders.slice(0, 10).map((order) => {
    const tracking = order.trackingNumber ? ` | tracking ${order.trackingNumber}` : "";
    return `• ${order.orderId} | ${order.status} | ₹${order.amount}${tracking}`;
  });

  return {
    done: true,
    reply: `Your orders:\n${lines.join("\n")}`,
    nextIntent: undefined,
    nextDraft: {},
  };
}

async function handleRegister(phone: string, draft: Record<string, unknown>) {
  const missing = missingRequired("merchant_register", draft);
  if (missing.length) {
    const checklist = buildIntentChecklist("merchant_register", draft);
    return {
      done: false,
      reply: `${FIELD_PROMPTS[missing[0]] || "Please share the missing details."}${checklist}`,
      nextIntent: "merchant_register" as WaIntent,
      nextDraft: draft,
    };
  }

  const parsed = MerchantRegistrationSchema.safeParse(draft);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message || "Invalid registration details.";
    const checklist = buildIntentChecklist("merchant_register", draft);
    return {
      done: false,
      reply: `I found an issue: ${issue}. Please share valid details.${checklist}`,
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
    const checklist = buildIntentChecklist("product_upload", draft);
    return {
      done: false,
      reply: `${FIELD_PROMPTS[missing[0]] || "Please share missing product details."}${checklist}`,
      nextIntent: "product_upload" as WaIntent,
      nextDraft: draft,
    };
  }

  const parsed = ProductUploadSchema.safeParse(draft);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message || "Invalid product details.";
    const checklist = buildIntentChecklist("product_upload", draft);
    return {
      done: false,
      reply: `I found an issue: ${issue}. Please share valid details.${checklist}`,
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
    const checklist = buildIntentChecklist("stock_update", draft);
    return {
      done: false,
      reply: `${FIELD_PROMPTS[missing[0]] || "Please share missing stock details."}${checklist}`,
      nextIntent: "stock_update" as WaIntent,
      nextDraft: draft,
    };
  }

  const parsed = StockUpdateSchema.safeParse(draft);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message || "Invalid stock details.";
    const checklist = buildIntentChecklist("stock_update", draft);
    return {
      done: false,
      reply: `I found an issue: ${issue}. Please share valid details.${checklist}`,
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
    const checklist = buildIntentChecklist("product_update", draft);
    return {
      done: false,
      reply: `${FIELD_PROMPTS.productName}${checklist}`,
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
    const checklist = buildIntentChecklist("product_update", draft);
    return {
      done: false,
      reply:
        `Please share what to update, for example: price 499, stock 12, category decor, or description.${checklist}`,
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
    const checklist = buildIntentChecklist("order_update_status", draft);
    return {
      done: false,
      reply: `${FIELD_PROMPTS[missing[0]] || "Please share missing order details."}${checklist}`,
      nextIntent: "order_update_status" as WaIntent,
      nextDraft: draft,
    };
  }

  const parsed = OrderUpdateSchema.safeParse(draft);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message || "Invalid order details.";
    const checklist = buildIntentChecklist("order_update_status", draft);
    return {
      done: false,
      reply: `I found an issue: ${issue}. Please share valid details.${checklist}`,
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
  const { data: session, record: sessionRecord } = await getSession(phone);
  const sessionId = sessionRecord.id;
  const processedMessageIds = Array.isArray(session.processedMessageIds)
    ? session.processedMessageIds
    : [];

  if (input.messageId && processedMessageIds.includes(input.messageId)) {
    return session.lastPrompt || "Already processed.";
  }

  const merchant = await getMerchantByPhone(phone);
  const userProfile = await getUserByPhone(phone);
  const inboundText = String(input.text || input.mediaCaption || "").trim();
  const inboundContextText =
    inboundText || (input.mediaId ? "Image uploaded for product workflow" : "");

  if (inboundContextText) {
    await appendConversationMessage(sessionId, "user", inboundContextText, {
      messageId: input.messageId,
      intent: session.activeIntent,
    });
  }

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
        pendingRoleSelection: false,
      });
      await appendConversationMessage(
        sessionId,
        "assistant",
        finalResult.reply,
        { intent: finalResult.nextIntent }
      );
      await pruneConversation(sessionId);
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
        pendingRoleSelection: false,
      });
      await appendConversationMessage(sessionId, "assistant", reply);
      await pruneConversation(sessionId);
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
    await appendConversationMessage(sessionId, "assistant", reply, {
      intent: session.activeIntent,
    });
    await pruneConversation(sessionId);
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
    await appendConversationMessage(sessionId, "assistant", reply, {
      intent: session.activeIntent,
    });
    await pruneConversation(sessionId);
    return reply;
  }

  if (session.pendingRoleSelection) {
    const chosenRole = detectRoleChoice(inboundText);
    if (!chosenRole) {
      const reply =
        "Please confirm your role by replying with one word: USER or MERCHANT.";
      await saveSession(phone, {
        ...session,
        lastPrompt: reply,
        processedMessageIds: input.messageId
          ? [...processedMessageIds, input.messageId].slice(-50)
          : processedMessageIds,
        pendingRoleSelection: true,
      });
      await appendConversationMessage(sessionId, "assistant", reply);
      await pruneConversation(sessionId);
      return reply;
    }

    const nextIntent: WaIntent =
      chosenRole === "merchant"
        ? merchant
          ? "product_query"
          : "merchant_register"
        : userProfile
        ? "user_discover_products"
        : "user_register";
    const reply =
      chosenRole === "merchant"
        ? merchant
          ? "Great, I will continue in merchant mode. Tell me what product/stock/order action you want."
          : "Great, merchant mode selected. Please share businessName and email to start merchant registration."
        : userProfile
        ? "Great, I will continue in user mode. Tell me what you want to discover."
        : "Great, user mode selected. Please share userName and userEmail to register.";

    await saveSession(phone, {
      ...session,
      activeIntent: nextIntent,
      lastPrompt: reply,
      processedMessageIds: input.messageId
        ? [...processedMessageIds, input.messageId].slice(-50)
        : processedMessageIds,
      pendingRoleSelection: false,
    });
    await appendConversationMessage(sessionId, "assistant", reply, {
      intent: nextIntent,
    });
    await pruneConversation(sessionId);
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

  const history = await getConversationContext(sessionId);
  const historyForIntent =
    history.length &&
    history[history.length - 1]?.role === "user" &&
    history[history.length - 1]?.content === inboundContextText
      ? history.slice(0, -1)
      : history;
  const parsed = await inferIntent(
    inboundContextText,
    session.activeIntent,
    historyForIntent
  );
  const merchantIntents = new Set<WaIntent>([
    "merchant_register",
    "product_upload",
    "product_update",
    "product_query",
    "stock_update",
    "stock_query",
    "order_query_active",
    "order_update_status",
  ]);
  const userIntents = new Set<WaIntent>([
    "user_register",
    "user_persona_update",
    "user_discover_products",
    "user_discover_merchants",
    "user_order_query",
    "user_wishlist_add",
    "user_wishlist_remove",
    "user_wishlist_view",
  ]);

  const lowerInbound = inboundContextText.toLowerCase();
  const asksMerchantRole =
    /\bmerchant\b/.test(lowerInbound) ||
    /\bstock\b/.test(lowerInbound) ||
    /\border\s+update\b/.test(lowerInbound) ||
    /\bactive orders\b/.test(lowerInbound) ||
    /\bupload\b/.test(lowerInbound);
  const asksUserRole =
    /\buser\b/.test(lowerInbound) ||
    /\bwishlist\b/.test(lowerInbound) ||
    /\bpersona\b/.test(lowerInbound) ||
    /\bdiscover\b/.test(lowerInbound) ||
    /\bmy order\b/.test(lowerInbound) ||
    /\btrack order\b/.test(lowerInbound);

  let intent: WaIntent =
    session.activeIntent && parsed.intent === "unknown"
      ? session.activeIntent
      : parsed.intent;

  if (!merchant && merchantIntents.has(intent) && intent !== "merchant_register") {
    intent = userProfile ? "user_discover_products" : "user_register";
  }
  if (!userProfile && userIntents.has(intent) && intent !== "user_register") {
    intent = "user_register";
  }
  if (intent === "unknown") {
    if (asksMerchantRole && !asksUserRole) {
      intent = merchant ? "product_query" : "merchant_register";
    } else if (asksUserRole || userProfile) {
      intent = userProfile ? "user_discover_products" : "user_register";
    }
  }

  const draft = {
    ...(session.draft || {}),
    ...(parsed.fields || {}),
    ...(mediaUrl ? { imageUrl: mediaUrl } : {}),
  };

  if (
    !merchant &&
    !userProfile &&
    (intent === "help" || intent === "unknown") &&
    !asksMerchantRole &&
    !asksUserRole
  ) {
    const reply =
      "Before I continue, please confirm your role: are you a Rasphia USER or a Rasphia MERCHANT?";
    await saveSession(phone, {
      ...session,
      lastPrompt: reply,
      processedMessageIds: input.messageId
        ? [...processedMessageIds, input.messageId].slice(-50)
        : processedMessageIds,
      pendingRoleSelection: true,
      draft,
    });
    await appendConversationMessage(sessionId, "assistant", reply);
    await pruneConversation(sessionId);
    return reply;
  }

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
        : buildUnclearIntentTemplate(merchant?.status),
      nextIntent: mediaUrl
        ? merchant?.status === "approved"
          ? "product_upload"
          : merchant
          ? "merchant_register"
          : "user_register"
        : undefined,
      nextDraft: mediaUrl ? draft : {},
    };
  } else if (intent === "user_register") {
    result = await handleUserRegister(phone, draft);
  } else if (intent === "user_persona_update") {
    if (!userProfile) {
      result = {
        done: false,
        reply: "Please register as user first. Share: userName and userEmail.",
        nextIntent: "user_register",
        nextDraft: draft,
      };
    } else {
      result = await handleUserPersonaUpdate({ email: userProfile.email }, draft);
    }
  } else if (intent === "user_discover_products") {
    result = await handleUserDiscoverProducts(draft);
  } else if (intent === "user_discover_merchants") {
    result = await handleUserDiscoverMerchants(draft);
  } else if (intent === "user_order_query") {
    if (!userProfile) {
      result = {
        done: false,
        reply: "Please register as user first. Share: userName and userEmail.",
        nextIntent: "user_register",
        nextDraft: draft,
      };
    } else {
      result = await handleUserOrderQuery({ email: userProfile.email }, draft);
    }
  } else if (intent === "user_wishlist_add") {
    if (!userProfile) {
      result = {
        done: false,
        reply: "Please register as user first. Share: userName and userEmail.",
        nextIntent: "user_register",
        nextDraft: draft,
      };
    } else {
      result = await handleUserWishlistAdd(
        { email: userProfile.email, wishlist: userProfile.wishlist || null },
        draft
      );
    }
  } else if (intent === "user_wishlist_remove") {
    if (!userProfile) {
      result = {
        done: false,
        reply: "Please register as user first. Share: userName and userEmail.",
        nextIntent: "user_register",
        nextDraft: draft,
      };
    } else {
      result = await handleUserWishlistRemove(
        { email: userProfile.email, wishlist: userProfile.wishlist || null },
        draft
      );
    }
  } else if (intent === "user_wishlist_view") {
    if (!userProfile) {
      result = {
        done: false,
        reply: "Please register as user first. Share: userName and userEmail.",
        nextIntent: "user_register",
        nextDraft: draft,
      };
    } else {
      result = await handleUserWishlistView({
        wishlist: userProfile.wishlist || null,
      });
    }
  } else if (intent === "merchant_register") {
    result = await handleRegister(phone, draft);
  } else if (intent === "product_upload") {
    if (!merchant) {
      result = {
        done: false,
        reply: "Merchant profile not found for this number. Share businessName and email to register merchant.",
        nextIntent: "merchant_register",
        nextDraft: draft,
      };
    } else {
    result = await handleProductUpload(merchant, draft);
    }
  } else if (intent === "product_update") {
    if (!merchant) {
      result = {
        done: false,
        reply: "Merchant profile not found for this number. Share businessName and email to register merchant.",
        nextIntent: "merchant_register",
        nextDraft: draft,
      };
    } else {
      result = await handleProductUpdate(merchant, draft);
    }
  } else if (intent === "product_query") {
    if (!merchant) {
      result = await handleUserDiscoverProducts(draft);
    } else {
      result = await handleProductQuery(merchant, draft);
    }
  } else if (intent === "stock_update") {
    if (!merchant) {
      result = {
        done: false,
        reply: "Stock updates are merchant-only. Register merchant first with businessName and email.",
        nextIntent: "merchant_register",
        nextDraft: draft,
      };
    } else {
      result = await handleStockUpdate(merchant, draft);
    }
  } else if (intent === "stock_query") {
    if (!merchant) {
      result = await handleUserDiscoverProducts(draft);
    } else {
      result = await handleStockQuery(merchant, draft);
    }
  } else if (intent === "order_query_active") {
    if (!merchant) {
      result = {
        done: false,
        reply: "Active order query is merchant-only in WhatsApp currently.",
        nextIntent: undefined,
        nextDraft: {},
      };
    } else {
      result = await handleOrderQueryActive(merchant);
    }
  } else if (intent === "order_update_status") {
    if (!merchant) {
      result = {
        done: false,
        reply: "Order status update is merchant-only. Register merchant first.",
        nextIntent: "merchant_register",
        nextDraft: draft,
      };
    } else {
      result = await handleOrderUpdateStatus(merchant, draft);
    }
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
    pendingRoleSelection: false,
  });
  await appendConversationMessage(sessionId, "assistant", result.reply, {
    intent: result.nextIntent,
  });
  await pruneConversation(sessionId);

  return result.reply;
}
