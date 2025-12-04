import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import { authGuard } from "@/app/lib/auth-guard";

export async function GET(req: NextRequest) {
  try {
    // 1️⃣ Authenticate the user
    const { sessionEmail, errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;

    // 2️⃣ ALWAYS ignore `?email=` from the client (untrusted!)
    const email = sessionEmail;

    const client = await clientPromise;
    const db = client.db("rasphia");

    // 3️⃣ Fetch orders ONLY belonging to the authenticated user
    const orders = await db
      .collection("orders")
      .find({ "customer.email": email })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(orders, { status: 200 });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
