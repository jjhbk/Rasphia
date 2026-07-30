import { NextRequest, NextResponse } from "next/server";
import { authGuard } from "@/app/lib/auth-guard";
import { queryCustomerOrders } from "@/app/lib/customer-order-query";

function hasInternalOrdersQueryAccess(req: NextRequest) {
  const provided = String(req.headers.get("x-orders-query-secret") || "").trim();
  const expected = String(
    process.env.WHATSAPP_CHECKOUT_SECRET ||
      process.env.NEXTAUTH_SECRET ||
      process.env.AUTH_SECRET ||
      ""
  ).trim();
  return Boolean(provided && expected && provided === expected);
}

export async function POST(req: NextRequest) {
  try {
    const internalAccess = hasInternalOrdersQueryAccess(req);
    const { sessionEmail, body, errorResponse } = internalAccess
      ? { sessionEmail: null, body: await req.json().catch(() => null), errorResponse: null }
      : await authGuard(req);

    if (errorResponse) return errorResponse;

    const payload = (body || {}) as Record<string, unknown>;
    const requestedEmail = String(payload.customerEmail || "").trim().toLowerCase();
    const customerPhone = String(payload.customerPhone || "").trim();
    const customerName = String(payload.customerName || "").trim();
    const orderRef = String(payload.orderRef || "").trim();
    const merchantId = String(payload.merchantId || "").trim();
    const page = Number(payload.page || 1);
    const pageSize = Number(payload.pageSize || 10);
    const scope = String(payload.scope || "history").trim();
    const statuses = Array.isArray(payload.statuses)
      ? payload.statuses.map((value) => String(value || "").trim()).filter(Boolean)
      : null;

    if (!internalAccess && requestedEmail && requestedEmail !== sessionEmail) {
      return NextResponse.json(
        { error: "Forbidden: customer email mismatch" },
        { status: 403 }
      );
    }

    const effectiveEmail = internalAccess ? requestedEmail : sessionEmail;
    const result = await queryCustomerOrders({
      customerEmail: effectiveEmail,
      customerPhone,
      customerName,
      orderRef,
      merchantId,
      page,
      pageSize,
      statuses,
      scope:
        scope === "active" || scope === "history" || scope === "all"
          ? scope
          : "history",
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error querying customer orders:", error);
    return NextResponse.json(
      { error: "Failed to query customer orders" },
      { status: 500 }
    );
  }
}
