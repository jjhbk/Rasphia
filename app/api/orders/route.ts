import { NextRequest, NextResponse } from "next/server";
import { authGuard } from "@/app/lib/auth-guard";
import { queryCustomerOrders } from "@/app/lib/customer-order-query";

export async function GET(req: NextRequest) {
  try {
    // 1️⃣ Authenticate the user
    const { sessionEmail, errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;

    // 2️⃣ ALWAYS ignore `?email=` from the client (untrusted!)
    const email = sessionEmail;
    const result = await queryCustomerOrders({
      customerEmail: email,
      scope: "all",
      page: 1,
      pageSize: 200,
    });

    return NextResponse.json(result.items, { status: 200 });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
