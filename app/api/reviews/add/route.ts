import { NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";

interface Review {
  authorEmail: string;
  authorName: string;
  rating: number;
  comment: string;
  date: Date;
}

export async function POST(req: Request) {
  try {
    const {
      orderId,
      productNames, // <-- now an array
      rating,
      comment,
      authorEmail,
      authorName,
    } = await req.json();

    if (!Array.isArray(productNames) || productNames.length === 0) {
      return NextResponse.json(
        { error: "productNames must be a non-empty array" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("rasphia");

    const productsCol = db.collection("products");
    const ordersCol = db.collection("orders");

    const newReview: Review = {
      authorEmail,
      authorName,
      rating,
      comment,
      date: new Date(),
    };

    // -----------------------------------
    // ✅ Add review to ALL products in the order
    // -----------------------------------
    await productsCol.updateMany(
      { name: { $in: productNames } },
      { $push: { reviews: newReview } as any }
    );

    // -----------------------------------
    // ✅ Mark the order as reviewed
    // -----------------------------------
    await ordersCol.updateOne(
      { id: orderId }, // <-- Fix this if your field is different
      { $set: { isReviewed: true } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error adding review:", error);
    return NextResponse.json(
      { error: "Failed to add review" },
      { status: 500 }
    );
  }
}
