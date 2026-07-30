import { NextRequest, NextResponse } from "next/server";
import { getManagementAccessFromRequest } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

type OrderStatus =
  | "created"
  | "paid"
  | "Processing"
  | "Shipped"
  | "Delivered"
  | "Cancelled"
  | "Refunded"
  | "Replacement";

function canMerchantManageOrder(
  merchantProductIds: Set<string>,
  merchantProductNames: Set<string>,
  orderProducts: unknown
) {
  const items = Array.isArray(orderProducts)
    ? (orderProducts as Array<{ productId?: string; name?: string }>)
    : [];
  return items.some((p) => {
    if (typeof p?.productId === "string" && merchantProductIds.has(p.productId)) {
      return true;
    }
    return typeof p?.name === "string" && merchantProductNames.has(p.name);
  });
}

function isAllowedStatus(value: string): value is OrderStatus {
  return [
    "created",
    "paid",
    "Processing",
    "Shipped",
    "Delivered",
    "Cancelled",
    "Refunded",
    "Replacement",
  ].includes(value);
}

function normalizeOrderIdentifiers<T extends { id: string; orderId: string; receipt: string | null }>(
  order: T
) {
  return {
    ...order,
    // Preserve existing consumers while exposing explicit ids.
    id: order.orderId,
    internalOrderId: order.id,
    providerOrderId: order.orderId,
    appOrderId: order.receipt,
  };
}

export async function GET(req: NextRequest) {
  try {
    const access = await getManagementAccessFromRequest(req);

    if (access.role === "admin") {
      const orders = await prisma.order.findMany({
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(orders.map(normalizeOrderIdentifiers), { status: 200 });
    }

    const merchantProducts = await prisma.product.findMany({
      where: { merchantEmail: access.email },
      select: { id: true, name: true },
    });

    const productIds = new Set(merchantProducts.map((p) => p.id));
    const productNames = new Set(
      merchantProducts
      .map((p) => p.name)
      .filter((n): n is string => typeof n === "string" && n.length > 0)
    );

    if (!productIds.size && !productNames.size) {
      return NextResponse.json([], { status: 200 });
    }

    const orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    const filtered = orders.filter((order) =>
      canMerchantManageOrder(productIds, productNames, order.products)
    );

    return NextResponse.json(filtered.map(normalizeOrderIdentifiers), { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch orders";
    if (message.startsWith("Unauthorized") || message.startsWith("Forbidden")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const access = await getManagementAccessFromRequest(req);
    const body = await req.json();
    const {
      orderId,
      status,
      trackingNumber,
      shippingProvider,
      trackingUrl,
      estimatedDelivery,
      shippingDetails,
      note,
    } = body || {};
    const parsedEstimatedDelivery =
      estimatedDelivery !== undefined && estimatedDelivery !== null && String(estimatedDelivery).trim()
        ? new Date(String(estimatedDelivery))
        : null;
    if (
      estimatedDelivery !== undefined &&
      estimatedDelivery !== null &&
      String(estimatedDelivery).trim() &&
      Number.isNaN(parsedEstimatedDelivery?.getTime())
    ) {
      return NextResponse.json(
        { error: "estimatedDelivery must be a valid date string" },
        { status: 400 }
      );
    }

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId is required" },
        { status: 400 }
      );
    }
    if (status && !isAllowedStatus(status)) {
      return NextResponse.json(
        { error: "status is invalid" },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({ where: { orderId } });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (access.role === "merchant") {
      const merchantProducts = await prisma.product.findMany({
        where: { merchantEmail: access.email },
        select: { id: true, name: true },
      });

      const ownedIds = new Set(merchantProducts.map((p) => p.id));
      const ownedNames = new Set(
        merchantProducts
          .map((p) => p.name)
          .filter((n): n is string => typeof n === "string" && n.length > 0)
      );
      const canManage = canMerchantManageOrder(
        ownedIds,
        ownedNames,
        order.products
      );

      if (!canManage) {
        return NextResponse.json(
          { error: "Forbidden: You cannot manage this order" },
          { status: 403 }
        );
      }
    }

    const history = Array.isArray(order.statusHistory)
      ? (order.statusHistory as Array<Record<string, unknown>>)
      : [];
    const nextStatus = status || order.status;
    const nextHistory =
      status && status !== order.status
        ? [
            ...history,
            {
              status,
              by: access.email,
              note: note || null,
              at: new Date().toISOString(),
            },
          ]
        : history;

    await prisma.order.update({
      where: { orderId },
      data: {
        status: nextStatus,
        ...(trackingNumber !== undefined && {
          trackingNumber: trackingNumber ? String(trackingNumber) : null,
        }),
        ...(shippingProvider !== undefined && {
          shippingProvider: shippingProvider ? String(shippingProvider) : null,
        }),
        ...(trackingUrl !== undefined && {
          trackingUrl: trackingUrl ? String(trackingUrl) : null,
        }),
        ...(estimatedDelivery !== undefined && {
          estimatedDelivery: parsedEstimatedDelivery,
        }),
        ...(shippingDetails !== undefined && { shippingDetails }),
        ...(status === "Shipped" && { shippedAt: new Date() }),
        ...(status === "Delivered" && { deliveredAt: new Date() }),
        ...(status && { statusHistory: nextHistory }),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update order";
    if (message.startsWith("Unauthorized") || message.startsWith("Forbidden")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
