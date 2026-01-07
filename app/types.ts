// src/types/chat.ts
import { ObjectId } from "mongodb";

export type Author = "user" | "ai";

export interface Message {
  author: Author;
  text: string;
  products?: any[]; // keep flexible for now (Product[])
  comparisonTable?: { headers: string[]; rows: string[][] };
  createdAt?: string; // ISO string
}

export interface ChatSession {
  _id?: ObjectId | string;
  userEmail: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

export interface Product {
  _id?: string;
  name: string;
  brand?: string;
  category: string;
  price?: number;
  description?: string;
  story?: string;
  imageUrl?: string;
  affiliateLink?: string;

  // Existing generic tags
  tags?: string[];
  occasion?: string[];
  recipient?: string;
  // 🧩 Unified personalization fields
  styleTags?: string[]; // e.g. "streetwear", "minimal"
  colorPalette?: string[]; // e.g. ["beige", "black"]
  materials?: string[]; // e.g. ["leather", "cotton"]

  // 🧠 Deep structured metadata for hyper-personalization
  attributes?: {
    // 🌸 SKINCARE
    skinType?: string[]; // oily, dry, sensitive
    concerns?: string[]; // acne, pigmentation
    comedogenicRating?: number; // 0–5
    actives?: string[]; // salicylic acid, niacinamide

    // 💇 HAIRCARE
    hairType?: string[]; // straight, wavy, curly, coily
    hairConcerns?: string[]; // frizz, dryness
    ingredients?: string[]; // keratin, argan oil

    // 🧍 BODY / WELLNESS
    physiqueGoals?: string[]; // fat loss, leaning, energy
    usageTime?: string; // daily, AM/PM, pre-workout

    // 👗 FASHION
    fit?: string[]; // relaxed, slim
    silhouette?: string[]; // drop-shoulder, cropped

    // 🏡 HOME DECOR
    aesthetic?: string[]; // minimal, modern
    room?: string[]; // bedroom, living room

    // 🎁 GIFTING
    occasion?: string[]; // birthday, anniversary
    recipient?: string; // him, her, unisex

    // 🌬 FRAGRANCES
    scentNotes?: string[]; // citrus, amber, spicy
    projection?: string; // soft / moderate / strong
    longevity?: string; // 4-6h, 8h+

    // 🧭 Generalized Use Cases (cross-category)
    useCases?: string[]; // travel-friendly, premium, office
  };

  // 🌟 Persona-driven scoring layer
  personaAlignment?: {
    skinScore?: number;
    hairScore?: number;
    styleScore?: number;
    homeScore?: number;
    fragranceScore?: number;
    lifestyleScore?: number;
    giftingScore?: number;
  };
  reviews?: {
    rating: number; // 1–5
    comment?: string; // optional text
    user?: string; // optional userId/email
    date?: string; // ISO string
  }[];
  // 🧮 Optional embedding for vector search
  embedding?: number[];
}

export type MessageAuthor = "user" | "ai";

export interface ComparisonTableData {
  headers: string[];
  rows: string[][];
}

/*export interface Message {
  author: MessageAuthor;
  text: string;
  products?: Product[];
  comparisonTable?: ComparisonTableData;
}
*/
export interface CheckoutCustomer {
  name: string;
  email: string;
  phone: string;
  address: string;
}

export type OrderStatus = "Processing" | "Shipped" | "Delivered" | "Paid";

export interface Review {
  authorName: string;
  rating: number; // 1-5
  comment: string;
  date: string;
}

export interface Order {
  id: string;
  customer: CheckoutCustomer;
  products: Product[];
  paymentId: string;
  date: string;
  status: OrderStatus;
  trackingNumber?: string;
  isReviewed?: boolean;
}

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  address: string;
  wishlist: Product[];
}

const BEST_PICK_SCHEMA = {
  name: "best_pick",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["bestProduct", "verdict", "confidence", "oneLineReason"],
    properties: {
      bestProduct: {
        type: "object",
        required: [
          "productId",
          "title",
          "image",
          "price",
          "productUrl",
          "domain",
        ],
        properties: {
          productId: { type: "string" },
          title: { type: "string" },
          image: { type: ["string", "null"] },
          price: { type: ["number", "null"] },
          productUrl: { type: "string" },
          domain: { type: "string" },
        },
      },

      verdict: {
        type: "string",
        enum: ["buy", "wait", "skip"],
      },

      confidence: {
        type: "number",
        minimum: 0,
        maximum: 1,
      },

      oneLineReason: {
        type: "string",
      },
    },
  },
};
