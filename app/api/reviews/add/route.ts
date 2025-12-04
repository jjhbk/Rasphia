import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import { authGuard } from "@/app/lib/auth-guard";

interface Review {
  authorEmail: string;
  authorName: string;
  rating: number;
  comment: string;
  date: Date;
}

export async function POST(req: NextRequest) {
  try {
    // 1️⃣ Authenticate user
    const { sessionEmail, body, errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;

    const {
      orderId,
      productNames,
      rating,
      comment,
      authorName, // allowed, but cannot override email
    } = body;

    if (!orderId) {
      return NextResponse.json({ error: "orderId required" }, { status: 400 });
    }

    if (!Array.isArray(productNames) || productNames.length === 0) {
      return NextResponse.json(
        { error: "productNames must be a non-empty array" },
        { status: 400 }
      );
    }

    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("rasphia");
    const productsCol = db.collection("products");
    const ordersCol = db.collection("orders");

    // 2️⃣ Fetch the order securely
    const order = await ordersCol.findOne({ order_id: orderId });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 3️⃣ Ensure user owns this order
    if (order.customer.email !== sessionEmail) {
      return NextResponse.json(
        { error: "Forbidden: You do not own this order." },
        { status: 403 }
      );
    }

    // 4️⃣ Ensure user is reviewing actual products purchased
    const purchasedNames = order.products.map((p: any) => p.name);

    for (const name of productNames) {
      if (!purchasedNames.includes(name)) {
        return NextResponse.json(
          {
            error: `Invalid review: Product '${name}' was not purchased in this order.`,
          },
          { status: 400 }
        );
      }
    }

    // 5️⃣ Prevent duplicate review submission
    if (order.isReviewed) {
      return NextResponse.json(
        { error: "Order already reviewed" },
        { status: 400 }
      );
    }

    // 6️⃣ Prepare secure review object
    const newReview: Review = {
      authorEmail: sessionEmail, // secure identity
      authorName: authorName ?? sessionEmail.split("@")[0],
      rating,
      comment,
      date: new Date(),
    };

    // 7️⃣ Add review to ALL purchased products being reviewed
    await productsCol.updateMany(
      { name: { $in: productNames } },
      { $push: { reviews: newReview as any } }
    );

    // 8️⃣ Mark order as reviewed
    await ordersCol.updateOne(
      { order_id: orderId },
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
