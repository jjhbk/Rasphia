import { NextRequest, NextResponse } from "next/server";
import { authGuard } from "@/app/lib/auth-guard";
import { queryCustomerOrders } from "@/app/lib/customer-order-query";

export async function GET(req: NextRequest) {
  try {
    const { sessionEmail, errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;

    const searchParams = req.nextUrl.searchParams;
    const page = Number(searchParams.get("page") || "1");
    const pageSize = Number(searchParams.get("pageSize") || "10");
    const scope = searchParams.get("scope");
    const orderRef = searchParams.get("orderRef");
    const merchantId = searchParams.get("merchantId");

    const result = await queryCustomerOrders({
      customerEmail: sessionEmail,
      orderRef,
      merchantId,
      page,
      pageSize,
      scope:
        scope === "active" || scope === "history" || scope === "all"
          ? scope
          : "history",
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error fetching paginated orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch paginated orders" },
      { status: 500 }
    );
  }
}
