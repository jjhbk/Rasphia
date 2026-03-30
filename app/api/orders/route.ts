import { NextRequest, NextResponse } from "next/server";
import { authGuard } from "@/app/lib/auth-guard";
import { prisma } from "@/app/lib/prisma";

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

    const normalized = orders.map((o) => ({
      ...o,
      id: o.orderId,
    }));

    return NextResponse.json(normalized, { status: 200 });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
