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
  name: string;
  category: "Perfume" | "Gift";
  brand: string;
  tags: string[];
  occasion: string[];
  recipient: "Him" | "Her" | "Them" | "Anyone";
  price: number;
  story: string;
  imageUrl: string;
  affiliateLink: string;
  reviews: Review[];
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
