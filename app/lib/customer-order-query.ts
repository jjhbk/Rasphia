import { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/prisma";

type OrderRow = {
  id: string;
  orderId: string;
  receipt: string | null;
};

export type CustomerOrderScope = "active" | "history" | "all";

export type CustomerOrderQueryInput = {
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerName?: string | null;
  merchantId?: string | null;
  orderRef?: string | null;
  scope?: CustomerOrderScope;
  statuses?: string[] | null;
  page?: number;
  pageSize?: number;
};

export function normalizeOrderIdentifiers<T extends OrderRow>(order: T) {
  return {
    ...order,
    id: order.id,
    internalOrderId: order.id,
    providerOrderId: order.orderId,
    appOrderId: order.receipt,
  };
}

function normalizePhone(input: string) {
  return input.replace(/[^\d+]/g, "");
}

function phoneVariants(input: string) {
  const raw = String(input || "").trim();
  const normalized = normalizePhone(raw);
  const digits = normalized.replace(/\D/g, "");
  return Array.from(
    new Set(
      [
        raw,
        normalized,
        digits,
        digits.length === 10 ? `+91${digits}` : "",
        digits.length === 10 ? `91${digits}` : "",
        digits.length > 10 && digits.startsWith("91") ? `+${digits}` : "",
      ].filter((value): value is string => Boolean(value))
    )
  );
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => String(value || "").trim())
        .filter((value) => value.length > 0)
    )
  );
}

function getStatuses(scope: CustomerOrderScope, explicit?: string[] | null) {
  if (explicit?.length) return explicit;
  if (scope === "active") return ["paid", "Processing", "Shipped"];
  if (scope === "history") return ["paid", "Processing", "Shipped", "Delivered"];
  return null;
}

function buildCustomerMatchers(input: CustomerOrderQueryInput): Prisma.OrderWhereInput[] {
  const email = String(input.customerEmail || "").trim().toLowerCase();
  if (email) {
    return [
      {
        customer: {
          path: ["email"],
          equals: email,
        },
      },
    ];
  }

  const matchers: Prisma.OrderWhereInput[] = [];

  for (const phone of phoneVariants(String(input.customerPhone || ""))) {
    matchers.push({
      customer: {
        path: ["phone"],
        equals: phone,
      },
    });
  }

  const customerName = String(input.customerName || "").trim();
  if (customerName) {
    matchers.push({
      customer: {
        path: ["name"],
        equals: customerName,
      },
    });
  }

  return matchers;
}

function buildOrderRefMatcher(orderRef: string): Prisma.OrderWhereInput {
  return {
    OR: [
      { id: { contains: orderRef, mode: "insensitive" } },
      { orderId: { contains: orderRef, mode: "insensitive" } },
      { receipt: { contains: orderRef, mode: "insensitive" } },
    ],
  };
}

export async function queryCustomerOrders(input: CustomerOrderQueryInput) {
  const page = Math.max(1, Number(input.page || 1));
  const pageSize = Math.min(50, Math.max(1, Number(input.pageSize || 5)));
  const scope = input.scope || "history";
  const customerMatchers = buildCustomerMatchers(input);

  if (!customerMatchers.length) {
    return {
      items: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
      hasNextPage: false,
    };
  }

  const statuses = getStatuses(scope, input.statuses);
  const filters: Prisma.OrderWhereInput[] = [{ OR: customerMatchers }];

  if (statuses?.length) {
    filters.push({ status: { in: uniqueStrings(statuses) } });
  }

  const merchantId = String(input.merchantId || "").trim();
  if (merchantId) {
    filters.push({ merchantId });
  }

  const orderRef = String(input.orderRef || "").trim();
  if (orderRef) {
    filters.push(buildOrderRefMatcher(orderRef));
  }

  const where: Prisma.OrderWhereInput = { AND: filters };
  const [total, items] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    items: items.map(normalizeOrderIdentifiers),
    total,
    page,
    pageSize,
    totalPages: total ? Math.ceil(total / pageSize) : 0,
    hasNextPage: page * pageSize < total,
  };
}
