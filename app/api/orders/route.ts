import { NextRequest, NextResponse } from "next/server";
import { authGuard } from "@/app/lib/auth-guard";
import { prisma } from "@/app/lib/prisma";

function normalizeOrderIdentifiers<T extends { id: string; orderId: string; receipt: string | null }>(
  order: T
) {
  return {
    ...order,
    // Backward-compatible alias used across the current frontend.
    id: order.orderId,
    internalOrderId: order.id,
    providerOrderId: order.orderId,
    appOrderId: order.receipt,
  };
}

export async function GET(req: NextRequest) {
  try {
    // 1️⃣ Authenticate the user
    const { sessionEmail, errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;

    // 2️⃣ ALWAYS ignore `?email=` from the client (untrusted!)
    const email = sessionEmail;

    const orders = await prisma.order.findMany({
      where: {
        customer: {
          path: ["email"],
          equals: email,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const normalized = orders.map(normalizeOrderIdentifiers);

    return NextResponse.json(normalized, { status: 200 });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
