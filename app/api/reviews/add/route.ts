import { NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";

interface Review {
  authorEmail: string;
  authorName: string;
  rating: number;
  comment: string;
  date: Date;
}

interface Product {
  name: string;
  brand?: string;
  price: number;
  imageUrl?: string;
  reviews?: Review[];
  createdAt?: Date;
  updatedAt?: Date;
}

export async function POST(req: Request) {
  try {
    const { orderId, productName, rating, comment, authorEmail, authorName } =
      await req.json();

    const client = await clientPromise;
    const db = client.db("rasphia");

    const products = db.collection<Product>("products");

    // ✅ Add new review
    await products.updateOne(
      { name: productName },
      {
        $push: {
          reviews: {
            authorEmail,
            authorName,
            rating,
            comment,
            date: new Date(),
          },
        },
      }
    );

    // ✅ Mark order as reviewed
    await db
      .collection("orders")
      .updateOne({ order_id: orderId }, { $set: { isReviewed: true } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error adding review:", error);
    return NextResponse.json(
      { error: "Failed to add review" },
      { status: 500 }
    );
  }
}
