import { NextRequest, NextResponse } from "next/server";
import { authGuard } from "@/app/lib/auth-guard";
import { prisma } from "@/app/lib/prisma";
import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";

type RequestType = "refund" | "replacement" | "cancellation";
const REFUND_REPLACEMENT_ELIGIBLE_ORDER_STATUSES = new Set([
  "paid",
  "Processing",
  "Shipped",
  "Delivered",
]);
const CANCELLATION_ELIGIBLE_ORDER_STATUSES = new Set([
  "created",
  "paid",
  "Processing",
]);
const TERMINAL_REQUEST_STATUSES = new Set(["completed", "rejected"]);

function isValidType(value: string): value is RequestType {
  return value === "refund" || value === "replacement" || value === "cancellation";
}

export async function GET(req: NextRequest) {
  try {
    const { sessionEmail, errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;

    const requests = await prisma.orderServiceRequest.findMany({
      where: { requestedByEmail: sessionEmail },
      include: {
        order: {
          select: {
            id: true,
            orderId: true,
            status: true,
            products: true,
            customer: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const normalized = requests.map((request) => ({
      ...request,
      orderId: request.order?.id || request.orderId,
      providerOrderId: request.order?.orderId || request.orderId,
    }));

    return NextResponse.json(normalized, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch service requests";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { sessionEmail, body, errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;

    const { orderId, type, reason, details } = body || {};
    if (!orderId || !type || !reason) {
      return NextResponse.json(
        { error: "orderId, type, and reason are required" },
        { status: 400 }
      );
    }
    if (!isValidType(String(type))) {
      return NextResponse.json(
        { error: "type must be refund, replacement, or cancellation" },
        { status: 400 }
      );
    }

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id: String(orderId) }, { orderId: String(orderId) }, { receipt: String(orderId) }],
      },
      orderBy: { createdAt: "desc" },
      select: {
        orderId: true,
        id: true,
        status: true,
        amount: true,
        currency: true,
        receipt: true,
        merchantId: true,
        customer: true,
        products: true,
        createdAt: true,
      },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const orderCustomerEmail = String(
      (order.customer as Record<string, unknown>)?.email || ""
    );
    if (orderCustomerEmail !== sessionEmail) {
      return NextResponse.json(
        { error: "Forbidden: You can request only for your own order" },
        { status: 403 }
      );
    }
    const normalizedType = String(type) as RequestType;
    const isEligible =
      normalizedType === "cancellation"
        ? CANCELLATION_ELIGIBLE_ORDER_STATUSES.has(String(order.status || ""))
        : REFUND_REPLACEMENT_ELIGIBLE_ORDER_STATUSES.has(String(order.status || ""));
    if (!isEligible) {
      return NextResponse.json(
        {
          error: `This order is not eligible for ${normalizedType} at its current status.`,
        },
        { status: 409 }
      );
    }

    const existingOpen = await prisma.orderServiceRequest.findFirst({
      where: {
        orderId: order.orderId,
        type: normalizedType,
        status: { notIn: Array.from(TERMINAL_REQUEST_STATUSES) },
      },
      select: { requestId: true },
    });
    if (existingOpen) {
      return NextResponse.json(
        {
          error:
            "A similar request is already open for this order. Please wait for review.",
        },
        { status: 409 }
      );
    }

    const orderProducts = Array.isArray(order.products)
      ? (order.products as Array<{ productId?: string; name?: string }>)
      : [];
    const ids = orderProducts
      .map((p) => p.productId)
      .filter((id): id is string => typeof id === "string" && id.length > 0);
    const names = orderProducts
      .map((p) => p.name)
      .filter((n): n is string => typeof n === "string" && n.length > 0);

    let merchantEmail: string | null = null;
    if (order.merchantId) {
      const merchant = await prisma.merchant.findUnique({
        where: { id: order.merchantId },
        select: { email: true },
      });
      merchantEmail = merchant?.email || null;
    } else {
      const productOwnersById = ids.length
        ? await prisma.product.findMany({
            where: { id: { in: ids } },
            select: { merchantEmail: true },
          })
        : [];
      const productOwnersByName =
        !productOwnersById.length && names.length
          ? await prisma.product.findMany({
              where: { name: { in: names } },
              select: { merchantEmail: true },
            })
          : [];
      const productOwners = productOwnersById.length
        ? productOwnersById
        : productOwnersByName;

      const uniqueMerchantEmails = Array.from(
        new Set(
          productOwners
            .map((p) => p.merchantEmail)
            .filter((e): e is string => typeof e === "string" && e.length > 0)
        )
      );
      merchantEmail =
        uniqueMerchantEmails.length === 1 ? uniqueMerchantEmails[0] : null;
    }

    const requestId = `SR-${randomUUID()}`;
    const requestNumber = buildRequestNumber();
    const timeline: Array<Record<string, unknown>> = [
      {
        action: "requested",
        by: sessionEmail,
        note: String(reason).trim(),
        at: new Date().toISOString(),
      },
    ];

    const created = await prisma.orderServiceRequest.create({
      data: {
        requestId,
        requestNumber,
        orderId: order.orderId,
        merchantId: order.merchantId || null,
        type: normalizedType,
        reason: String(reason).trim(),
        details: details ? String(details).trim() : null,
        requestedAmount: Number(order.amount || 0),
        requestedByEmail: sessionEmail,
        merchantEmail,
        timeline: timeline as Prisma.InputJsonValue,
        orderSnapshot: {
          id: order.id,
          orderId: order.orderId,
          receipt: order.receipt,
          status: order.status,
          amount: order.amount,
          currency: order.currency,
          merchantId: order.merchantId,
          createdAt: order.createdAt,
        } as Prisma.InputJsonValue,
        customerSnapshot: (order.customer || {}) as Prisma.InputJsonValue,
        requestedItems: orderProducts as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create service request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function buildRequestNumber() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 900000) + 100000;
  return `RR-${y}${m}${day}-${rand}`;
}
