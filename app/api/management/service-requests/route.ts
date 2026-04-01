import { NextRequest, NextResponse } from "next/server";
import { getManagementAccessFromRequest } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import type { Prisma } from "@prisma/client";

type ServiceRequestStatus =
  | "requested"
  | "approved"
  | "rejected"
  | "in_progress"
  | "completed";

const ALLOWED_REQUEST_STATUSES: ServiceRequestStatus[] = [
  "requested",
  "approved",
  "rejected",
  "in_progress",
  "completed",
];

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

export async function GET(req: NextRequest) {
  try {
    const access = await getManagementAccessFromRequest(req);

    if (access.role === "admin") {
      const requests = await prisma.orderServiceRequest.findMany({
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
    }

    const merchant = await prisma.merchant.findFirst({
      where: { email: access.email },
      select: { id: true },
    });
    const merchantId = merchant?.id || null;

    const directRequests = await prisma.orderServiceRequest.findMany({
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
      where: merchantId
        ? {
            OR: [{ merchantId }, { merchantEmail: access.email }],
          }
        : { merchantEmail: access.email },
    });

    const legacyNeedsFallback = directRequests.filter((r) => !r.merchantId);
    if (!legacyNeedsFallback.length) {
      return NextResponse.json(directRequests, { status: 200 });
    }

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

    const filtered = directRequests.filter((req) =>
      req.merchantId
        ? req.merchantId === merchantId
        : canMerchantManageOrder(ownedIds, ownedNames, req.order?.products)
    );

    return NextResponse.json(filtered, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch management service requests";
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
    const { requestId, status, adminNote, resolutionNote } = body || {};
    const parsedStatus = String(status || "");

    if (
      !requestId ||
      !ALLOWED_REQUEST_STATUSES.includes(parsedStatus as ServiceRequestStatus)
    ) {
      return NextResponse.json(
        { error: "requestId and valid status are required" },
        { status: 400 }
      );
    }

    const target = await prisma.orderServiceRequest.findUnique({
      where: { requestId: String(requestId) },
      include: {
        order: {
          select: { orderId: true, products: true, statusHistory: true },
        },
      },
    });
    if (!target) {
      return NextResponse.json(
        { error: "Service request not found" },
        { status: 404 }
      );
    }

    if (access.role === "merchant") {
      const merchant = await prisma.merchant.findFirst({
        where: { email: access.email },
        select: { id: true },
      });
      const merchantId = merchant?.id || null;
      if (target.merchantId && merchantId && target.merchantId !== merchantId) {
        return NextResponse.json(
          { error: "Forbidden: You cannot manage this service request" },
          { status: 403 }
        );
      }
      if (!target.merchantId) {
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
        if (!canMerchantManageOrder(ownedIds, ownedNames, target.order?.products)) {
          return NextResponse.json(
            { error: "Forbidden: You cannot manage this service request" },
            { status: 403 }
          );
        }
      }
    }

    const existingTimeline = Array.isArray(target.timeline)
      ? (target.timeline as Array<Record<string, unknown>>)
      : [];
    const nextTimeline = [
      ...existingTimeline,
      {
        action: parsedStatus,
        by: access.email,
        note: resolutionNote || adminNote || "",
        at: new Date().toISOString(),
      },
    ];

    const updated = await prisma.orderServiceRequest.update({
      where: { requestId: String(requestId) },
      data: {
        status: parsedStatus,
        reviewedByEmail: access.email,
        adminNote: adminNote ? String(adminNote) : null,
        resolutionNote: resolutionNote ? String(resolutionNote) : null,
        timeline: nextTimeline as Prisma.InputJsonValue,
        resolvedAt:
          parsedStatus === "completed" || parsedStatus === "rejected"
            ? new Date()
            : null,
      },
    });

    if (parsedStatus === "completed") {
      const mappedOrderStatus =
        target.type === "refund"
          ? "Refunded"
          : target.type === "cancellation"
          ? "Cancelled"
          : "Replacement";
      const orderHistory = Array.isArray(target.order?.statusHistory)
        ? (target.order?.statusHistory as Array<Record<string, unknown>>)
        : [];
      const nextOrderHistory = [
        ...orderHistory,
        {
          status: mappedOrderStatus,
          note: `${target.type} request completed`,
          by: access.email,
          at: new Date().toISOString(),
        },
      ];
      await prisma.order.update({
        where: { orderId: target.orderId },
        data: {
          status: mappedOrderStatus,
          statusHistory: nextOrderHistory as Prisma.InputJsonValue,
          updatedAt: new Date(),
        },
      });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to update service request";
    if (message.startsWith("Unauthorized") || message.startsWith("Forbidden")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
