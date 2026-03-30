import { NextRequest, NextResponse } from "next/server";
import { authGuard } from "@/app/lib/auth-guard";
import { prisma } from "@/app/lib/prisma";
import { randomUUID } from "crypto";

type RequestType = "refund" | "replacement";
const ELIGIBLE_ORDER_STATUSES = new Set([
  "paid",
  "Processing",
  "Shipped",
  "Delivered",
]);
const TERMINAL_REQUEST_STATUSES = new Set(["completed", "rejected"]);

function isValidType(value: string): value is RequestType {
  return value === "refund" || value === "replacement";
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

    return NextResponse.json(requests, { status: 200 });
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
        { error: "type must be either refund or replacement" },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { orderId: String(orderId) },
      select: { orderId: true, status: true, customer: true, products: true },
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
    if (!ELIGIBLE_ORDER_STATUSES.has(String(order.status || ""))) {
      return NextResponse.json(
        {
          error:
            "This order is not eligible for refund/replacement at its current status.",
        },
        { status: 409 }
      );
    }

    const existingOpen = await prisma.orderServiceRequest.findFirst({
      where: {
        orderId: String(orderId),
        type: String(type),
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

    const merchantEmail =
      uniqueMerchantEmails.length === 1 ? uniqueMerchantEmails[0] : null;

    const created = await prisma.orderServiceRequest.create({
      data: {
        requestId: `SR-${randomUUID()}`,
        orderId: String(orderId),
        type: String(type),
        reason: String(reason).trim(),
        details: details ? String(details).trim() : null,
        requestedByEmail: sessionEmail,
        merchantEmail,
        timeline: [
          {
            action: "requested",
            by: sessionEmail,
            note: String(reason).trim(),
            at: new Date().toISOString(),
          },
        ],
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
